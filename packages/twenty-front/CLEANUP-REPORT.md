# Twenty Frontend — Dead Code & Duplication Report

## 1. Unused Code (safe to delete)

### 1.1 Unused Hooks

| Hook | File | Notes |
|------|------|-------|
| `useWorkflowRunUnsafe` | `modules/workflow/hooks/useWorkflowRunUnsafe.ts` | Never imported. Duplicate of `useWorkflowRun` without schema validation. |
| `useGetViewById` | `modules/views/hooks/useGetViewById.ts` | Never imported. `useViewById` is used instead. |
| `useCreateViewFieldGroup` | `modules/views/hooks/useCreateViewFieldGroup.ts` | Never imported. CRUD done via `usePerformViewFieldGroupAPIPersist`. |
| `useDeleteViewFieldGroup` | `modules/views/hooks/useDeleteViewFieldGroup.ts` | Same as above. |
| `useUpdateViewFieldGroup` | `modules/views/hooks/useUpdateViewFieldGroup.ts` | Same as above. |
| `useCreateManyViewFieldGroups` | `modules/views/hooks/useCreateManyViewFieldGroups.ts` | Same as above. |
| `useMoveViewColumns` | `modules/views/hooks/useMoveViewColumns.ts` | Only imported by its own test file — no production usage. |

### 1.2 Unused Components

| Component | File | Notes |
|-----------|------|-------|
| `SettingsSummaryCard` | `modules/settings/components/SettingsSummaryCard.tsx` | Never imported anywhere. |

### 1.3 Unused Utilities

| Export | File | Notes |
|--------|------|-------|
| `createEventContext` + `EventContext` | `utils/createEventContext.ts` | Entire file is unused — zero imports. |

### 1.4 Filename Typo

| File | Issue |
|------|-------|
| `modules/views/hooks/useOpenCreateViewDropown.ts` | "Dropown" should be "Dropdown". The exported hook is correctly named `useOpenCreateViewDropdown`. |

---

## 2. Duplicated Logic

### 2.1 Search/filter reimplementations — **Low effort, High impact**

A central `filterBySearchQuery` utility exists in `utils/filterBySearchQuery.ts` with proper diacritic normalization, but several places reimplement search inline with plain `.toLowerCase().includes()`:

| File | Inline pattern |
|------|----------------|
| `modules/workflow/workflow-trigger/components/WorkflowEditTriggerDatabaseEventForm.tsx` | `option.label.toLowerCase().includes(searchValue.toLowerCase())` |
| `modules/workflow/workflow-variables/hooks/useVariableDropdown.ts` | `value.label?.toLowerCase().includes(searchInputValue.toLowerCase())` |
| `modules/settings/roles/.../SettingsRolePermissionsObjectLevelRecordLevelPermissionMeValueSelect.tsx` | `item.label.toLowerCase().includes(searchInput.toLowerCase())` |
| `pages/settings/ai/components/SettingsAIModelsTab.tsx` | Multi-field inline search |

**Fix:** Replace with `filterBySearchQuery` to get consistent diacritic-aware search for free.

### 2.2 `SelectInput` vs `SubMatchingSelectInput` — **Medium effort, High impact**

Both components in `modules/ui/input/components/SelectInput.tsx` and `modules/spreadsheet-import/.../SubMatchingSelectInput.tsx` have nearly identical logic:
- Same `optionsToSelect` memo with `normalizeSearchText`
- Same `optionsInDropDown` ordering (selected first)
- Same `handleOptionChange` pattern

**Fix:** Extract a shared `useSelectWithSearch(options, selectedOption)` hook.

### 2.3 `objectMetadataItemsState` + `.find()` — **Medium effort, High impact**

45+ files read `objectMetadataItemsState` and then do `.find(item => item.nameSingular === ...)` or similar lookups. Selectors like `objectMetadataItemFamilySelector` and `objectMetadataItemsByNameSingularMapSelector` already exist but are underused.

**Fix:** Introduce a `useObjectMetadataItemByName(name, 'singular' | 'plural')` hook and migrate call sites.

### 2.4 Object metadata sorting — **Low effort, Medium impact**

`a.labelSingular.localeCompare(b.labelSingular)` appears in 5+ places across hooks and utils. Same for `labelPlural`.

**Fix:** Add a shared `sortObjectMetadataByLabel(key)` comparator.

### 2.5 `objectMetadataItemsByNamePluralMapSelector` / `...SingularMapSelector` — **Low effort, Medium impact**

These two selectors are identical except for the map key (`namePlural` vs `nameSingular`).

**Fix:** Create a factory `createObjectMetadataItemsMapSelector(key)` and derive both from it.

### 2.6 Chart dropdown components — **Medium effort, Medium impact**

7 chart dropdown components share the same structure: `DropdownMenuSearchInput` + `filterBySearchQuery` + `DropdownMenuItemsContainer` + item rendering.

Files: `ChartGroupByFieldSelectionDropdownContentBase`, `ChartDataSourceDropdownContent`, `ChartRatioOptionValueSelectionDropdownContent`, `ChartAggregateOperationSelectionDropdownContent`, `ChartColorSelectionDropdownContent`, `ChartFieldSelectionForAggregateOperationDropdownContent`, `ChartGroupByFieldSelectionRelationFieldView`.

**Fix:** Extract a `ChartSettingsDropdown` wrapper that handles search + layout and accepts items via render prop.

### 2.7 Settings table row components — **Low effort, Medium impact**

6 settings table row components duplicate nearly identical styled components (`StyledNameContainer`, `StyledNameLabel`, `StyledInactiveLabel`):

- `SettingsObjectItemTableRow`
- `SettingsObjectFieldItemTableRow`
- `SettingsObjectRelationItemTableRow`
- `SettingsRolePermissionsObjectLevelObjectFieldPermissionTableRow`
- `SettingsRolePermissionsObjectLevelTableRow`
- `SettingsRoleAssignmentTableRow`

**Fix:** Extract shared styled components into `modules/settings/components/SettingsTableRowPrimitives.tsx`.

### 2.8 Date formatting scattered across 5+ files — **High effort, Medium impact**

Date utilities are spread across:
- `utils/date-utils.ts`
- `utils/format/formatDate.ts`
- `utils/string/formatDateString.ts`
- `utils/string/formatDateTimeString.ts`
- `utils/dates/formatZonedDateTimeDatePart.ts` / `formatZonedDateTimeTimePart.ts`

**Fix:** Consolidate under `utils/dates/` with clear responsibilities (parse, format, relative display).

---

## 3. Repeated Inline Patterns

### 3.1 Text truncation CSS — ~50 occurrences

```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

`EllipsisDisplay` exists in `modules/ui/field/display/components/EllipsisDisplay.tsx` but is rarely used.

**Fix:** Add a `truncateTextMixin` in shared styles. Use it in styled components instead of repeating these 3 lines.

### 3.2 Flex centering CSS — ~100+ occurrences

```css
display: flex;
align-items: center;
/* optional: justify-content: center */
```

**Fix:** Add `flexRowCenter` / `flexCenter` CSS mixins.

### 3.3 `e.stopPropagation()` wrapper — ~40 occurrences

`onClick={(e) => { e.stopPropagation(); ... }}` appears throughout.

A `StopPropagationContainer` exists in `modules/object-record/record-board/record-board-card/components/` but is barely reused.

**Fix:** Move `StopPropagationContainer` to a shared location and use it more broadly. Or add a `withStopPropagation(handler)` utility.

---

## 4. Priority Matrix

| # | Item | Effort | Impact | Type |
|---|------|--------|--------|------|
| 1 | Delete 7 unused hooks | **Very Low** | Medium | Dead code |
| 2 | Delete `SettingsSummaryCard` | **Very Low** | Low | Dead code |
| 3 | Delete `createEventContext.ts` | **Very Low** | Low | Dead code |
| 4 | Fix `useOpenCreateViewDropown` filename typo | **Very Low** | Low | Hygiene |
| 5 | Replace inline search filters with `filterBySearchQuery` | **Low** | High | Dedup |
| 6 | Add `truncateTextMixin` for ellipsis CSS | **Low** | High | Dedup |
| 7 | Extract shared settings table row styled components | **Low** | Medium | Dedup |
| 8 | Create `objectMetadataItemsMapSelector` factory | **Low** | Medium | Dedup |
| 9 | Add shared `sortObjectMetadataByLabel` comparator | **Low** | Medium | Dedup |
| 10 | Extract `useSelectWithSearch` from SelectInput/SubMatchingSelectInput | **Medium** | High | Dedup |
| 11 | Introduce `useObjectMetadataItemByName` hook | **Medium** | High | Dedup |
| 12 | Extract shared chart dropdown wrapper | **Medium** | Medium | Dedup |
| 13 | Consolidate date formatting utilities | **High** | Medium | Dedup |

Items 1–4 are pure low-hanging fruit — just deletions and a rename, no risk of regressions.

Items 5–9 are small refactors that pay off quickly across many files.

Items 10–13 are larger but high-value unifications.
