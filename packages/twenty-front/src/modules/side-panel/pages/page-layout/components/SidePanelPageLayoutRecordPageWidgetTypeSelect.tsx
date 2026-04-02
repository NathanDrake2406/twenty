import { CommandMenuItem } from '@/command-menu/components/CommandMenuItem';
import { FIND_MANY_FRONT_COMPONENTS } from '@/front-components/graphql/queries/findManyFrontComponents';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useFieldListFieldMetadataItems } from '@/object-record/record-field-list/hooks/useFieldListFieldMetadataItems';
import { useInsertCreatedWidgetAtContext } from '@/page-layout/hooks/useInsertCreatedWidgetAtContext';
import { pageLayoutDraftComponentState } from '@/page-layout/states/pageLayoutDraftComponentState';
import { pageLayoutEditingWidgetIdComponentState } from '@/page-layout/states/pageLayoutEditingWidgetIdComponentState';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { addWidgetToTab } from '@/page-layout/utils/addWidgetToTab';
import { createDefaultFieldWidget } from '@/page-layout/utils/createDefaultFieldWidget';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { SidePanelList } from '@/side-panel/components/SidePanelList';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useNavigatePageLayoutSidePanel } from '@/side-panel/pages/page-layout/hooks/useNavigatePageLayoutSidePanel';
import { usePageLayoutIdFromContextStore } from '@/side-panel/pages/page-layout/hooks/usePageLayoutIdFromContextStore';
import { getFrontComponentWidgetTypeSelectItemId } from '@/side-panel/pages/page-layout/utils/getFrontComponentWidgetTypeSelectItemId';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useAtomComponentStateCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateCallbackState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useQuery } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { SidePanelPages } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconApps, IconList } from 'twenty-ui/display';
import { v4 as uuidv4 } from 'uuid';
import {
  type FrontComponent,
  PageLayoutTabLayoutMode,
  WidgetConfigurationType,
  WidgetType,
} from '~/generated-metadata/graphql';

export const SidePanelPageLayoutRecordPageWidgetTypeSelect = () => {
  const { pageLayoutId } = usePageLayoutIdFromContextStore();

  const { closeSidePanelMenu } = useSidePanelMenu();

  const { navigatePageLayoutSidePanel } = useNavigatePageLayoutSidePanel();

  const pageLayoutDraft = useAtomComponentStateValue(
    pageLayoutDraftComponentState,
    pageLayoutId,
  );

  const pageLayoutDraftState = useAtomComponentStateCallbackState(
    pageLayoutDraftComponentState,
    pageLayoutId,
  );

  const [pageLayoutEditingWidgetId, setPageLayoutEditingWidgetId] =
    useAtomComponentState(
      pageLayoutEditingWidgetIdComponentState,
      pageLayoutId,
    );

  const store = useStore();

  const { insertCreatedWidgetAtContext } =
    useInsertCreatedWidgetAtContext(pageLayoutId);

  const { targetObjectNameSingular } = useTargetRecord();

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: targetObjectNameSingular,
  });

  const { boxedRelationFieldMetadataItems } = useFieldListFieldMetadataItems({
    objectNameSingular: targetObjectNameSingular,
  });

  const editingWidgetTab = isDefined(pageLayoutEditingWidgetId)
    ? pageLayoutDraft.tabs.find((tab) =>
        tab.widgets.some((widget) => widget.id === pageLayoutEditingWidgetId),
      )
    : undefined;

  const tabId = editingWidgetTab?.id;

  const { data: frontComponentsData } = useQuery<{
    frontComponents: FrontComponent[];
  }>(FIND_MANY_FRONT_COMPONENTS);

  const frontComponents = frontComponentsData?.frontComponents ?? [];

  const frontComponentsWithSelectItemId = frontComponents.map(
    (frontComponent) => ({
      frontComponent,
      selectItemId: getFrontComponentWidgetTypeSelectItemId(frontComponent.id),
    }),
  );

  const handleCreateFieldsWidget = useCallback(() => {
    if (!isDefined(tabId)) {
      return;
    }

    const activeTab = pageLayoutDraft.tabs.find((tab) => tab.id === tabId);
    const positionIndex = activeTab?.widgets.length ?? 0;
    const widgetId = uuidv4();

    const newWidget: PageLayoutWidget = {
      __typename: 'PageLayoutWidget',
      id: widgetId,
      pageLayoutTabId: tabId,
      title: t`Fields`,
      type: WidgetType.FIELDS,
      configuration: {
        __typename: 'FieldsConfiguration',
        configurationType: WidgetConfigurationType.FIELDS,
        viewId: null,
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

    store.set(pageLayoutDraftState, (prev) => ({
      ...prev,
      tabs: addWidgetToTab(prev.tabs, tabId, newWidget),
    }));

    setPageLayoutEditingWidgetId(widgetId);
    insertCreatedWidgetAtContext(widgetId);

    navigatePageLayoutSidePanel({
      sidePanelPage: SidePanelPages.PageLayoutFieldsSettings,
      focusTitleInput: true,
      resetNavigationStack: true,
    });
  }, [
    insertCreatedWidgetAtContext,
    navigatePageLayoutSidePanel,
    pageLayoutDraft.tabs,
    pageLayoutDraftState,
    setPageLayoutEditingWidgetId,
    store,
    tabId,
  ]);

  const handleCreateFieldWidget = useCallback(() => {
    if (!isDefined(tabId)) {
      return;
    }

    const activeTab = pageLayoutDraft.tabs.find((tab) => tab.id === tabId);
    const existingWidgets = activeTab?.widgets ?? [];
    const positionIndex = existingWidgets.length;
    const widgetId = uuidv4();

    const usedFieldMetadataIds = new Set(
      existingWidgets
        .filter(
          (widget) =>
            widget.configuration.configurationType ===
            WidgetConfigurationType.FIELD,
        )
        .map((widget) => {
          const configuration = widget.configuration as {
            fieldMetadataId: string;
          };
          return configuration.fieldMetadataId;
        }),
    );

    const unusedRelationField = boxedRelationFieldMetadataItems.find(
      (field) => !usedFieldMetadataIds.has(field.id),
    );

    const selectedField =
      unusedRelationField ?? boxedRelationFieldMetadataItems[0];

    const fieldMetadataId = selectedField?.id ?? '';
    const title = selectedField?.label ?? '';

    const newWidget = createDefaultFieldWidget({
      id: widgetId,
      pageLayoutTabId: tabId,
      title,
      fieldMetadataId,
      objectMetadataId: objectMetadataItem.id,
      positionIndex,
    });

    store.set(pageLayoutDraftState, (prev) => ({
      ...prev,
      tabs: addWidgetToTab(prev.tabs, tabId, newWidget),
    }));

    setPageLayoutEditingWidgetId(widgetId);
    insertCreatedWidgetAtContext(widgetId);

    navigatePageLayoutSidePanel({
      sidePanelPage: SidePanelPages.PageLayoutFieldSettings,
      focusTitleInput: true,
      resetNavigationStack: true,
    });
  }, [
    boxedRelationFieldMetadataItems,
    insertCreatedWidgetAtContext,
    navigatePageLayoutSidePanel,
    objectMetadataItem.id,
    pageLayoutDraft.tabs,
    pageLayoutDraftState,
    setPageLayoutEditingWidgetId,
    store,
    tabId,
  ]);

  const handleCreateFrontComponentWidget = useCallback(
    (frontComponent: FrontComponent) => {
      if (!isDefined(tabId)) {
        return;
      }

      const activeTab = pageLayoutDraft.tabs.find((tab) => tab.id === tabId);
      const positionIndex = activeTab?.widgets.length ?? 0;
      const widgetId = uuidv4();

      const newWidget: PageLayoutWidget = {
        __typename: 'PageLayoutWidget',
        id: widgetId,
        pageLayoutTabId: tabId,
        title: frontComponent.name,
        type: WidgetType.FRONT_COMPONENT,
        configuration: {
          __typename: 'FrontComponentConfiguration',
          configurationType: WidgetConfigurationType.FRONT_COMPONENT,
          frontComponentId: frontComponent.id,
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

      store.set(pageLayoutDraftState, (prev) => ({
        ...prev,
        tabs: addWidgetToTab(prev.tabs, tabId, newWidget),
      }));

      setPageLayoutEditingWidgetId(widgetId);
      insertCreatedWidgetAtContext(widgetId);

      closeSidePanelMenu();
    },
    [
      closeSidePanelMenu,
      insertCreatedWidgetAtContext,
      pageLayoutDraft.tabs,
      pageLayoutDraftState,
      setPageLayoutEditingWidgetId,
      store,
      tabId,
    ],
  );

  const selectableItemIds = [
    'fields',
    'field',
    ...frontComponentsWithSelectItemId.map(({ selectItemId }) => selectItemId),
  ];

  return (
    <SidePanelList commandGroups={[]} selectableItemIds={selectableItemIds}>
      <SidePanelGroup heading={t`Widget type`}>
        <SelectableListItem itemId="fields" onEnter={handleCreateFieldsWidget}>
          <CommandMenuItem
            Icon={IconList}
            label={t`Fields`}
            id="fields"
            onClick={handleCreateFieldsWidget}
          />
        </SelectableListItem>
        <SelectableListItem itemId="field" onEnter={handleCreateFieldWidget}>
          <CommandMenuItem
            Icon={IconList}
            label={t`Field`}
            id="field"
            onClick={handleCreateFieldWidget}
          />
        </SelectableListItem>
      </SidePanelGroup>

      {frontComponentsWithSelectItemId.length > 0 && (
        <SidePanelGroup heading={t`Front Components`}>
          {frontComponentsWithSelectItemId.map(
            ({ frontComponent, selectItemId }) => (
              <SelectableListItem
                key={frontComponent.id}
                itemId={selectItemId}
                onEnter={() => handleCreateFrontComponentWidget(frontComponent)}
              >
                <CommandMenuItem
                  Icon={IconApps}
                  label={frontComponent.name}
                  id={selectItemId}
                  onClick={() =>
                    handleCreateFrontComponentWidget(frontComponent)
                  }
                />
              </SelectableListItem>
            ),
          )}
        </SidePanelGroup>
      )}
    </SidePanelList>
  );
};
