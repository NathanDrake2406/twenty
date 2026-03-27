import { Injectable, OnModuleInit } from '@nestjs/common';

import { PermissionFlagType } from 'twenty-shared/constants';

import {
  type GenerateDescriptorOptions,
  type ToolProvider,
  type ToolProviderContext,
} from 'src/engine/core-modules/tool-provider/interfaces/tool-provider.interface';

import { ToolCategory } from 'src/engine/core-modules/tool-provider/enums/tool-category.enum';
import { ToolExecutorService } from 'src/engine/core-modules/tool-provider/services/tool-executor.service';
import {
  type ToolDescriptor,
  type ToolIndexEntry,
} from 'src/engine/core-modules/tool-provider/types/tool-descriptor.type';
import { toolSetToDescriptors } from 'src/engine/core-modules/tool-provider/utils/tool-set-to-descriptors.util';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { ViewSortToolsFactory } from 'src/engine/metadata-modules/view-sort/tools/view-sort-tools.factory';

@Injectable()
export class ViewSortToolProvider implements ToolProvider, OnModuleInit {
  readonly category = ToolCategory.VIEW_SORT;

  constructor(
    private readonly viewSortToolsFactory: ViewSortToolsFactory,
    private readonly permissionsService: PermissionsService,
    private readonly toolExecutorService: ToolExecutorService,
  ) {}

  onModuleInit(): void {
    const factory = this.viewSortToolsFactory;

    this.toolExecutorService.registerCategoryGenerator(
      ToolCategory.VIEW_SORT,
      async (context) => {
        const readTools = factory.generateReadTools(context.workspaceId);

        const hasViewPermission =
          await this.permissionsService.checkRolesPermissions(
            context.rolePermissionConfig,
            context.workspaceId,
            PermissionFlagType.VIEWS,
          );

        if (hasViewPermission) {
          const writeTools = factory.generateWriteTools(context.workspaceId);

          return { ...readTools, ...writeTools };
        }

        return readTools;
      },
    );
  }

  async isAvailable(_context: ToolProviderContext): Promise<boolean> {
    return true;
  }

  async generateDescriptors(
    context: ToolProviderContext,
    options?: GenerateDescriptorOptions,
  ): Promise<(ToolIndexEntry | ToolDescriptor)[]> {
    const schemaOptions = {
      includeSchemas: options?.includeSchemas ?? true,
    };

    const readTools = this.viewSortToolsFactory.generateReadTools(
      context.workspaceId,
    );

    const hasViewPermission =
      await this.permissionsService.checkRolesPermissions(
        context.rolePermissionConfig,
        context.workspaceId,
        PermissionFlagType.VIEWS,
      );

    if (hasViewPermission) {
      const writeTools = this.viewSortToolsFactory.generateWriteTools(
        context.workspaceId,
      );

      return toolSetToDescriptors(
        { ...readTools, ...writeTools },
        ToolCategory.VIEW_SORT,
        schemaOptions,
      );
    }

    return toolSetToDescriptors(
      readTools,
      ToolCategory.VIEW_SORT,
      schemaOptions,
    );
  }
}
