import { type SidePanelPages } from 'twenty-shared/types';

export type PageLayoutSidePanelPage =
  | SidePanelPages.PageLayoutWidgetTypeSelect
  | SidePanelPages.PageLayoutTabSettings
  | SidePanelPages.DashboardChartSettings
  | SidePanelPages.DashboardIframeSettings
  | SidePanelPages.DashboardFieldsSettings
  | SidePanelPages.DashboardFieldSettings
  | SidePanelPages.DashboardRecordTableSettings
  | SidePanelPages.RecordPageChartSettings
  | SidePanelPages.RecordPageIframeSettings
  | SidePanelPages.RecordPageFieldsSettings
  | SidePanelPages.RecordPageFieldSettings
  | SidePanelPages.RecordPageRecordTableSettings
  | SidePanelPages.PageLayoutRecordPageWidgetTypeSelect;
