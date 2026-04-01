import { useCallback, useEffect, useRef } from 'react';

import { readUIMessageStream, type UIMessageChunk } from 'ai';
import { print, type ExecutionResult } from 'graphql';
import { useStore } from 'jotai';
import {
  type AgentChatSubscriptionEvent,
  type ExtendedUIMessage,
} from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';

import { AGENT_CHAT_INSTANCE_ID } from '@/ai/constants/AgentChatInstanceId';
import { AGENT_CHAT_REFETCH_MESSAGES_EVENT_NAME } from '@/ai/constants/AgentChatRefetchMessagesEventName';
import { ON_AGENT_CHAT_EVENT } from '@/ai/graphql/subscriptions/OnAgentChatEvent';
import { agentChatErrorState } from '@/ai/states/agentChatErrorState';
import { agentChatIsStreamingState } from '@/ai/states/agentChatIsStreamingState';
import { agentChatMessagesComponentFamilyState } from '@/ai/states/agentChatMessagesComponentFamilyState';
import { agentChatUsageState } from '@/ai/states/agentChatUsageState';
import { currentAIChatThreadTitleState } from '@/ai/states/currentAIChatThreadTitleState';
import { dispatchBrowserEvent } from '@/browser-event/utils/dispatchBrowserEvent';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { sseClientState } from '@/sse-db-event/states/sseClientState';

const THROTTLE_MS = 100;

type AgentChatEventPayload = {
  onAgentChatEvent: {
    threadId: string;
    event: AgentChatSubscriptionEvent;
  };
};

export const useAgentChatSubscription = (threadId: string | null) => {
  const store = useStore();
  const sseClient = useAtomStateValue(sseClientState);
  // These refs hold imperative handles (subscription dispose, stream writer)
  // and a non-reactive flag mirroring the atom to avoid stale closures in
  // the async stream loop — they are not used for rendering state.
  // oxlint-disable-next-line twenty/no-state-useref
  const disposeRef = useRef<(() => void) | null>(null);
  // oxlint-disable-next-line twenty/no-state-useref
  const writerRef = useRef<WritableStreamDefaultWriter<UIMessageChunk> | null>(
    null,
  );
  // oxlint-disable-next-line twenty/no-state-useref
  const isStreamingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (writerRef.current) {
      writerRef.current.close().catch(() => {});
      writerRef.current = null;
    }
    if (disposeRef.current) {
      disposeRef.current();
      disposeRef.current = null;
    }
    if (isStreamingRef.current) {
      isStreamingRef.current = false;
      store.set(agentChatIsStreamingState.atom, false);
    }
  }, [store]);

  useEffect(() => {
    if (!isDefined(threadId)) {
      cleanup();

      return;
    }

    if (!isDefined(sseClient)) {
      return;
    }

    let bridge: TransformStream<UIMessageChunk> | null = null;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let latestMessage: ExtendedUIMessage | null = null;

    const flushToAtom = () => {
      const messageToFlush = latestMessage;

      if (!isDefined(messageToFlush) || !isDefined(threadId)) {
        return;
      }

      const atomKey = {
        instanceId: AGENT_CHAT_INSTANCE_ID,
        familyKey: { threadId },
      };

      const currentMessages = store.get(
        agentChatMessagesComponentFamilyState.atomFamily(atomKey),
      );

      // Find and replace the streaming assistant message by ID, or append it.
      // This preserves optimistic user messages that aren't yet in fetched data.
      const streamingMsgIndex = currentMessages.findIndex(
        (message) => message.id === messageToFlush.id,
      );

      if (streamingMsgIndex >= 0) {
        const updatedMessages = [...currentMessages];

        updatedMessages[streamingMsgIndex] = messageToFlush;
        store.set(
          agentChatMessagesComponentFamilyState.atomFamily(atomKey),
          updatedMessages,
        );
      } else {
        store.set(agentChatMessagesComponentFamilyState.atomFamily(atomKey), [
          ...currentMessages,
          messageToFlush,
        ]);
      }
    };

    const scheduleAtomUpdate = (message: ExtendedUIMessage) => {
      latestMessage = message;

      if (!isDefined(throttleTimer)) {
        // Leading edge: flush immediately so the first chunk renders instantly
        flushToAtom();

        // Then suppress further flushes for THROTTLE_MS
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          // Trailing edge: flush whatever accumulated during the window
          flushToAtom();
        }, THROTTLE_MS);
      }
    };

    const startReadLoop = async (readable: ReadableStream<UIMessageChunk>) => {
      const messageStream = readUIMessageStream({ stream: readable });

      for await (const message of messageStream) {
        const extendedMessage = message as ExtendedUIMessage;

        // Extract usage and title from data parts
        const titlePart = extendedMessage.parts.find(
          (part) => part.type === 'data-thread-title',
        );

        if (isDefined(titlePart) && titlePart.type === 'data-thread-title') {
          store.set(currentAIChatThreadTitleState.atom, titlePart.data.title);
        }

        const metadata = extendedMessage.metadata as
          | {
              usage?: {
                inputTokens: number;
                outputTokens: number;
                cachedInputTokens: number;
                inputCredits: number;
                outputCredits: number;
                conversationSize: number;
              };
              model?: {
                contextWindowTokens: number;
              };
            }
          | undefined;

        if (isDefined(metadata?.usage) && isDefined(metadata?.model)) {
          const usage = metadata.usage;
          const model = metadata.model;

          store.set(agentChatUsageState.atom, (prev) => ({
            lastMessage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              cachedInputTokens: usage.cachedInputTokens,
              inputCredits: usage.inputCredits,
              outputCredits: usage.outputCredits,
            },
            conversationSize: usage.conversationSize,
            contextWindowTokens: model.contextWindowTokens,
            inputTokens: (prev?.inputTokens ?? 0) + usage.inputTokens,
            outputTokens: (prev?.outputTokens ?? 0) + usage.outputTokens,
            inputCredits: (prev?.inputCredits ?? 0) + usage.inputCredits,
            outputCredits: (prev?.outputCredits ?? 0) + usage.outputCredits,
          }));
        }

        scheduleAtomUpdate(extendedMessage);
      }

      // Stream finished -- flush last message immediately
      if (isDefined(throttleTimer)) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      flushToAtom();

      isStreamingRef.current = false;
      store.set(agentChatIsStreamingState.atom, false);
    };

    const handleEvent = (event: AgentChatSubscriptionEvent) => {
      switch (event.type) {
        case 'stream-chunk': {
          if (!isStreamingRef.current) {
            isStreamingRef.current = true;
            store.set(agentChatIsStreamingState.atom, true);

            bridge = new TransformStream<UIMessageChunk>();
            writerRef.current = bridge.writable.getWriter();

            startReadLoop(bridge.readable).catch(() => {
              isStreamingRef.current = false;
              store.set(agentChatIsStreamingState.atom, false);
            });
          }

          if (isDefined(writerRef.current)) {
            writerRef.current
              .write(event.chunk as UIMessageChunk)
              .catch(() => {});
          }
          break;
        }

        case 'message-persisted': {
          // Close the current stream writer so readUIMessageStream finishes
          if (isDefined(writerRef.current)) {
            writerRef.current.close().catch(() => {});
            writerRef.current = null;
          }

          dispatchBrowserEvent(AGENT_CHAT_REFETCH_MESSAGES_EVENT_NAME);
          break;
        }

        case 'queue-updated': {
          dispatchBrowserEvent(AGENT_CHAT_REFETCH_MESSAGES_EVENT_NAME);
          break;
        }

        case 'stream-error': {
          const streamError = new Error(event.message) as Error & {
            code?: string;
          };

          streamError.code = event.code;
          store.set(agentChatErrorState.atom, streamError);

          if (isDefined(writerRef.current)) {
            writerRef.current.close().catch(() => {});
            writerRef.current = null;
          }

          isStreamingRef.current = false;
          store.set(agentChatIsStreamingState.atom, false);
          break;
        }
      }
    };

    const dispose = sseClient.subscribe<AgentChatEventPayload>(
      {
        query: print(ON_AGENT_CHAT_EVENT),
        variables: { threadId },
      },
      {
        next: (value: ExecutionResult<AgentChatEventPayload>) => {
          if (isDefined(value.data?.onAgentChatEvent?.event)) {
            handleEvent(
              value.data.onAgentChatEvent.event as AgentChatSubscriptionEvent,
            );
          }
        },
        error: () => {
          // graphql-sse handles reconnection automatically
        },
        complete: () => {
          cleanup();
        },
      },
    );

    disposeRef.current = dispose;

    return () => {
      if (isDefined(throttleTimer)) {
        clearTimeout(throttleTimer);
      }
      cleanup();
    };
  }, [threadId, sseClient, store, cleanup]);
};
