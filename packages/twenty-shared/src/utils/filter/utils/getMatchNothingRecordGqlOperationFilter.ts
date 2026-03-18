import { type RecordGqlOperationFilter } from '@/types';

// Returns a filter guaranteed to match zero records.
// Used when a filter value resolves to empty (e.g., workflow variable
// referencing a previous step that returned no results), so the filter
// condition is preserved rather than silently dropped from the query.
export const getMatchNothingRecordGqlOperationFilter =
  (): RecordGqlOperationFilter => ({
    and: [{ id: { is: 'NULL' } }, { id: { is: 'NOT_NULL' } }],
  });
