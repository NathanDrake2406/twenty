import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { isDefined } from 'twenty-shared/utils';

import { NavigationMenuItemDeletionService } from 'src/engine/metadata-modules/navigation-menu-item/services/navigation-menu-item-deletion.service';
import { type MetadataEventBatch } from 'src/engine/subscriptions/metadata-event/types/metadata-event-batch.type';

type IsActiveDiff = {
  before: boolean;
  after: boolean;
};

type ObjectMetadataUpdatedEventProperties = {
  updatedFields: string[];
  diff: Record<string, { before: unknown; after: unknown }>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

@Injectable()
export class NavigationMenuItemObjectDeactivationListener {
  constructor(
    private readonly navigationMenuItemDeletionService: NavigationMenuItemDeletionService,
  ) {}

  @OnEvent('metadata.objectMetadata.updated')
  async handleObjectMetadataUpdated(
    metadataEventBatch: MetadataEventBatch<'objectMetadata', 'updated'>,
  ): Promise<void> {
    const deactivatedObjectMetadataIds = metadataEventBatch.events
      .filter((event) => event.type === 'updated')
      .filter((event) => {
        const properties =
          event.properties as unknown as ObjectMetadataUpdatedEventProperties;
        const isActiveDiff = properties.diff?.isActive as
          | IsActiveDiff
          | undefined;

        return (
          isDefined(isActiveDiff) &&
          isActiveDiff.before === true &&
          isActiveDiff.after === false
        );
      })
      .map((event) => event.recordId);

    if (deactivatedObjectMetadataIds.length === 0) {
      return;
    }

    await this.navigationMenuItemDeletionService.deleteNavigationMenuItemsForDeactivatedObjects(
      deactivatedObjectMetadataIds,
      metadataEventBatch.workspaceId,
    );
  }
}
