import * as fs from 'fs';
import * as path from 'path';

import { Logger } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';

import { type CoreMigrationType } from 'src/database/typeorm/core/decorators/registered-core-migration.decorator';
import { CoreMigrationGeneratorService } from 'src/database/commands/core-migration/services/core-migration-generator.service';
import { UPGRADE_COMMAND_SUPPORTED_VERSIONS } from 'src/engine/constants/upgrade-command-supported-versions.constant';

const MIGRATIONS_DIR = path.resolve(
  process.cwd(),
  'src/database/typeorm/core/migrations/common',
);

const UPGRADE_COMMANDS_DIR = path.resolve(
  process.cwd(),
  'src/database/commands/upgrade-version-command',
);

type GenerateVersionedMigrationCommandOptions = {
  name: string;
  type: CoreMigrationType;
};

@Command({
  name: 'generate:versioned-migration',
  description:
    'Generate a TypeORM migration with @RegisteredCoreMigration decorator for the latest supported version',
})
export class GenerateVersionedMigrationCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateVersionedMigrationCommand.name);

  constructor(
    private readonly coreMigrationGeneratorService: CoreMigrationGeneratorService,
  ) {
    super();
  }

  @Option({
    flags: '-n, --name <name>',
    description: 'Migration name (kebab-case)',
    defaultValue: 'auto-generated',
  })
  parseName(value: string): string {
    return value;
  }

  @Option({
    flags: '-t, --type <type>',
    description: 'Migration type: fast (auto-generated from schema diff) or slow (hand-written stub with command)',
    defaultValue: 'fast',
  })
  parseType(value: string): CoreMigrationType {
    if (value !== 'fast' && value !== 'slow') {
      throw new Error(`Invalid migration type "${value}". Must be "fast" or "slow".`);
    }

    return value;
  }

  async run(
    _passedParams: string[],
    options: GenerateVersionedMigrationCommandOptions,
  ): Promise<void> {
    const migrationName = options.name;

    const version = UPGRADE_COMMAND_SUPPORTED_VERSIONS.slice(-1)[0];

    if (!version) {
      throw new Error('No supported versions found');
    }

    const timestamp = Date.now();

    if (options.type === 'slow') {
      await this.generateSlowMigration(migrationName, version, timestamp);
    } else {
      await this.generateFastMigration(migrationName, version, timestamp);
    }
  }

  private async generateFastMigration(
    migrationName: string,
    version: (typeof UPGRADE_COMMAND_SUPPORTED_VERSIONS)[number],
    timestamp: number,
  ): Promise<void> {
    this.logger.log(
      `Generating fast versioned migration for version ${version}...`,
    );

    const result = await this.coreMigrationGeneratorService.generate({
      migrationName,
      version,
      timestamp,
    });

    if (!result) {
      this.logger.warn(
        'No changes in database schema were found - cannot generate a migration.',
      );

      return;
    }

    const filePath = path.join(MIGRATIONS_DIR, result.fileName);

    fs.writeFileSync(filePath, result.fileTemplate);

    this.logger.log(`Migration generated successfully: ${filePath}`);
    this.logger.log(`  Class: ${result.className}`);
    this.logger.log(`  Version: ${version}`);
  }

  private async generateSlowMigration(
    migrationName: string,
    version: (typeof UPGRADE_COMMAND_SUPPORTED_VERSIONS)[number],
    timestamp: number,
  ): Promise<void> {
    this.logger.log(
      `Generating slow versioned migration for version ${version}...`,
    );

    const migrationResult =
      this.coreMigrationGeneratorService.generateSlowMigrationTemplate({
        migrationName,
        version,
        timestamp,
      });

    const migrationFilePath = path.join(
      MIGRATIONS_DIR,
      migrationResult.fileName,
    );

    fs.writeFileSync(migrationFilePath, migrationResult.fileTemplate);

    this.logger.log(
      `Slow migration stub generated: ${migrationFilePath}`,
    );

    const commandResult =
      this.coreMigrationGeneratorService.generateSlowCommandTemplate({
        migrationName,
        version,
        timestamp,
        migrationClassName: migrationResult.className,
      });

    const versionDashed = version.replace(/\./g, '-').replace(/-0$/, '');
    const commandDir = path.join(UPGRADE_COMMANDS_DIR, versionDashed);
    const commandFilePath = path.join(commandDir, commandResult.fileName);

    fs.writeFileSync(commandFilePath, commandResult.fileTemplate);

    this.logger.log(`Slow command stub generated: ${commandFilePath}`);
    this.logger.log(`  Migration class: ${migrationResult.className}`);
    this.logger.log(`  Version: ${version}`);
  }
}
