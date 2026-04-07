import { usePerformMergePreview } from '@/object-record/record-merge/hooks/usePerformMergePreview';
import { PageLayoutSingleTabRenderer } from '@/page-layout/components/PageLayoutSingleTabRenderer';
import { usePageLayoutIdForRecord } from '@/page-layout/hooks/usePageLayoutIdForRecord';
import { LayoutRenderingProvider } from '@/ui/layout/contexts/LayoutRenderingContext';
import { Trans } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderErrorContainer,
  AnimatedPlaceholderErrorSubTitle,
  AnimatedPlaceholderErrorTextContainer,
  AnimatedPlaceholderErrorTitle,
} from 'twenty-ui/layout';
import { PageLayoutType } from '~/generated-metadata/graphql';

type MergePreviewTabProps = {
  objectNameSingular: string;
};

export const MergePreviewTab = ({
  objectNameSingular,
}: MergePreviewTabProps) => {
  const { mergePreviewRecord, isGeneratingPreview, previewError } =
    usePerformMergePreview({
      objectNameSingular,
    });

  const { pageLayoutId } = usePageLayoutIdForRecord({
    id: mergePreviewRecord?.id ?? '',
    targetObjectNameSingular: objectNameSingular,
  });

  if (isDefined(previewError)) {
    return (
      <AnimatedPlaceholderErrorContainer>
        <AnimatedPlaceholder type="noRecord" />
        <AnimatedPlaceholderErrorTextContainer>
          <AnimatedPlaceholderErrorTitle>
            <Trans>Preview unavailable</Trans>
          </AnimatedPlaceholderErrorTitle>
          <AnimatedPlaceholderErrorSubTitle>
            <Trans>
              Unable to generate a merge preview. Try again or merge directly.
            </Trans>
          </AnimatedPlaceholderErrorSubTitle>
        </AnimatedPlaceholderErrorTextContainer>
      </AnimatedPlaceholderErrorContainer>
    );
  }

  if (
    !isDefined(mergePreviewRecord) ||
    isGeneratingPreview ||
    !isDefined(pageLayoutId)
  ) {
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
      <PageLayoutSingleTabRenderer pageLayoutId={pageLayoutId} />
    </LayoutRenderingProvider>
  );
};
