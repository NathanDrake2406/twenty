import { CommandMenuItem } from '@/command-menu/components/CommandMenuItem';
import { useDeletePageLayoutWidget } from '@/page-layout/hooks/useDeletePageLayoutWidget';
import { pageLayoutEditingWidgetIdComponentState } from '@/page-layout/states/pageLayoutEditingWidgetIdComponentState';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { WIDGET_SETTINGS_SELECTABLE_ITEM_IDS } from '@/side-panel/pages/page-layout/constants/settings/WidgetSettingsSelectableItemIds';
import { useNavigatePageLayoutSidePanel } from '@/side-panel/pages/page-layout/hooks/useNavigatePageLayoutSidePanel';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useLingui } from '@lingui/react/macro';
import { SidePanelPages } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconSwitchHorizontal, IconTrash } from 'twenty-ui/display';

type WidgetSettingsManageSectionProps = {
  pageLayoutId: string;
};

export const WidgetSettingsManageSection = ({
  pageLayoutId,
}: WidgetSettingsManageSectionProps) => {
  const { t } = useLingui();

  const pageLayoutEditingWidgetId = useAtomComponentStateValue(
    pageLayoutEditingWidgetIdComponentState,
    pageLayoutId,
  );

  const { deletePageLayoutWidget } = useDeletePageLayoutWidget(pageLayoutId);

  const { navigatePageLayoutSidePanel } = useNavigatePageLayoutSidePanel();

  if (!isDefined(pageLayoutEditingWidgetId)) {
    return null;
  }

  const handleReplaceWidget = () => {
    navigatePageLayoutSidePanel({
      sidePanelPage: SidePanelPages.PageLayoutWidgetTypeSelect,
    });
  };

  const handleDeleteWidget = () => {
    deletePageLayoutWidget(pageLayoutEditingWidgetId);
  };

  return (
    <SidePanelGroup heading={t`Manage`}>
      <SelectableListItem
        itemId={WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.REPLACE_WIDGET}
        onEnter={handleReplaceWidget}
      >
        <CommandMenuItem
          id={WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.REPLACE_WIDGET}
          Icon={IconSwitchHorizontal}
          label={t`Replace widget`}
          hasSubMenu
          onClick={handleReplaceWidget}
        />
      </SelectableListItem>
      <SelectableListItem
        itemId={WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.DELETE_WIDGET}
        onEnter={handleDeleteWidget}
      >
        <CommandMenuItem
          id={WIDGET_SETTINGS_SELECTABLE_ITEM_IDS.DELETE_WIDGET}
          Icon={IconTrash}
          label={t`Delete widget`}
          onClick={handleDeleteWidget}
        />
      </SelectableListItem>
    </SidePanelGroup>
  );
};
