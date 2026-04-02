import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { pageLayoutDraftComponentState } from '@/page-layout/states/pageLayoutDraftComponentState';
import { isVerticalListPosition } from '@/page-layout/utils/isVerticalListPosition';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useAtomComponentStateCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateCallbackState';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutTabLayoutMode } from '~/generated-metadata/graphql';

export const useCanMovePageLayoutWidgetDown = (
  pageLayoutIdFromProps?: string,
) => {
  const pageLayoutId = useAvailableComponentInstanceIdOrThrow(
    PageLayoutComponentInstanceContext,
    pageLayoutIdFromProps,
  );

  const pageLayoutDraftState = useAtomComponentStateCallbackState(
    pageLayoutDraftComponentState,
    pageLayoutId,
  );

  const store = useStore();

  const canMovePageLayoutWidgetDown = useCallback(
    (widgetId: string) => {
      const draft = store.get(pageLayoutDraftState);

      const tab = draft.tabs.find((candidateTab) =>
        candidateTab.widgets.some((widget) => widget.id === widgetId),
      );

      if (!tab || tab.layoutMode !== PageLayoutTabLayoutMode.VERTICAL_LIST) {
        return false;
      }

      const sortedWidgets = [...tab.widgets].sort((widgetA, widgetB) => {
        const indexA =
          isDefined(widgetA.position) &&
          isVerticalListPosition(widgetA.position)
            ? widgetA.position.index
            : 0;
        const indexB =
          isDefined(widgetB.position) &&
          isVerticalListPosition(widgetB.position)
            ? widgetB.position.index
            : 0;
        return indexA - indexB;
      });

      const widgetIndex = sortedWidgets.findIndex(
        (widget) => widget.id === widgetId,
      );

      return widgetIndex >= 0 && widgetIndex < sortedWidgets.length - 1;
    },
    [pageLayoutDraftState, store],
  );

  return { canMovePageLayoutWidgetDown };
};
