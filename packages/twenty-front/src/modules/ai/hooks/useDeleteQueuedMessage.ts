import { useCallback } from 'react';

import { AGENT_CHAT_REFETCH_MESSAGES_EVENT_NAME } from '@/ai/constants/AgentChatRefetchMessagesEventName';
import { useAuthenticatedAgentChatFetch } from '@/ai/hooks/useAuthenticatedAgentChatFetch';
import { dispatchBrowserEvent } from '@/browser-event/utils/dispatchBrowserEvent';

export const useDeleteQueuedMessage = () => {
  const { authenticatedFetch } = useAuthenticatedAgentChatFetch();

  const deleteQueuedMessage = useCallback(
    async (threadId: string, messageId: string) => {
      const response = await authenticatedFetch(
        `/agent-chat/${threadId}/queue/${messageId}`,
        { method: 'DELETE' },
      );

      if (response?.ok) {
        dispatchBrowserEvent(AGENT_CHAT_REFETCH_MESSAGES_EVENT_NAME);
      }
    },
    [authenticatedFetch],
  );

  return { deleteQueuedMessage };
};
