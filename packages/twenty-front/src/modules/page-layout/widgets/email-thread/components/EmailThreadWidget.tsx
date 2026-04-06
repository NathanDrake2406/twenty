import { styled } from '@linaria/react';
import { useCallback, useState } from 'react';

import { CustomResolverFetchMoreLoader } from '@/activities/components/CustomResolverFetchMoreLoader';
import { EmailComposer } from '@/activities/emails/components/EmailComposer';
import { EmailLoader } from '@/activities/emails/components/EmailLoader';
import { EmailThreadMessage } from '@/activities/emails/components/EmailThreadMessage';
import { useEmailThread } from '@/activities/emails/hooks/useEmailThread';
import { useReplyContext } from '@/activities/emails/hooks/useReplyContext';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { EmailThreadIntermediaryMessages } from '@/page-layout/widgets/email-thread/components/EmailThreadIntermediaryMessages';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { t } from '@lingui/core/macro';
import { IconArrowBackUp } from 'twenty-ui/display';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const StyledReplyBar = styled.button`
  align-items: center;
  all: unset;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.secondary};
  }
`;

type EmailThreadWidgetProps = {
  widget: PageLayoutWidget;
};

export const EmailThreadWidget = ({
  widget: _widget,
}: EmailThreadWidgetProps) => {
  const targetRecord = useTargetRecord();

  const { thread, messages, fetchMoreMessages, threadLoading } = useEmailThread(
    targetRecord.id,
  );

  const replyContext = useReplyContext(targetRecord.id);

  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const handleReplySent = useCallback(() => {
    setIsComposerOpen(false);
  }, []);

  const messagesCount = messages.length;
  const is5OrMoreMessages = messagesCount >= 5;
  const firstMessages = messages.slice(
    0,
    is5OrMoreMessages ? 2 : messagesCount - 1,
  );
  const intermediaryMessages = is5OrMoreMessages
    ? messages.slice(2, messagesCount - 1)
    : [];
  const lastMessage = messages[messagesCount - 1];

  if (threadLoading || !thread || !messages.length) {
    return (
      <StyledWrapper>
        <StyledContainer>
          <EmailLoader loadingText={t`Loading thread`} />
        </StyledContainer>
      </StyledWrapper>
    );
  }

  const canReply = isDefined(replyContext) && !replyContext.loading;

  return (
    <StyledWrapper>
      <StyledContainer>
        {firstMessages.map((message) => (
          <EmailThreadMessage
            key={message.id}
            sender={message.sender}
            participants={message.messageParticipants}
            body={message.text}
            sentAt={message.receivedAt}
          />
        ))}
        <EmailThreadIntermediaryMessages messages={intermediaryMessages} />
        <EmailThreadMessage
          key={lastMessage.id}
          sender={lastMessage.sender}
          participants={lastMessage.messageParticipants}
          body={lastMessage.text}
          sentAt={lastMessage.receivedAt}
          isExpanded
        />
        <CustomResolverFetchMoreLoader
          loading={threadLoading}
          onLastRowVisible={fetchMoreMessages}
        />
      </StyledContainer>
      {canReply &&
        (isComposerOpen ? (
          <EmailComposer
            connectedAccountId={replyContext.connectedAccountId}
            defaultTo={replyContext.to}
            defaultSubject={replyContext.subject}
            defaultInReplyTo={replyContext.inReplyTo}
            onClose={() => setIsComposerOpen(false)}
            onSent={handleReplySent}
          />
        ) : (
          <StyledReplyBar onClick={() => setIsComposerOpen(true)}>
            <IconArrowBackUp size={16} />
            {t`Reply...`}
          </StyledReplyBar>
        ))}
    </StyledWrapper>
  );
};
