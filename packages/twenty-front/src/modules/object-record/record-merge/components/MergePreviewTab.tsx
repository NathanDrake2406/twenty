import { usePerformMergePreview } from '@/object-record/record-merge/hooks/usePerformMergePreview';
import { SummaryCard } from '@/object-record/record-show/components/SummaryCard';
import { LayoutRenderingProvider } from '@/ui/layout/contexts/LayoutRenderingContext';
import { isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/layout';
import { PageLayoutType } from '~/generated-metadata/graphql';

type MergePreviewTabProps = {
  objectNameSingular: string;
};

export const MergePreviewTab = ({
  objectNameSingular,
}: MergePreviewTabProps) => {
  const { mergePreviewRecord, isGeneratingPreview } = usePerformMergePreview({
    objectNameSingular,
  });

  if (!isDefined(mergePreviewRecord) || isGeneratingPreview) {
    return null;
  }

  const recordId = mergePreviewRecord.id;

  return (
    <LayoutRenderingProvider
      value={{
        targetRecordIdentifier: {
          id: recordId,
          targetObjectNameSingular: objectNameSingular,
        },
        layoutType: PageLayoutType.RECORD_PAGE,
        isInSidePanel: true,
      }}
    >
      <Section>
        <SummaryCard
          objectNameSingular={objectNameSingular}
          objectRecordId={recordId}
          isInSidePanel={true}
        />
      </Section>
    </LayoutRenderingProvider>
  );
};
