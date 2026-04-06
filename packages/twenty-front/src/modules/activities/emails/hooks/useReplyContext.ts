import { useMemo } from 'react';

import { useEmailThread } from '@/activities/emails/hooks/useEmailThread';
import { type ConnectedAccountProvider } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

type ReplyContextLoading = {
  loading: true;
};

export type ReplyContextReady = {
  loading: false;
  to: string;
  subject: string;
  inReplyTo: string;
  connectedAccountId: string;
  connectedAccountProvider: ConnectedAccountProvider;
};

export type ReplyContext = ReplyContextLoading | ReplyContextReady;

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
        return { loading: true };
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
      loading: false,
      to: senderHandle,
      subject,
      inReplyTo: lastMessage.headerMessageId ?? '',
      connectedAccountId,
      connectedAccountProvider,
    };
  }, [
    messages,
    connectedAccountId,
    connectedAccountProvider,
    messageChannelLoading,
    threadLoading,
  ]);
};
