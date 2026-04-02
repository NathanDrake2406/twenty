import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { Command } from 'nest-commander';
import { DataSource, Repository } from 'typeorm';
import { v4 } from 'uuid';

import { ActiveOrSuspendedWorkspacesMigrationCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspaces-migration.command-runner';
import { RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspaces-migration.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { CommandMenuItemAvailabilityType } from 'src/engine/metadata-modules/command-menu-item/enums/command-menu-item-availability-type.enum';
import { EngineComponentKey } from 'src/engine/metadata-modules/command-menu-item/enums/engine-component-key.enum';
import { DataSourceService } from 'src/engine/metadata-modules/data-source/data-source.service';
import { type FlatCommandMenuItem } from 'src/engine/metadata-modules/flat-command-menu-item/types/flat-command-menu-item.type';
import { buildNavigationFlatCommandMenuItem } from 'src/engine/metadata-modules/flat-command-menu-item/utils/build-navigation-flat-command-menu-item.util';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
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

const SETTINGS_UNIVERSAL_IDENTIFIER = 'ef9aba44-0068-453e-930a-f8c182af18ee';

@Command({
  name: 'upgrade:1-21:refactor-navigation-commands',
  description:
    'Replace GO_TO_* command menu items with unified NAVIGATION engine key and payload',
})
export class RefactorNavigationCommandsCommand extends ActiveOrSuspendedWorkspacesMigrationCommandRunner {
  constructor(
    @InjectRepository(WorkspaceEntity)
    protected readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectDataSource()
    private readonly coreDataSource: DataSource,
    protected readonly twentyORMGlobalManager: GlobalWorkspaceOrmManager,
    protected readonly dataSourceService: DataSourceService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
  ) {
    super(workspaceRepository, twentyORMGlobalManager, dataSourceService);
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
        (Number(maxPositionResult?.[0]?.maxPosition) ?? -1) + 1;

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
        universalIdentifier: SETTINGS_UNIVERSAL_IDENTIFIER,
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
