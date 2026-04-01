import { FormFieldInput } from '@/object-record/record-field/ui/components/FormFieldInput';
import { FormSingleRecordPicker } from '@/object-record/record-field/ui/form-types/components/FormSingleRecordPicker';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { type WorkflowFormAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepCmdEnterButton } from '@/workflow/workflow-steps/components/WorkflowStepCmdEnterButton';
import { useUpdateWorkflowRunStep } from '@/workflow/workflow-steps/hooks/useUpdateWorkflowRunStep';
import { WorkflowFormFieldInput } from '@/workflow/workflow-steps/workflow-actions/components/WorkflowFormFieldInput';
import { useSubmitFormStep } from '@/workflow/workflow-steps/workflow-actions/form-action/hooks/useSubmitFormStep';
import { type WorkflowFormActionField } from '@/workflow/workflow-steps/workflow-actions/form-action/types/WorkflowFormActionField';
import { getDefaultFormFieldSettings } from '@/workflow/workflow-steps/workflow-actions/form-action/utils/getDefaultFormFieldSettings';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useDebouncedCallback } from 'use-debounce';

const StyledWorkflowFormFillerRoot = styled.div`
  box-sizing: border-box;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
`;

const StyledWorkflowFormFillerFields = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  min-width: 0;
  width: 100%;
`;

export type WorkflowEditActionFormFillerProps = {
  action: WorkflowFormAction;
  actionOptions: {
    readonly: boolean;
  };
};

type FormData = WorkflowFormActionField[];

export const WorkflowEditActionFormFiller = ({
  action,
  actionOptions,
}: WorkflowEditActionFormFillerProps) => {
  const { t } = useLingui();
  const { submitFormStep } = useSubmitFormStep();
  const [formData, setFormData] = useState<FormData>(action.settings.input);
  const workflowRunId = useWorkflowRunIdOrThrow();
  const { goBackFromSidePanel } = useSidePanelHistory();
  const { updateWorkflowRunStep } = useUpdateWorkflowRunStep();
  const [error, setError] = useState<string | undefined>(undefined);

  const canSubmit = !actionOptions.readonly && !isDefined(error);

  const onFieldUpdate = ({
    fieldId,
    value,
  }: {
    fieldId: string;
    value: any;
  }) => {
    if (actionOptions.readonly === true) {
      return;
    }

    const updatedFormData = formData.map((field) =>
      field.id === fieldId ? { ...field, value } : field,
    );

    setFormData(updatedFormData);

    saveAction(updatedFormData);
  };

  const saveAction = useDebouncedCallback(async (updatedFormData: FormData) => {
    if (actionOptions.readonly === true) {
      return;
    }

    await updateWorkflowRunStep({
      workflowRunId,
      step: {
        ...action,
        settings: { ...action.settings, input: updatedFormData },
      },
    });
  }, 1_000);

  const onSubmit = async () => {
    const response = formData.reduce(
      (acc, field) => {
        acc[field.name] = field.value;
        return acc;
      },
      {} as Record<string, any>,
    );

    await submitFormStep({
      stepId: action.id,
      workflowRunId,
      response,
    });

    goBackFromSidePanel();
  };

  useEffect(() => {
    return () => {
      saveAction.flush();
    };
  }, [saveAction]);

  return (
    <StyledWorkflowFormFillerRoot>
      <WorkflowStepBody>
        <StyledWorkflowFormFillerFields>
          {formData.map((field) => {
            if (field.type === 'RECORD') {
              const objectNameSingular = field.settings?.objectName;

              if (!isDefined(objectNameSingular)) {
                return null;
              }

              const recordId = field.value?.id;

              return (
                <FormSingleRecordPicker
                  key={field.id}
                  label={field.label}
                  defaultValue={recordId}
                  onChange={(recordId) => {
                    onFieldUpdate({
                      fieldId: field.id,
                      value: {
                        id: recordId,
                      },
                    });
                  }}
                  objectNameSingulars={[objectNameSingular]}
                  disabled={actionOptions.readonly}
                />
              );
            }

            if (field.type === 'SELECT' || field.type === 'MULTI_SELECT') {
              const selectedFieldId = field.settings?.selectedFieldId;

              if (!isDefined(selectedFieldId)) {
                return null;
              }

              return (
                <WorkflowFormFieldInput
                  key={field.id}
                  fieldMetadataId={selectedFieldId}
                  defaultValue={field.value}
                  readonly={actionOptions.readonly}
                  onChange={(value) => {
                    onFieldUpdate({
                      fieldId: field.id,
                      value,
                    });
                  }}
                />
              );
            }

            return (
              <FormFieldInput
                key={field.id}
                defaultValue={field.value}
                field={{
                  label: field.label,
                  type: field.type,
                  metadata: {} as FieldMetadata,
                }}
                onChange={(value) => {
                  onFieldUpdate({
                    fieldId: field.id,
                    value,
                  });
                }}
                onError={(error) => {
                  setError(error);
                }}
                placeholder={
                  isNonEmptyString(field.placeholder)
                    ? field.placeholder
                    : getDefaultFormFieldSettings(field.type).placeholder
                }
                readonly={actionOptions.readonly}
              />
            );
          })}
        </StyledWorkflowFormFillerFields>
      </WorkflowStepBody>
      {!actionOptions.readonly && (
        <SidePanelFooter
          actions={[
            <WorkflowStepCmdEnterButton
              title={t`Submit`}
              onClick={onSubmit}
              disabled={!canSubmit}
            />,
          ]}
        />
      )}
    </StyledWorkflowFormFillerRoot>
  );
};
