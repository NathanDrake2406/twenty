import 'reflect-metadata';

import { type UpgradeCommandVersion } from 'src/engine/constants/upgrade-command-supported-versions.constant';

const REGISTERED_CORE_MIGRATION_KEY = 'REGISTERED_CORE_MIGRATION';

export type CoreMigrationType = 'fast' | 'slow';

export type RegisteredCoreMigrationMetadata = {
  version: UpgradeCommandVersion;
  type: CoreMigrationType;
};

// When dropping a version from UPGRADE_COMMAND_SUPPORTED_VERSIONS, also
// remove the @RegisteredCoreMigration decorator from its associated migration files.
export const RegisteredCoreMigration =
  (
    version: UpgradeCommandVersion,
    options?: { type: CoreMigrationType },
  ): ClassDecorator =>
  (target) => {
    const metadata: RegisteredCoreMigrationMetadata = {
      version,
      type: options?.type ?? 'fast',
    };

    Reflect.defineMetadata(REGISTERED_CORE_MIGRATION_KEY, metadata, target);
  };

export const getRegisteredCoreMigrationMetadata = (
  target: Function,
): RegisteredCoreMigrationMetadata | undefined =>
  Reflect.getMetadata(REGISTERED_CORE_MIGRATION_KEY, target);
