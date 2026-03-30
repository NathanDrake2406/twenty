import { styled } from '@linaria/react';

import { agentChatQueuedMessagesByThreadIdState } from '@/ai/states/agentChatQueuedMessagesByThreadIdState';
import { currentAIChatThreadState } from '@/ai/states/currentAIChatThreadState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { isDefined } from 'twenty-shared/utils';
import { IconX } from 'twenty-ui/display';
import { LightIconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledQueueContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledQueueLabel = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  padding-left: ${themeCssVariables.spacing[1]};
`;

const StyledQueuedItem = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledQueuedText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const AIChatQueuedMessages = () => {
  const currentAIChatThread = useAtomStateValue(currentAIChatThreadState);
  const agentChatQueuedMessagesByThreadId = useAtomStateValue(
    agentChatQueuedMessagesByThreadIdState,
  );
  const setAgentChatQueuedMessagesByThreadId = useSetAtomState(
    agentChatQueuedMessagesByThreadIdState,
  );

  if (!isDefined(currentAIChatThread)) {
    return null;
  }

  const queuedMessages =
    agentChatQueuedMessagesByThreadId[currentAIChatThread] ?? [];

  if (queuedMessages.length === 0) {
    return null;
  }

  const handleRemove = (index: number) => {
    setAgentChatQueuedMessagesByThreadId((prev) => ({
      ...prev,
      [currentAIChatThread]: (prev[currentAIChatThread] ?? []).filter(
        (_, i) => i !== index,
      ),
    }));
  };

  return (
    <StyledQueueContainer>
      <StyledQueueLabel>{queuedMessages.length} Queued</StyledQueueLabel>
      {queuedMessages.map((message, index) => (
        <StyledQueuedItem key={index}>
          <StyledQueuedText>{message.text}</StyledQueuedText>
          <LightIconButton
            Icon={IconX}
            onClick={() => handleRemove(index)}
            size="small"
          />
        </StyledQueuedItem>
      ))}
    </StyledQueueContainer>
  );
};
