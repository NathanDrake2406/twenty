import { InjectDataSource } from '@nestjs/typeorm';

import { Command } from 'nest-commander';
import { DataSource } from 'typeorm';
import { v4 } from 'uuid';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import {
  type RunOnWorkspaceArgs,
  type WorkspaceCommandOptions,
} from 'src/database/commands/command-runners/workspace.command-runner';
import { addPayloadCheckConstraintToCommandMenuItem } from 'src/database/typeorm/core/migrations/utils/1775129635528-add-payload-to-command-menu-item.util';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { CommandMenuItemAvailabilityType } from 'src/engine/metadata-modules/command-menu-item/enums/command-menu-item-availability-type.enum';
import { EngineComponentKey } from 'src/engine/metadata-modules/command-menu-item/enums/engine-component-key.enum';
import { type FlatCommandMenuItem } from 'src/engine/metadata-modules/flat-command-menu-item/types/flat-command-menu-item.type';
import { buildNavigationFlatCommandMenuItem } from 'src/engine/metadata-modules/flat-command-menu-item/utils/build-navigation-flat-command-menu-item.util';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { STANDARD_COMMAND_MENU_ITEMS } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-command-menu-item.constant';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const GO_TO_ENGINE_KEYS = [
  'GO_TO_PEOPLE',
  'GO_TO_COMPANIES',
  'GO_TO_DASHBOARDS',
  'GO_TO_OPPORTUNITIES',
  'GO_TO_SETTINGS',
  'GO_TO_TASKS',
  'GO_TO_NOTES',
  'GO_TO_WORKFLOWS',
  'GO_TO_RUNS',
];

@Command({
  name: 'upgrade:1-21:refactor-navigation-commands',
  description:
    'Replace GO_TO_* command menu items with unified NAVIGATION engine key and payload',
})
export class RefactorNavigationCommandsCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    @InjectDataSource()
    private readonly coreDataSource: DataSource,
    private readonly applicationService: ApplicationService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
  ) {
    super(workspaceIteratorService);
  }

  override async run(
    passedParams: string[],
    options: WorkspaceCommandOptions,
  ): Promise<void> {
    await super.run(passedParams, options);

    if (options.workspaceId && options.workspaceId.size > 0) {
      this.logger.log(
        'Skipping CHECK constraint application: command was not launched for all workspaces',
      );

      return;
    }

    if (options.dryRun) {
      this.logger.log(
        '[DRY RUN] Would apply CHK_CMD_MENU_ITEM_ENGINE_KEY_COHERENCE',
      );

      return;
    }

    const queryRunner = this.coreDataSource.createQueryRunner();

    await queryRunner.connect();

    try {
      await addPayloadCheckConstraintToCommandMenuItem(queryRunner);
      this.logger.log(
        'Successfully applied CHK_CMD_MENU_ITEM_ENGINE_KEY_COHERENCE',
      );
    } finally {
      await queryRunner.release();
    }
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    this.logger.log(
      `${isDryRun ? '[DRY RUN] ' : ''}Refactoring navigation commands for workspace ${workspaceId}`,
    );

    const queryRunner = this.coreDataSource.createQueryRunner();

    await queryRunner.connect();

    try {
      const deleteResult = isDryRun
        ? await queryRunner.query(
            `SELECT COUNT(*) as count FROM core."commandMenuItem"
             WHERE "workspaceId" = $1
               AND "engineComponentKey" = ANY($2)`,
            [workspaceId, GO_TO_ENGINE_KEYS],
          )
        : await queryRunner.query(
            `DELETE FROM core."commandMenuItem"
             WHERE "workspaceId" = $1
               AND "engineComponentKey" = ANY($2)`,
            [workspaceId, GO_TO_ENGINE_KEYS],
          );

      const deletedCount = isDryRun
        ? deleteResult?.[0]?.count ?? 0
        : deleteResult?.[1] ?? 0;

      this.logger.log(
        `${isDryRun ? '[DRY RUN] Would delete' : 'Deleted'} ${deletedCount} old GO_TO_* command(s) for workspace ${workspaceId}`,
      );

      const objectMetadataItems: ObjectMetadataEntity[] =
        await queryRunner.query(
          `SELECT id, "nameSingular", "namePlural", "labelPlural", icon, "isSystem", "isActive", "universalIdentifier", "shortcut"
           FROM core."objectMetadata"
           WHERE "workspaceId" = $1 AND "isActive" = true`,
          [workspaceId],
        );

      this.logger.log(
        `Found ${objectMetadataItems.length} active object(s) for workspace ${workspaceId}`,
      );

      const maxPositionResult = await queryRunner.query(
        `SELECT COALESCE(MAX(position), -1) as "maxPosition"
         FROM core."commandMenuItem"
         WHERE "workspaceId" = $1
           AND "engineComponentKey" != ALL($2)`,
        [workspaceId, GO_TO_ENGINE_KEYS],
      );

      let nextPosition =
        Number(maxPositionResult?.[0]?.maxPosition ?? -1) + 1;

      const { twentyStandardFlatApplication } =
        await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
          { workspaceId },
        );

      const now = new Date().toISOString();
      const flatCommandMenuItemsToCreate: FlatCommandMenuItem[] = [];

      for (const objectMetadata of objectMetadataItems) {
        const position = nextPosition++;

        flatCommandMenuItemsToCreate.push(
          buildNavigationFlatCommandMenuItem({
            objectMetadata,
            commandMenuItemId: v4(),
            applicationId: twentyStandardFlatApplication.id,
            workspaceId,
            position,
            now,
          }),
        );
      }

      const settingsId = v4();

      flatCommandMenuItemsToCreate.push({
        id: settingsId,
        universalIdentifier:
          STANDARD_COMMAND_MENU_ITEMS.goToSettings.universalIdentifier,
        applicationId: twentyStandardFlatApplication.id,
        applicationUniversalIdentifier:
          TWENTY_STANDARD_APPLICATION.universalIdentifier,
        workspaceId,
        label: 'Go to Settings',
        shortLabel: 'Settings',
        icon: 'IconSettings',
        position: nextPosition++,
        isPinned: false,
        availabilityType: CommandMenuItemAvailabilityType.GLOBAL,
        conditionalAvailabilityExpression: null,
        frontComponentId: null,
        frontComponentUniversalIdentifier: null,
        engineComponentKey: EngineComponentKey.NAVIGATION,
        payload: { path: '/settings/profile' },
        hotKeys: ['G', 'S'],
        workflowVersionId: null,
        availabilityObjectMetadataId: null,
        availabilityObjectMetadataUniversalIdentifier: null,
        createdAt: now,
        updatedAt: now,
      });

      this.logger.log(
        `${isDryRun ? '[DRY RUN] Would create' : 'Creating'} ${flatCommandMenuItemsToCreate.length} NAVIGATION command(s) for workspace ${workspaceId}`,
      );

      if (isDryRun) {
        return;
      }

      const validateAndBuildResult =
        await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
          {
            allFlatEntityOperationByMetadataName: {
              commandMenuItem: {
                flatEntityToCreate: flatCommandMenuItemsToCreate,
                flatEntityToDelete: [],
                flatEntityToUpdate: [],
              },
            },
            workspaceId,
            applicationUniversalIdentifier:
              twentyStandardFlatApplication.universalIdentifier,
          },
        );

      if (validateAndBuildResult.status === 'fail') {
        this.logger.error(
          `Failed to create navigation commands:\n${JSON.stringify(validateAndBuildResult, null, 2)}`,
        );

        throw new Error(
          `Failed to create navigation commands for workspace ${workspaceId}`,
        );
      }

      this.logger.log(
        `Successfully refactored navigation commands for workspace ${workspaceId}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
