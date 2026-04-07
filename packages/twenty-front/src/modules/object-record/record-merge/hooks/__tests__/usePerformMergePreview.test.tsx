import { act, renderHook, waitFor } from '@testing-library/react';

import { getJestMetadataAndApolloMocksWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksWrapper';

const mockMergeManyRecords = jest.fn();

jest.mock('@/object-record/hooks/useMergeManyRecords', () => ({
  useMergeManyRecords: () => ({
    mergeManyRecords: mockMergeManyRecords,
    loading: false,
  }),
}));

jest.mock(
  '@/object-record/record-merge/hooks/useMergeRecordsSelectedRecords',
  () => ({
    useMergeRecordsSelectedRecords: () => ({
      selectedRecords: [
        { id: 'rec-1', name: 'Record A' },
        { id: 'rec-2', name: 'Record B' },
      ],
    }),
  }),
);

jest.mock('@/object-record/record-store/hooks/useUpsertRecordsInStore', () => ({
  useUpsertRecordsInStore: () => ({
    upsertRecordsInStore: jest.fn(),
  }),
}));

jest.mock('@/object-record/cache/utils/getRecordFromRecordNode', () => ({
  getRecordFromRecordNode: (args: { recordNode: any }) => args.recordNode,
}));

import { usePerformMergePreview } from '@/object-record/record-merge/hooks/usePerformMergePreview';

const Wrapper = getJestMetadataAndApolloMocksWrapper({
  apolloMocks: [],
});

describe('usePerformMergePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose previewError when mergeManyRecords rejects', async () => {
    mockMergeManyRecords.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(
      () => usePerformMergePreview({ objectNameSingular: 'company' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isGeneratingPreview).toBe(false);
    });

    expect(result.current.previewError).toBe('Server error');
    expect(result.current.mergePreviewRecord).toBeNull();
  });

  it('should not have previewError when mergeManyRecords succeeds', async () => {
    mockMergeManyRecords.mockResolvedValue({
      id: 'preview-id',
      name: 'Merged Record',
    });

    const { result } = renderHook(
      () => usePerformMergePreview({ objectNameSingular: 'company' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isGeneratingPreview).toBe(false);
    });

    expect(result.current.previewError).toBeNull();
    expect(result.current.mergePreviewRecord).toBeDefined();
  });
});
