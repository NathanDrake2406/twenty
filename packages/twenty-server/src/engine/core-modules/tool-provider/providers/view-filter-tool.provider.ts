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
import { ViewFilterToolsFactory } from 'src/engine/metadata-modules/view-filter/tools/view-filter-tools.factory';

@Injectable()
export class ViewFilterToolProvider implements ToolProvider, OnModuleInit {
  readonly category = ToolCategory.VIEW_FILTER;

  constructor(
    private readonly viewFilterToolsFactory: ViewFilterToolsFactory,
    private readonly permissionsService: PermissionsService,
    private readonly toolExecutorService: ToolExecutorService,
  ) {}

  onModuleInit(): void {
    const factory = this.viewFilterToolsFactory;

    this.toolExecutorService.registerCategoryGenerator(
      ToolCategory.VIEW_FILTER,
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

    const readTools = this.viewFilterToolsFactory.generateReadTools(
      context.workspaceId,
    );

    const hasViewPermission =
      await this.permissionsService.checkRolesPermissions(
        context.rolePermissionConfig,
        context.workspaceId,
        PermissionFlagType.VIEWS,
      );

    if (hasViewPermission) {
      const writeTools = this.viewFilterToolsFactory.generateWriteTools(
        context.workspaceId,
      );

      return toolSetToDescriptors(
        { ...readTools, ...writeTools },
        ToolCategory.VIEW_FILTER,
        schemaOptions,
      );
    }

    return toolSetToDescriptors(
      readTools,
      ToolCategory.VIEW_FILTER,
      schemaOptions,
    );
  }
}
