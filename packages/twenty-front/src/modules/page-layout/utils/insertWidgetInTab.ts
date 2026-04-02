import { type PageLayoutTab } from '@/page-layout/types/PageLayoutTab';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';

export const insertWidgetInTab = (
  tabs: PageLayoutTab[],
  tabId: string,
  newWidget: PageLayoutWidget,
  atIndex: number,
): PageLayoutTab[] => {
  return tabs.map((tab) => {
    if (tab.id === tabId) {
      const widgets = [...(tab?.widgets ?? [])];
      const clampedIndex = Math.max(0, Math.min(atIndex, widgets.length));

      widgets.splice(clampedIndex, 0, newWidget);

      return {
        ...tab,
        widgets,
      };
    }
    return tab;
  });
};
