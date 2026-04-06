import { CommandRunner } from 'nest-commander';

import { CoreMigrationRunnerService } from 'src/database/commands/core-migration/services/core-migration-runner.service';
import { CommandLogger } from 'src/database/commands/logger';

export abstract class SlowCoreMigrationCommandRunner extends CommandRunner {
  protected logger: CommandLogger;

  constructor(
    protected readonly coreMigrationRunnerService: CoreMigrationRunnerService,
    protected readonly migrationName: string,
  ) {
    super();
    this.logger = new CommandLogger({
      verbose: false,
      constructorName: this.constructor.name,
    });
  }

  abstract runDataMigration(): Promise<void>;

  override async run(): Promise<void> {
    const isPending =
      await this.coreMigrationRunnerService.isMigrationPending(
        this.migrationName,
      );

    if (!isPending) {
      this.logger.warn(
        `Slow migration ${this.migrationName} already executed, skipping`,
      );

      return;
    }

    this.logger.log(`Running data migration for ${this.migrationName}...`);
    await this.runDataMigration();

    this.logger.log(`Running TypeORM migration ${this.migrationName}...`);
    const result =
      await this.coreMigrationRunnerService.runSingleMigration(
        this.migrationName,
      );

    if (result.status === 'fail') {
      throw new Error(
        `Slow migration ${this.migrationName} failed: ${result.code}`,
      );
    }

    this.logger.log(
      `Slow migration ${this.migrationName} completed successfully`,
    );
  }
}
