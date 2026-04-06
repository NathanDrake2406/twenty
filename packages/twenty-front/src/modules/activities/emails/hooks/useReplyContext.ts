import { useMemo } from 'react';

import { useEmailThread } from '@/activities/emails/hooks/useEmailThread';
import { type ConnectedAccountProvider } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export type ReplyContext = {
  to: string;
  subject: string;
  inReplyTo: string;
  connectedAccountId: string;
  connectedAccountProvider: ConnectedAccountProvider;
  loading: boolean;
};

export const useReplyContext = (
  threadId: string | null,
): ReplyContext | null => {
  const {
    messages,
    connectedAccountId,
    connectedAccountProvider,
    messageChannelLoading,
    threadLoading,
  } = useEmailThread(threadId);

  return useMemo(() => {
    if (
      !isDefined(connectedAccountId) ||
      !isDefined(connectedAccountProvider)
    ) {
      if (messageChannelLoading || threadLoading) {
        return {
          to: '',
          subject: '',
          inReplyTo: '',
          connectedAccountId: '',
          connectedAccountProvider:
            '' as unknown as ConnectedAccountProvider,
          loading: true,
        };
      }

      return null;
    }

    const lastMessage = messages[messages.length - 1];

    if (!isDefined(lastMessage)) {
      return null;
    }

    const senderHandle = lastMessage.sender?.handle ?? '';

    const rawSubject = lastMessage.subject ?? '';
    const subject = rawSubject.startsWith('Re: ')
      ? rawSubject
      : `Re: ${rawSubject}`;

    return {
      to: senderHandle,
      subject,
      inReplyTo: lastMessage.headerMessageId ?? '',
      connectedAccountId,
      connectedAccountProvider,
      loading: messageChannelLoading || threadLoading,
    };
  }, [
    messages,
    connectedAccountId,
    connectedAccountProvider,
    messageChannelLoading,
    threadLoading,
  ]);
};
