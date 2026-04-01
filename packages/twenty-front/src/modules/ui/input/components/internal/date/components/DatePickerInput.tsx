import { styled } from '@linaria/react';
import { useEffect, useState } from 'react';
import { useIMask } from 'react-imask';

import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { DATE_BLOCKS } from '@/ui/input/components/internal/date/constants/DateBlocks';
import { MAX_DATE } from '@/ui/input/components/internal/date/constants/MaxDate';
import { MIN_DATE } from '@/ui/input/components/internal/date/constants/MinDate';
import { useParseDateInputStringToJSDate } from '@/ui/input/components/internal/date/hooks/useParseDateInputStringToJSDate';
import { useParsePlainDateToDateInputString } from '@/ui/input/components/internal/date/hooks/useParsePlainDateToDateInputString';
import { getDateMask } from '@/ui/input/components/internal/date/utils/getDateMask';

import { useParseDateInputStringToPlainDate } from '@/ui/input/components/internal/date/hooks/useParseDateInputStringToPlainDate';
import { useParseJSDateToIMaskDateInputString } from '@/ui/input/components/internal/date/hooks/useParseJSDateToIMaskDateInputString';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledInputContainer = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-top-left-radius: ${themeCssVariables.border.radius.md};
  border-top-right-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  height: ${themeCssVariables.spacing[8]};
  min-width: 0;
  width: 100%;
`;

const StyledInput = styled.input<{ hasError?: boolean }>`
  background: transparent;
  border: none;
  color: ${({ hasError }) =>
    hasError
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.primary};
  flex: 1 1 auto;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: 500;
  min-width: 0;
  outline: none;
  padding: 4px 8px 4px 8px;
  width: 100%;

  &:disabled {
    color: ${themeCssVariables.font.color.tertiary};
  }
`;

type DatePickerInputProps = {
  date: string | null;
  hasError?: boolean;
  onChange?: (date: string | null) => void;
  onFocus?: () => void;
  readonly?: boolean;
};

export const DatePickerInput = ({
  date,
  hasError,
  onChange,
  onFocus,
  readonly,
}: DatePickerInputProps) => {
  const { dateFormat } = useDateTimeFormat();

  const [internalDate, setInternalDate] = useState(date);

  const { parseDateInputStringToPlainDate } =
    useParseDateInputStringToPlainDate();
  const { parseDateInputStringToJSDate } = useParseDateInputStringToJSDate();
  const { parsePlainDateToDateInputString } =
    useParsePlainDateToDateInputString();

  const { parseIMaskJSDateIMaskDateInputString } =
    useParseJSDateToIMaskDateInputString();

  const parseIMaskDateInputStringToJSDate = (newDateAsString: string) => {
    const newDate = parseDateInputStringToJSDate(newDateAsString);

    return newDate;
  };

  const pattern = getDateMask(dateFormat);
  const blocks = DATE_BLOCKS;

  const defaultValue = internalDate
    ? (parsePlainDateToDateInputString(internalDate) ?? undefined)
    : undefined;

  const { ref, setValue } = useIMask(
    {
      mask: Date,
      pattern,
      blocks,
      min: MIN_DATE,
      max: MAX_DATE,
      format: (dateValue: unknown) =>
        isDefined(dateValue) && dateValue instanceof Date
          ? parseIMaskJSDateIMaskDateInputString(dateValue)
          : '',
      parse: parseIMaskDateInputStringToJSDate,
      lazy: false,
      autofix: true,
    },
    {
      defaultValue,
      onComplete: (newValue) => {
        const parsedDate = parseDateInputStringToPlainDate(newValue);

        onChange?.(isDefined(parsedDate) ? parsedDate : null);
      },
    },
  );

  useEffect(() => {
    if (date === internalDate) {
      return;
    }

    setInternalDate(date);

    if (isDefined(date)) {
      setValue(parsePlainDateToDateInputString(date));
    } else {
      setValue('');
    }
  }, [date, internalDate, parsePlainDateToDateInputString, setValue]);

  const shouldDisplayReadOnly = readonly === true;

  return (
    <StyledInputContainer>
      <StyledInput
        disabled={shouldDisplayReadOnly}
        hasError={hasError}
        type="text"
        ref={ref as any}
        onFocus={!shouldDisplayReadOnly ? onFocus : undefined}
      />
    </StyledInputContainer>
  );
};
