import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  mixin,
  type Type,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { msg } from '@lingui/core/macro';
import { type PermissionFlagType } from 'twenty-shared/constants';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import {
  PermissionsException,
  PermissionsExceptionCode,
  PermissionsExceptionMessage,
} from 'src/engine/metadata-modules/permissions/permissions.exception';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

export const SettingsPermissionGuard = (
  requiredPermission: PermissionFlagType,
): Type<CanActivate> => {
  @Injectable()
  class SettingsPermissionMixin implements CanActivate {
    constructor(private readonly permissionsService: PermissionsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const ctx = GqlExecutionContext.create(context);
      const request = ctx.getContext().req;
      const workspaceId = request.workspace.id;
      const userWorkspaceId = request.userWorkspaceId;
      const workspaceActivationStatus =
        request.workspace.activationStatus;

      if (
        [
          WorkspaceActivationStatus.PENDING_CREATION,
          WorkspaceActivationStatus.ONGOING_CREATION,
        ].includes(workspaceActivationStatus)
      ) {
        return true;
      }

      // Cache permission results per request to avoid N+1 DB queries
      // when GraphQL resolves multiple fields on the same resolver class
      const cacheKey = `settingsPermission:${requiredPermission}:${userWorkspaceId ?? ''}:${request.apiKey?.id ?? ''}:${request.application?.id ?? ''}`;

      if (!request._settingsPermissionCache) {
        request._settingsPermissionCache = {};
      }

      if (cacheKey in request._settingsPermissionCache) {
        const cachedResult = request._settingsPermissionCache[cacheKey];

        if (cachedResult === true) {
          return true;
        }

        throw new PermissionsException(
          PermissionsExceptionMessage.PERMISSION_DENIED,
          PermissionsExceptionCode.PERMISSION_DENIED,
          {
            userFriendlyMessage: msg`You do not have permission to access this feature. Please contact your workspace administrator for access.`,
          },
        );
      }

      const hasPermission =
        await this.permissionsService.userHasWorkspaceSettingPermission({
          userWorkspaceId,
          setting: requiredPermission,
          workspaceId,
          apiKeyId: request.apiKey?.id,
          applicationId: request.application?.id,
        });

      request._settingsPermissionCache[cacheKey] = hasPermission;

      if (hasPermission === true) {
        return true;
      }

      throw new PermissionsException(
        PermissionsExceptionMessage.PERMISSION_DENIED,
        PermissionsExceptionCode.PERMISSION_DENIED,
        {
          userFriendlyMessage: msg`You do not have permission to access this feature. Please contact your workspace administrator for access.`,
        },
      );
    }
  }

  return mixin(SettingsPermissionMixin);
};
