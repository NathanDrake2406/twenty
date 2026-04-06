import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { DataSource, type MigrationInterface } from 'typeorm';

import {
  type CoreMigrationType,
  getRegisteredCoreMigrationMetadata,
} from 'src/database/typeorm/core/decorators/registered-core-migration.decorator';
import {
  UPGRADE_COMMAND_SUPPORTED_VERSIONS,
  type UpgradeCommandVersion,
} from 'src/engine/constants/upgrade-command-supported-versions.constant';

type MigrationBucket = Record<CoreMigrationType, MigrationInterface[]>;

@Injectable()
export class RegisteredCoreMigrationService implements OnModuleInit {
  private readonly logger = new Logger(RegisteredCoreMigrationService.name);

  private readonly migrationsByVersion = new Map<
    UpgradeCommandVersion,
    MigrationBucket
  >();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    for (const version of UPGRADE_COMMAND_SUPPORTED_VERSIONS) {
      this.migrationsByVersion.set(version, { fast: [], slow: [] });
    }

    // dataSource.migrations is already sorted by timestamp (TypeORM sorts
    // ascending by the 13-digit suffix of the class name)
    for (const migration of this.dataSource.migrations) {
      const metadata = getRegisteredCoreMigrationMetadata(
        migration.constructor,
      );

      if (!metadata) {
        continue;
      }

      const bucket = this.migrationsByVersion.get(metadata.version);

      if (!bucket) {
        continue;
      }

      bucket[metadata.type].push(migration);
    }

    for (const [version, bucket] of this.migrationsByVersion) {
      if (bucket.fast.length > 0) {
        this.logger.log(
          `Registered ${bucket.fast.length} fast versioned migration(s) for ${version}: ${bucket.fast.map((migration) => migration.constructor.name).join(', ')}`,
        );
      }

      if (bucket.slow.length > 0) {
        this.logger.log(
          `Registered ${bucket.slow.length} slow versioned migration(s) for ${version}: ${bucket.slow.map((migration) => migration.constructor.name).join(', ')}`,
        );
      }
    }
  }

  getFastInstanceCommandsForVersion(
    version: UpgradeCommandVersion,
  ): MigrationInterface[] {
    return this.migrationsByVersion.get(version)?.fast ?? [];
  }

  getSlowInstanceCommandsForVersion(
    version: UpgradeCommandVersion,
  ): MigrationInterface[] {
    return this.migrationsByVersion.get(version)?.slow ?? [];
  }
}
