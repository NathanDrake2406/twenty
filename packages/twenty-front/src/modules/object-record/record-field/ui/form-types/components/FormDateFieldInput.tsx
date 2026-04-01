import { FormFieldInputContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputContainer';
import { FormFieldInputInnerContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputInnerContainer';
import { FormFieldInputRowContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';
import { VariableChipStandalone } from '@/object-record/record-field/ui/form-types/components/VariableChipStandalone';
import { type VariablePickerComponent } from '@/object-record/record-field/ui/form-types/types/VariablePickerComponent';
import { InputHint } from '@/ui/input/components/InputHint';
import { InputLabel } from '@/ui/input/components/InputLabel';
import { DatePicker } from '@/ui/input/components/internal/date/components/DatePicker';
import { DatePickerInput } from '@/ui/input/components/internal/date/components/DatePickerInput';
import {
  MONTH_AND_YEAR_DROPDOWN_MONTH_SELECT_ID,
  MONTH_AND_YEAR_DROPDOWN_YEAR_SELECT_ID,
} from '@/ui/input/components/internal/date/components/DateTimePicker';

import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { OverlayContainer } from '@/ui/layout/overlay/components/OverlayContainer';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { useListenClickOutside } from '@/ui/utilities/pointer-event/hooks/useListenClickOutside';
import { isStandaloneVariableString } from '@/workflow/utils/isStandaloneVariableString';
import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { useId, useRef, useState } from 'react';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { type Nullable } from 'twenty-ui/utilities';

const StyledInputContainerWrapper = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 0;
  min-width: 0;
  overflow: visible;
  position: relative;
  width: 100%;
`;

const StyledDateInputAbsoluteContainer = styled.div`
  position: absolute;
  top: ${themeCssVariables.spacing[1]};
`;

const StyledDateInputTextContainer = styled.div`
  align-items: center;
  display: flex;
  min-width: 0;
  width: 100%;
`;

const StyledDateInputContainer = styled.div`
  position: relative;
  z-index: 1;
`;

type DraftValue =
  | {
      type: 'static';
      value: string | null;
      mode: 'view' | 'edit';
    }
  | {
      type: 'variable';
      value: string;
    };

type FormDateFieldInputProps = {
  defaultValue: string | undefined;
  error?: string;
  label?: string;
  onChange: (value: string | null) => void;
  onError?: (error: string | undefined) => void;
  placeholder?: string;
  readonly?: boolean;
  VariablePicker?: VariablePickerComponent;
};

export const FormDateFieldInput = ({
  defaultValue,
  error: errorFromProps,
  label,
  onChange,
  onError,
  placeholder: _placeholder,
  readonly,
  VariablePicker,
}: FormDateFieldInputProps) => {
  const instanceId = useId();

  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );

  const [draftValue, setDraftValue] = useState<DraftValue>(
    isStandaloneVariableString(defaultValue)
      ? {
          type: 'variable',
          value: defaultValue,
        }
      : {
          type: 'static',
          value: defaultValue ?? null,
          mode: 'view',
        },
  );

  const draftValueAsDate =
    isDefined(draftValue.value) &&
    isNonEmptyString(draftValue.value) &&
    draftValue.type === 'static'
      ? draftValue.value
      : null;

  const [pickerDate, setPickerDate] =
    useState<Nullable<string>>(draftValueAsDate);

  const datePickerWrapperRef = useRef<HTMLDivElement>(null);

  const persistDate = (newDate: Nullable<string>) => {
    if (!isDefined(newDate)) {
      onChange(null);
    } else {
      onChange(newDate);
    }
  };

  const { closeDropdown: closeDropdownMonthSelect } = useCloseDropdown();
  const { closeDropdown: closeDropdownYearSelect } = useCloseDropdown();

  const displayDatePicker =
    draftValue.type === 'static' && draftValue.mode === 'edit';

  useListenClickOutside({
    refs: [datePickerWrapperRef],
    listenerId: 'FormDateTimeFieldInputBase',
    callback: (event) => {
      event.stopImmediatePropagation();

      closeDropdownYearSelect(MONTH_AND_YEAR_DROPDOWN_YEAR_SELECT_ID);
      closeDropdownMonthSelect(MONTH_AND_YEAR_DROPDOWN_MONTH_SELECT_ID);
      handlePickerClickOutside();
    },
    enabled: displayDatePicker,
    excludedClickOutsideIds: [
      MONTH_AND_YEAR_DROPDOWN_MONTH_SELECT_ID,
      MONTH_AND_YEAR_DROPDOWN_YEAR_SELECT_ID,
    ],
  });

  const handlePickerChange = (newDate: Nullable<string>) => {
    setErrorMessage(undefined);
    onError?.(undefined);

    setDraftValue({
      type: 'static',
      mode: 'edit',
      value: newDate ?? null,
    });

    setPickerDate(newDate);

    persistDate(newDate);
  };

  const handlePickerEnter = () => {};

  const handlePickerEscape = () => {
    setDraftValue({
      type: 'static',
      value: draftValue.value,
      mode: 'view',
    });
  };

  const handlePickerClickOutside = () => {
    setDraftValue({
      type: 'static',
      value: draftValue.value,
      mode: 'view',
    });
  };

  const handlePickerClear = () => {
    setErrorMessage(undefined);
    onError?.(undefined);

    setDraftValue({
      type: 'static',
      value: null,
      mode: 'view',
    });

    setPickerDate(null);

    persistDate(null);
  };

  const handlePickerMouseSelect = (newDate: Nullable<string>) => {
    setErrorMessage(undefined);
    onError?.(undefined);

    setDraftValue({
      type: 'static',
      value: newDate ?? null,
      mode: 'view',
    });

    setPickerDate(newDate);

    persistDate(newDate);
  };

  const handleInputFocus = () => {
    setDraftValue({
      type: 'static',
      mode: 'edit',
      value: draftValue.value,
    });
  };

  const handleMaskedDateChange = (newPlainDate: string | null) => {
    setErrorMessage(undefined);
    onError?.(undefined);

    if (!isDefined(newPlainDate)) {
      handlePickerClear();
      return;
    }

    setDraftValue({
      type: 'static',
      mode: 'edit',
      value: newPlainDate,
    });

    setPickerDate(newPlainDate);

    persistDate(newPlainDate);
  };

  const handleVariableTagInsert = (variableName: string) => {
    setErrorMessage(undefined);
    onError?.(undefined);

    setDraftValue({
      type: 'variable',
      value: variableName,
    });

    onChange(variableName);
  };

  const handleUnlinkVariable = () => {
    setErrorMessage(undefined);
    onError?.(undefined);

    setDraftValue({
      type: 'static',
      value: null,
      mode: 'view',
    });

    setPickerDate(null);

    onChange(null);
  };

  const error = errorMessage ?? errorFromProps;

  useHotkeysOnFocusedElement({
    keys: [Key.Escape],
    callback: handlePickerEscape,
    focusId: instanceId,
    dependencies: [handlePickerEscape],
  });

  return (
    <FormFieldInputContainer>
      {label ? <InputLabel>{label}</InputLabel> : null}

      <FormFieldInputRowContainer>
        <StyledInputContainerWrapper ref={datePickerWrapperRef}>
          <FormFieldInputInnerContainer
            formFieldInputInstanceId={instanceId}
            hasRightElement={isDefined(VariablePicker) && !readonly}
          >
            {draftValue.type === 'static' ? (
              <>
                <StyledDateInputTextContainer>
                  <DatePickerInput
                    date={pickerDate ?? null}
                    hasError={isDefined(error)}
                    onChange={handleMaskedDateChange}
                    onFocus={handleInputFocus}
                    readonly={readonly}
                  />
                </StyledDateInputTextContainer>
                {draftValue.mode === 'edit' ? (
                  <StyledDateInputContainer>
                    <StyledDateInputAbsoluteContainer>
                      <OverlayContainer>
                        <DatePicker
                          instanceId={instanceId}
                          plainDateString={pickerDate}
                          onChange={handlePickerChange}
                          onClose={handlePickerMouseSelect}
                          onEnter={handlePickerEnter}
                          onEscape={handlePickerEscape}
                          onClear={handlePickerClear}
                          hideHeaderInput
                        />
                      </OverlayContainer>
                    </StyledDateInputAbsoluteContainer>
                  </StyledDateInputContainer>
                ) : null}
              </>
            ) : (
              <VariableChipStandalone
                rawVariableName={draftValue.value}
                onRemove={readonly ? undefined : handleUnlinkVariable}
              />
            )}
          </FormFieldInputInnerContainer>
        </StyledInputContainerWrapper>

        {VariablePicker && !readonly ? (
          <VariablePicker
            instanceId={instanceId}
            onVariableSelect={handleVariableTagInsert}
          />
        ) : null}
      </FormFieldInputRowContainer>

      {error ? <InputHint danger>{error}</InputHint> : null}
    </FormFieldInputContainer>
  );
};
