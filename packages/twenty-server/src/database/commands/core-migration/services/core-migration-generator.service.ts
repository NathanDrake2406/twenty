import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { pascalCase } from 'twenty-shared/utils';
import { DataSource } from 'typeorm';

import { type UpgradeCommandVersion } from 'src/engine/constants/upgrade-command-supported-versions.constant';

type GenerateMigrationArgs = {
  migrationName: string;
  version: UpgradeCommandVersion;
  timestamp: number;
};

export type GeneratedMigrationResult = {
  fileName: string;
  fileTemplate: string;
  className: string;
};

export type GeneratedSlowCommandResult = {
  fileName: string;
  fileTemplate: string;
};

@Injectable()
export class CoreMigrationGeneratorService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async generate({
    migrationName,
    version,
    timestamp,
  }: GenerateMigrationArgs): Promise<GeneratedMigrationResult | null> {
    const sqlInMemory = await this.dataSource.driver
      .createSchemaBuilder()
      .log();

    if (sqlInMemory.upQueries.length === 0) {
      return null;
    }

    const className = this.buildClassName(migrationName, version, timestamp);

    const upStatements = sqlInMemory.upQueries.map(
      ({ query, parameters }) =>
        `    await queryRunner.query('${this.escapeForSingleQuotedString(query)}'${this.formatQueryParams(parameters)});`,
    );

    const downStatements = sqlInMemory.downQueries
      .reverse()
      .map(
        ({ query, parameters }) =>
          `    await queryRunner.query('${this.escapeForSingleQuotedString(query)}'${this.formatQueryParams(parameters)});`,
      );

    const fileTemplate = this.buildFastMigrationFileContent(
      className,
      version,
      upStatements,
      downStatements,
    );

    const fileName = this.buildFileName(migrationName, version, timestamp);

    return { fileName, fileTemplate, className };
  }

  generateSlowMigrationTemplate({
    migrationName,
    version,
    timestamp,
  }: GenerateMigrationArgs): GeneratedMigrationResult {
    const className = this.buildClassName(migrationName, version, timestamp);
    const fileName = this.buildFileName(migrationName, version, timestamp);
    const fileTemplate = this.buildSlowMigrationFileContent(
      className,
      version,
    );

    return { fileName, fileTemplate, className };
  }

  generateSlowCommandTemplate({
    migrationName,
    version,
    timestamp,
    migrationClassName,
  }: GenerateMigrationArgs & {
    migrationClassName: string;
  }): GeneratedSlowCommandResult {
    const versionDashed = version.replace(/\./g, '-');
    const versionShort = versionDashed.replace(/-0$/, '');
    const commandName = `upgrade:${versionShort}:${migrationName}`;
    const commandClassName = `${pascalCase(migrationName)}SlowCommand`;
    const fileName = `${versionDashed}-${migrationName}-slow.command.ts`;

    const fileTemplate = `import { Command } from 'nest-commander';

import { SlowCoreMigrationCommandRunner } from 'src/database/commands/command-runners/slow-core-migration.command-runner';
import { CoreMigrationRunnerService } from 'src/database/commands/core-migration/services/core-migration-runner.service';

@Command({
  name: '${commandName}',
  description: 'Data migration + slow core migration: ${migrationName}',
})
export class ${commandClassName} extends SlowCoreMigrationCommandRunner {
  constructor(
    protected readonly coreMigrationRunnerService: CoreMigrationRunnerService,
  ) {
    super(
      coreMigrationRunnerService,
      '${migrationClassName}',
    );
  }

  async runDataMigration(): Promise<void> {
    // TODO: implement data migration logic before the TypeORM migration runs
  }
}
`;

    return { fileName, fileTemplate };
  }

  private buildClassName(
    name: string,
    version: string,
    timestamp: number,
  ): string {
    return `${pascalCase(name)}V${version.replace(/\./g, '')}${timestamp}`;
  }

  private buildFileName(
    migrationName: string,
    version: string,
    timestamp: number,
  ): string {
    return `${timestamp}-${version.replace(/\./g, '-')}-${migrationName}.ts`;
  }

  private formatQueryParams(parameters: unknown[] | undefined): string {
    if (!parameters || !parameters.length) {
      return '';
    }

    return `, ${JSON.stringify(parameters)}`;
  }

  private escapeForSingleQuotedString(query: string): string {
    return query.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private buildFastMigrationFileContent(
    className: string,
    version: string,
    upStatements: string[],
    downStatements: string[],
  ): string {
    return `import { MigrationInterface, QueryRunner } from 'typeorm';

import { RegisteredCoreMigration } from 'src/database/typeorm/core/decorators/registered-core-migration.decorator';

@RegisteredCoreMigration('${version}')
export class ${className} implements MigrationInterface {
  name = '${className}';

  public async up(queryRunner: QueryRunner): Promise<void> {
${upStatements.join('\n')}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
${downStatements.join('\n')}
  }
}
`;
  }

  private buildSlowMigrationFileContent(
    className: string,
    version: string,
  ): string {
    return `import { MigrationInterface, QueryRunner } from 'typeorm';

import { RegisteredCoreMigration } from 'src/database/typeorm/core/decorators/registered-core-migration.decorator';

@RegisteredCoreMigration('${version}', { type: 'slow' })
export class ${className} implements MigrationInterface {
  name = '${className}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: implement slow migration
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: implement slow migration rollback
  }
}
`;
  }
}
