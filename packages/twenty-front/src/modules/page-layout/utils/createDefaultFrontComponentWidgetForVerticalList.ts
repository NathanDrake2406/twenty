import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import {
  PageLayoutTabLayoutMode,
  WidgetConfigurationType,
  WidgetType,
} from '~/generated-metadata/graphql';

export const createDefaultFrontComponentWidgetForVerticalList = ({
  id,
  pageLayoutTabId,
  title,
  frontComponentId,
  positionIndex,
}: {
  id: string;
  pageLayoutTabId: string;
  title: string;
  frontComponentId: string;
  positionIndex: number;
}): PageLayoutWidget => {
  return {
    __typename: 'PageLayoutWidget',
    id,
    pageLayoutTabId,
    title,
    type: WidgetType.FRONT_COMPONENT,
    configuration: {
      __typename: 'FrontComponentConfiguration',
      configurationType: WidgetConfigurationType.FRONT_COMPONENT,
      frontComponentId,
    },
    gridPosition: {
      __typename: 'GridPosition',
      row: 0,
      column: 0,
      rowSpan: 1,
      columnSpan: 12,
    },
    position: {
      __typename: 'PageLayoutWidgetVerticalListPosition',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: positionIndex,
    },
    objectMetadataId: null,
    isOverridden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
};
