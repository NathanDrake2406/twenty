import { type PageLayoutSidePanelPage } from '@/side-panel/pages/page-layout/types/PageLayoutSidePanelPage';
import { SidePanelPages } from 'twenty-shared/types';
import { assertUnreachable } from 'twenty-shared/utils';
import {
  IconAppWindow,
  IconChartPie,
  IconFrame,
  IconList,
  IconPlus,
  IconTable,
} from 'twenty-ui/display';

export const getPageLayoutIcon = (page: PageLayoutSidePanelPage) => {
  switch (page) {
    case SidePanelPages.PageLayoutWidgetTypeSelect:
      return IconAppWindow;
    case SidePanelPages.DashboardChartSettings:
    case SidePanelPages.RecordPageChartSettings:
      return IconChartPie;
    case SidePanelPages.DashboardIframeSettings:
    case SidePanelPages.RecordPageIframeSettings:
      return IconFrame;
    case SidePanelPages.PageLayoutTabSettings:
      return IconAppWindow;
    case SidePanelPages.DashboardFieldsSettings:
    case SidePanelPages.RecordPageFieldsSettings:
      return IconList;
    case SidePanelPages.DashboardFieldSettings:
    case SidePanelPages.RecordPageFieldSettings:
      return IconList;
    case SidePanelPages.DashboardRecordTableSettings:
    case SidePanelPages.RecordPageRecordTableSettings:
      return IconTable;
    case SidePanelPages.PageLayoutRecordPageWidgetTypeSelect:
      return IconPlus;
    default:
      assertUnreachable(page);
  }
};
