import { pageLayoutDraftComponentState } from '@/page-layout/states/pageLayoutDraftComponentState';
import { pageLayoutEditingWidgetIdComponentState } from '@/page-layout/states/pageLayoutEditingWidgetIdComponentState';
import { WidgetComponentInstanceContext } from '@/page-layout/widgets/states/contexts/WidgetComponentInstanceContext';
import { SidePanelList } from '@/side-panel/components/SidePanelList';
import { ChartSettings } from '@/side-panel/pages/page-layout/components/ChartSettings';
import { WidgetSettingsManageSection } from '@/side-panel/pages/page-layout/components/WidgetSettingsManageSection';
import { WidgetSettingsPlacementSection } from '@/side-panel/pages/page-layout/components/WidgetSettingsPlacementSection';
import { WIDGET_SETTINGS_SELECTABLE_ITEM_IDS } from '@/side-panel/pages/page-layout/constants/settings/WidgetSettingsSelectableItemIds';
import { usePageLayoutIdFromContextStore } from '@/side-panel/pages/page-layout/hooks/usePageLayoutIdFromContextStore';
import { isChartWidget } from '@/side-panel/pages/page-layout/utils/isChartWidget';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const SidePanelRecordPageChartSettings = () => {
  const { pageLayoutId } = usePageLayoutIdFromContextStore();

  const pageLayoutDraft = useAtomComponentStateValue(
    pageLayoutDraftComponentState,
    pageLayoutId,
  );

  const pageLayoutEditingWidgetId = useAtomComponentStateValue(
    pageLayoutEditingWidgetIdComponentState,
    pageLayoutId,
  );

  const widgetInEditMode = pageLayoutDraft.tabs
    .flatMap((tab) => tab.widgets)
    .find((widget) => widget.id === pageLayoutEditingWidgetId);

  if (!isDefined(widgetInEditMode) || !isChartWidget(widgetInEditMode)) {
    return null;
  }

  const selectableItemIds = [
    WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.REPLACE_WIDGET,
    WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.DELETE_WIDGET,
    WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.MOVE_UP,
    WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.MOVE_DOWN,
    WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.MOVE_TO_TAB,
    WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.ADD_WIDGET_ABOVE,
    WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.ADD_WIDGET_BELOW,
  ];

  return (
    <StyledContainer>
      <WidgetComponentInstanceContext.Provider
        value={{ instanceId: widgetInEditMode.id }}
      >
        <ChartSettings widget={widgetInEditMode} />
        <SidePanelList commandGroups={[]} selectableItemIds={selectableItemIds}>
          <WidgetSettingsManageSection pageLayoutId={pageLayoutId} />
          <WidgetSettingsPlacementSection pageLayoutId={pageLayoutId} />
        </SidePanelList>
      </WidgetComponentInstanceContext.Provider>
    </StyledContainer>
  );
};
