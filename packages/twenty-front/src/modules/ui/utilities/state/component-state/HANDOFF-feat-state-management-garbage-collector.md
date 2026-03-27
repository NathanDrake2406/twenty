# Handoff: State Management Garbage Collector

Branch: `feat/state-management-garbage-collector`

## Problem

Component state atoms (Jotai) created by `createAtomComponentState` and
`createAtomComponentFamilyState` are never evicted. Each unique `instanceId`
allocates an atom in a module-level `Map` that lives for the process lifetime.
Long-lived apps (record table with many rows, repeated navigation) accumulate
stale atoms, causing unbounded memory growth.

## What This PR Adds (Task 01 — Foundation)

All files are under
`packages/twenty-front/src/modules/ui/utilities/state/`.

### New types

| File | Purpose |
|------|---------|
| `component-state/types/ComponentStateLifecyclePhase.ts` | Union type `'mounted' \| 'active' \| 'dormant' \| 'evicted'` — used by the future GC scheduler |

### New utilities

| File | Purpose |
|------|---------|
| `component-state/utils/componentStateSubscriberRegistry.ts` | Tracks how many hook instances are currently subscribed to a given `stateKey × instanceId` pair. Exposes `incrementComponentStateSubscriberCount`, `decrementComponentStateSubscriberCount`, `getComponentStateSubscriberCount`, `getTotalSubscriberCountForInstance`, `clearSubscriberCountsForInstance`. |
| `component-state/utils/componentStateContextScopeRegistry.ts` | Maps `instanceId → Set<cleanupFn>`. Every atom factory registers its own cache-eviction callback here at creation time. `destroyComponentStateContextScope(instanceId)` calls every registered cleanup and removes the entry. |

### Modified types

Both `ComponentState<V>` and `ComponentFamilyState<V, K>` have a new field:

```ts
cleanup: (instanceId: string) => void;
```

This is implemented by the factory and removes the atom(s) from the in-memory
cache so subsequent `atomFamily()` calls create a fresh atom with the default
value.

### Modified factories

`createAtomComponentState` and `createAtomComponentFamilyState` now:

1. On each new `atomFamily()` call, register a cleanup callback with
   `registerAtomCleanupForInstance(instanceId, () => atomCache.delete(cacheKey))`.
2. Expose a `cleanup(instanceId)` method that directly removes matching cache
   entries (used when `destroyComponentStateContextScope` fires all callbacks).

### Modified hooks (8 total)

Every `useAtomComponent*` and `useSetAtomComponent*` hook now runs a
`useEffect` that:

- **on mount** — calls `incrementComponentStateSubscriberCount(key, instanceId)`
- **on unmount** — calls `decrementComponentStateSubscriberCount(key, instanceId)`

Affected hooks:
- `useAtomComponentState`
- `useAtomComponentStateValue`
- `useSetAtomComponentState`
- `useAtomComponentStateCallbackState`
- `useAtomComponentFamilyState`
- `useAtomComponentFamilyStateValue`
- `useSetAtomComponentFamilyState`
- `useAtomComponentFamilyStateCallbackState`

### Tests (42 passing)

| File | Coverage |
|------|---------|
| `component-state/utils/__tests__/componentStateSubscriberRegistry.test.ts` | 18 unit tests — increment, decrement, total, cross-instance isolation, clear |
| `component-state/utils/__tests__/componentStateContextScopeRegistry.test.ts` | 12 unit tests — register, destroy, count, factory integration |
| `jotai/hooks/__tests__/useAtomComponentStateSubscriberCounting.test.tsx` | 12 integration tests — each hook mounted in a real React tree with JotaiProvider; verifies count goes 0→1 on mount and 1→0 on unmount; verifies atom cache eviction after `destroyComponentStateContextScope` |

## What's NOT in This PR

This PR is deliberately scoped to the **plumbing only**. Nothing calls
`destroyComponentStateContextScope` in production code yet. The next tasks
will build on top:

- **Task 02** — `useComponentStateContextLifecycle` hook: mounts inside a
  `ComponentInstanceContext.Provider`, watches `getTotalSubscriberCountForInstance`,
  and calls `destroyComponentStateContextScope` when the count drops to 0
  (with a configurable debounce to avoid thrashing on re-renders).

- **Task 03** — Wire the lifecycle hook into the highest-level scope
  components (e.g. `RecordTableScope`, `DropdownScope`) so they automatically
  trigger cleanup when all children unmount.

- **Task 04** — Jotai store integration: after `destroyComponentStateContextScope`,
  reset the atoms in the live store to free the Jotai-internal subscription
  graph, not just the factory cache.

## Invariants to Preserve

- `componentStateSubscriberRegistry` is module-level state — tests must call
  `clearSubscriberCountsForInstance` in `afterEach` to avoid cross-test leaks.
- `componentStateContextScopeRegistry` is also module-level — tests must call
  `destroyComponentStateContextScope` in `afterEach`.
- The `cleanup` method on a state object only evicts the factory cache; it does
  NOT reset the Jotai atom value in any live store. That is Task 04's job.
- `destroyComponentStateContextScope` is idempotent (calling it twice is safe).

## Key Data Flow

```
[Hook mounts]
  useEffect fires
    → incrementComponentStateSubscriberCount(key, instanceId)

[atomFamily() called for first time]
  → creates Jotai atom
  → registerAtomCleanupForInstance(instanceId, () => atomCache.delete(key))

[Hook unmounts]
  useEffect cleanup fires
    → decrementComponentStateSubscriberCount(key, instanceId)
    → if count === 0: (Task 02 will observe this and call…)
        → destroyComponentStateContextScope(instanceId)
            → calls all registered cleanup fns
            → atomCache.delete(cacheKey) for every atom in that scope
```
