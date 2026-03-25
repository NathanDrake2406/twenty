import { pageLayoutDraftComponentState } from '@/page-layout/states/pageLayoutDraftComponentState';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { addWidgetToTab } from '@/page-layout/utils/addWidgetToTab';
import { createDefaultFrontComponentWidgetForVerticalList } from '@/page-layout/utils/createDefaultFrontComponentWidgetForVerticalList';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { useAtomComponentStateCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateCallbackState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { v4 as uuidv4 } from 'uuid';

export const useCreateRecordPageFrontComponentWidget = ({
  pageLayoutId,
  tabListInstanceId,
}: {
  pageLayoutId: string;
  tabListInstanceId: string;
}) => {
  const activeTabId = useAtomComponentStateValue(
    activeTabIdComponentState,
    tabListInstanceId,
  );

  const pageLayoutDraft = useAtomComponentStateValue(
    pageLayoutDraftComponentState,
    pageLayoutId,
  );

  const pageLayoutDraftState = useAtomComponentStateCallbackState(
    pageLayoutDraftComponentState,
    pageLayoutId,
  );

  const store = useStore();

  const createRecordPageFrontComponentWidget = useCallback(
    (title: string, frontComponentId: string): PageLayoutWidget | undefined => {
      if (!isDefined(activeTabId)) {
        return undefined;
      }

      const activeTab = pageLayoutDraft.tabs.find(
        (tab) => tab.id === activeTabId,
      );
      const existingWidgets = activeTab?.widgets ?? [];

      const positionIndex = existingWidgets.length;
      const widgetId = uuidv4();

      const newWidget = createDefaultFrontComponentWidgetForVerticalList({
        id: widgetId,
        pageLayoutTabId: activeTabId,
        title,
        frontComponentId,
        positionIndex,
      });

      store.set(pageLayoutDraftState, (prev) => ({
        ...prev,
        tabs: addWidgetToTab(prev.tabs, activeTabId, newWidget),
      }));

      return newWidget;
    },
    [activeTabId, pageLayoutDraft.tabs, pageLayoutDraftState, store],
  );

  return { createRecordPageFrontComponentWidget };
};
