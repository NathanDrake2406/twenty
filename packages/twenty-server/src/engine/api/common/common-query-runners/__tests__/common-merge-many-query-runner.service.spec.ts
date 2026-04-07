import { Test, TestingModule } from '@nestjs/testing';

import { CommonMergeManyQueryRunnerService } from 'src/engine/api/common/common-query-runners/common-merge-many-query-runner.service';
import { ProcessNestedRelationsHelper } from 'src/engine/api/common/common-nested-relations-processor/process-nested-relations.helper';
import { type CommonExtendedQueryRunnerContext } from 'src/engine/api/common/types/common-extended-query-runner-context.type';
import {
  type CommonExtendedInput,
  type MergeManyQueryArgs,
} from 'src/engine/api/common/types/common-query-args.type';
import { WorkspaceQueryHookService } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.service';
import { QueryRunnerArgsFactory } from 'src/engine/api/common/common-args-processors/query-runner-args.factory';
import { DataArgProcessorService } from 'src/engine/api/common/common-args-processors/data-arg-processor/data-arg-processor.service';
import { FilterArgProcessorService } from 'src/engine/api/common/common-args-processors/filter-arg-processor/filter-arg-processor.service';
import { GroupByArgProcessorService } from 'src/engine/api/common/common-args-processors/group-by-arg-processor/group-by-arg-processor.service';
import { OrderByArgProcessorService } from 'src/engine/api/common/common-args-processors/order-by-arg-processor/order-by-arg-processor.service';
import { OrderByWithGroupByArgProcessorService } from 'src/engine/api/common/common-args-processors/order-by-with-group-by-arg-processor/order-by-with-group-by-arg-processor.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { CommonResultGettersService } from 'src/engine/api/common/common-result-getters/common-result-getters.service';
import { ThrottlerService } from 'src/engine/core-modules/throttler/throttler.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';

// Mock utilities that depend on deep metadata structures irrelevant to the behavior under test
jest.mock(
  'src/engine/api/graphql/graphql-query-runner/utils/build-columns-to-select',
  () => ({
    buildColumnsToSelect: () => ({ id: true, name: true, email: true }),
  }),
);

jest.mock(
  'src/engine/api/graphql/graphql-query-runner/utils/build-columns-to-return',
  () => ({
    buildColumnsToReturn: () => ['id', 'name', 'email'],
  }),
);

jest.mock(
  'src/engine/metadata-modules/flat-field-metadata/utils/build-field-maps-from-flat-object-metadata.util',
  () => ({
    buildFieldMapsFromFlatObjectMetadata: () => ({
      fieldIdByName: {},
      fieldByName: {},
    }),
  }),
);

const stubProvider = (token: any) => ({
  provide: token,
  useValue: {},
});

describe('CommonMergeManyQueryRunnerService', () => {
  let service: CommonMergeManyQueryRunnerService;
  let processNestedRelationsHelper: jest.Mocked<ProcessNestedRelationsHelper>;

  const recordA = { id: 'id-a', name: 'Acme', email: 'a@acme.com' };
  const recordB = { id: 'id-b', name: 'Beta', email: '' };

  const makeContext = (
    repositoryRecords: any[],
  ): CommonExtendedQueryRunnerContext =>
    ({
      flatObjectMetadata: {
        id: 'obj-meta-1',
        nameSingular: 'company',
        namePlural: 'companies',
        duplicateCriteria: {},
      },
      flatObjectMetadataMaps: { byUniversalIdentifier: {}, byId: {} },
      flatFieldMetadataMaps: { byUniversalIdentifier: {}, byId: {} },
      repository: {
        find: jest.fn().mockResolvedValue(repositoryRecords),
        createQueryBuilder: jest.fn(),
      },
      authContext: {},
      workspaceDataSource: {},
      rolePermissionConfig: {},
      commonQueryParser: {},
      objectIdByNameSingular: {},
    }) as any;

  const makeArgs = (
    overrides: Partial<CommonExtendedInput<MergeManyQueryArgs>> = {},
  ): CommonExtendedInput<MergeManyQueryArgs> =>
    ({
      ids: [recordA.id, recordB.id],
      conflictPriorityIndex: 0,
      dryRun: true,
      selectedFieldsResult: {
        select: { id: true, name: true, email: true },
        relations: { company: true },
        aggregate: {},
      },
      ...overrides,
    }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonMergeManyQueryRunnerService,
        {
          provide: ProcessNestedRelationsHelper,
          useValue: {
            processNestedRelations: jest.fn().mockResolvedValue(undefined),
          },
        },
        stubProvider(WorkspaceQueryHookService),
        stubProvider(QueryRunnerArgsFactory),
        stubProvider(DataArgProcessorService),
        stubProvider(FilterArgProcessorService),
        stubProvider(GroupByArgProcessorService),
        stubProvider(OrderByArgProcessorService),
        stubProvider(OrderByWithGroupByArgProcessorService),
        stubProvider(GlobalWorkspaceOrmManager),
        stubProvider(PermissionsService),
        stubProvider(WorkspaceCacheService),
        stubProvider(CommonResultGettersService),
        stubProvider(ThrottlerService),
        stubProvider(TwentyConfigService),
        stubProvider(MetricsService),
        stubProvider(FeatureFlagService),
      ],
    }).compile();

    service = module.get(CommonMergeManyQueryRunnerService);
    processNestedRelationsHelper = module.get(ProcessNestedRelationsHelper);
  });

  describe('run (dry-run)', () => {
    it('should return a merged record even when processNestedRelations throws', async () => {
      processNestedRelationsHelper.processNestedRelations.mockRejectedValue(
        new Error('relation loading failed'),
      );

      const context = makeContext([recordA, recordB]);
      const args = makeArgs({ dryRun: true });

      const result = await service.run(args, context);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      // The dry-run record gets a new UUID (not one of the input IDs)
      expect(result.id).not.toBe(recordA.id);
      expect(result.id).not.toBe(recordB.id);
      // deletedAt is set on dry-run records
      expect(result.deletedAt).toBeDefined();
    });

    it('should log a warning when processNestedRelations fails during dry-run', async () => {
      processNestedRelationsHelper.processNestedRelations.mockRejectedValue(
        new Error('relation loading failed'),
      );

      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      const context = makeContext([recordA, recordB]);
      const args = makeArgs({ dryRun: true });

      await service.run(args, context);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('relation loading failed'),
      );
    });

    it('should return a merged record when processNestedRelations succeeds during dry-run', async () => {
      processNestedRelationsHelper.processNestedRelations.mockResolvedValue(
        undefined,
      );

      const context = makeContext([recordA, recordB]);
      const args = makeArgs({ dryRun: true });

      const result = await service.run(args, context);

      expect(result).toBeDefined();
      expect(result.id).not.toBe(recordA.id);
      expect(result.deletedAt).toBeDefined();
    });
  });
});
