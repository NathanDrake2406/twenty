import { useCallback } from 'react';

import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { pageLayoutEditingWidgetIdComponentState } from '@/page-layout/states/pageLayoutEditingWidgetIdComponentState';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useIsDashboardPageLayout } from '@/side-panel/pages/page-layout/hooks/useIsDashboardPageLayout';
import { useNavigatePageLayoutSidePanel } from '@/side-panel/pages/page-layout/hooks/useNavigatePageLayoutSidePanel';
import { sidePanelPageState } from '@/side-panel/states/sidePanelPageState';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { t } from '@lingui/core/macro';
import { SidePanelPages } from 'twenty-shared/types';
import { WidgetType } from '~/generated-metadata/graphql';

export const useOpenWidgetSettingsInSidePanel = (
  pageLayoutIdFromProps?: string,
) => {
  const pageLayoutId = useAvailableComponentInstanceIdOrThrow(
    PageLayoutComponentInstanceContext,
    pageLayoutIdFromProps,
  );

  const isDashboardPageLayout = useIsDashboardPageLayout();

  const setPageLayoutEditingWidgetId = useSetAtomComponentState(
    pageLayoutEditingWidgetIdComponentState,
    pageLayoutId,
  );

  const { navigatePageLayoutSidePanel } = useNavigatePageLayoutSidePanel();
  const { closeSidePanelMenu } = useSidePanelMenu();
  const setSidePanelPage = useSetAtomState(sidePanelPageState);

  const openWidgetSettingsInSidePanel = useCallback(
    ({
      widgetId,
      widgetType,
    }: {
      widgetId: string;
      widgetType: WidgetType;
    }) => {
      if (widgetType === WidgetType.IFRAME) {
        navigatePageLayoutSidePanel({
          sidePanelPage: isDashboardPageLayout
            ? SidePanelPages.DashboardIframeSettings
            : SidePanelPages.RecordPageIframeSettings,
          pageTitle: t`Edit iFrame`,
          resetNavigationStack: true,
        });
        setPageLayoutEditingWidgetId(widgetId);
        return;
      }

      if (widgetType === WidgetType.GRAPH) {
        navigatePageLayoutSidePanel({
          sidePanelPage: isDashboardPageLayout
            ? SidePanelPages.DashboardChartSettings
            : SidePanelPages.RecordPageChartSettings,
          pageTitle: t`Edit Graph`,
          resetNavigationStack: true,
        });
        setPageLayoutEditingWidgetId(widgetId);
        return;
      }

      if (widgetType === WidgetType.FIELDS) {
        navigatePageLayoutSidePanel({
          sidePanelPage: isDashboardPageLayout
            ? SidePanelPages.DashboardFieldsSettings
            : SidePanelPages.RecordPageFieldsSettings,
          pageTitle: t`Edit Fields`,
          resetNavigationStack: true,
        });
        setPageLayoutEditingWidgetId(widgetId);
        return;
      }

      if (widgetType === WidgetType.FIELD) {
        navigatePageLayoutSidePanel({
          sidePanelPage: isDashboardPageLayout
            ? SidePanelPages.DashboardFieldSettings
            : SidePanelPages.RecordPageFieldSettings,
          pageTitle: t`Field widget`,
          resetNavigationStack: true,
        });
        setPageLayoutEditingWidgetId(widgetId);
        return;
      }

      if (widgetType === WidgetType.RECORD_TABLE) {
        navigatePageLayoutSidePanel({
          sidePanelPage: isDashboardPageLayout
            ? SidePanelPages.DashboardRecordTableSettings
            : SidePanelPages.RecordPageRecordTableSettings,
          pageTitle: t`Edit Record Table`,
          resetNavigationStack: true,
        });
        setPageLayoutEditingWidgetId(widgetId);
        return;
      }

      if (widgetType === WidgetType.STANDALONE_RICH_TEXT) {
        setPageLayoutEditingWidgetId(widgetId);
        closeSidePanelMenu();
        return;
      }

      setSidePanelPage(SidePanelPages.CommandMenuDisplay);
      closeSidePanelMenu();
    },
    [
      isDashboardPageLayout,
      setPageLayoutEditingWidgetId,
      navigatePageLayoutSidePanel,
      closeSidePanelMenu,
      setSidePanelPage,
    ],
  );

  return {
    openWidgetSettingsInSidePanel,
  };
};
