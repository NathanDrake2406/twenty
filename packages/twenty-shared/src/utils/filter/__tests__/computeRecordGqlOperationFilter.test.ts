import { computeRecordGqlOperationFilter } from '../computeRecordGqlOperationFilter';
import type { RecordFilter } from '../turnRecordFilterGroupIntoGqlOperationFilter';

import { FieldMetadataType } from '@/types/FieldMetadataType';
import type { PartialFieldMetadataItem } from '@/types/PartialFieldMetadataItem';
import { ViewFilterOperand } from '@/types/ViewFilterOperand';

const matchNothingFilter = {
  and: [{ id: { is: 'NULL' } }, { id: { is: 'NOT_NULL' } }],
};

describe('computeRecordGqlOperationFilter', () => {
  it('should match Is UUID', () => {
    const companyIdField: PartialFieldMetadataItem = {
      id: 'company-id-field',
      name: 'id',
      label: 'ID',
      type: FieldMetadataType.UUID,
    };

    const uuidValue = '4f83d5c0-7c7a-4f67-9f29-0a6aad1f4eb1';

    const recordFilters: RecordFilter[] = [
      {
        id: 'uuid-filter',
        fieldMetadataId: companyIdField.id,
        value: uuidValue,
        type: 'UUID',
        operand: ViewFilterOperand.IS,
      },
    ];

    const filter = computeRecordGqlOperationFilter({
      fields: [companyIdField],
      recordFilters,
      recordFilterGroups: [],
      filterValueDependencies: {
        timeZone: 'UTC',
      },
    });

    expect(filter).toEqual({
      id: {
        in: [uuidValue],
      },
    });
  });

  describe('should return match-nothing filter instead of dropping empty filter conditions', () => {
    it('should not drop RELATION filter when selectedRecordIds is empty', () => {
      const retreatField: PartialFieldMetadataItem = {
        id: 'retreat-field',
        name: 'retreat',
        label: 'Retreat',
        type: FieldMetadataType.RELATION,
      };

      const statusField: PartialFieldMetadataItem = {
        id: 'status-field',
        name: 'status',
        label: 'Status',
        type: FieldMetadataType.SELECT,
      };

      const recordFilters: RecordFilter[] = [
        {
          id: 'relation-filter',
          fieldMetadataId: retreatField.id,
          value: JSON.stringify({
            isCurrentWorkspaceMemberSelected: false,
            selectedRecordIds: [],
          }),
          type: 'RELATION',
          operand: ViewFilterOperand.IS,
        },
        {
          id: 'status-filter',
          fieldMetadataId: statusField.id,
          value: JSON.stringify(['PAID']),
          type: 'SELECT',
          operand: ViewFilterOperand.IS,
        },
      ];

      const filter = computeRecordGqlOperationFilter({
        fields: [retreatField, statusField],
        recordFilters,
        recordFilterGroups: [],
        filterValueDependencies: {
          timeZone: 'UTC',
        },
      });

      expect(filter).toEqual({
        and: [
          matchNothingFilter,
          { status: { in: ['PAID'] } },
        ],
      });
    });

    it('should not drop RELATION filter when value is an invalid UUID', () => {
      const retreatField: PartialFieldMetadataItem = {
        id: 'retreat-field',
        name: 'retreat',
        label: 'Retreat',
        type: FieldMetadataType.RELATION,
      };

      const recordFilters: RecordFilter[] = [
        {
          id: 'relation-filter',
          fieldMetadataId: retreatField.id,
          value: '',
          type: 'RELATION',
          operand: ViewFilterOperand.IS,
        },
      ];

      const filter = computeRecordGqlOperationFilter({
        fields: [retreatField],
        recordFilters,
        recordFilterGroups: [],
        filterValueDependencies: {
          timeZone: 'UTC',
        },
      });

      // Empty string value should be skipped by checkIfShouldSkipFiltering
      expect(filter).toEqual({});
    });

    it('should not drop UUID filter when value resolves to empty', () => {
      const idField: PartialFieldMetadataItem = {
        id: 'id-field',
        name: 'id',
        label: 'ID',
        type: FieldMetadataType.UUID,
      };

      const recordFilters: RecordFilter[] = [
        {
          id: 'uuid-filter',
          fieldMetadataId: idField.id,
          value: 'not-a-valid-uuid',
          type: 'UUID',
          operand: ViewFilterOperand.IS,
        },
      ];

      const filter = computeRecordGqlOperationFilter({
        fields: [idField],
        recordFilters,
        recordFilterGroups: [],
        filterValueDependencies: {
          timeZone: 'UTC',
        },
      });

      expect(filter).toEqual(matchNothingFilter);
    });

    it('should not drop SELECT filter when options resolve to empty', () => {
      const statusField: PartialFieldMetadataItem = {
        id: 'status-field',
        name: 'status',
        label: 'Status',
        type: FieldMetadataType.SELECT,
      };

      const recordFilters: RecordFilter[] = [
        {
          id: 'select-filter',
          fieldMetadataId: statusField.id,
          value: JSON.stringify([]),
          type: 'SELECT',
          operand: ViewFilterOperand.IS,
        },
      ];

      const filter = computeRecordGqlOperationFilter({
        fields: [statusField],
        recordFilters,
        recordFilterGroups: [],
        filterValueDependencies: {
          timeZone: 'UTC',
        },
      });

      expect(filter).toEqual(matchNothingFilter);
    });

    it('should not drop MULTI_SELECT filter when options resolve to empty', () => {
      const tagsField: PartialFieldMetadataItem = {
        id: 'tags-field',
        name: 'tags',
        label: 'Tags',
        type: FieldMetadataType.MULTI_SELECT,
      };

      const recordFilters: RecordFilter[] = [
        {
          id: 'multiselect-filter',
          fieldMetadataId: tagsField.id,
          value: JSON.stringify([]),
          type: 'MULTI_SELECT',
          operand: ViewFilterOperand.CONTAINS,
        },
      ];

      const filter = computeRecordGqlOperationFilter({
        fields: [tagsField],
        recordFilters,
        recordFilterGroups: [],
        filterValueDependencies: {
          timeZone: 'UTC',
        },
      });

      expect(filter).toEqual(matchNothingFilter);
    });
  });
});
