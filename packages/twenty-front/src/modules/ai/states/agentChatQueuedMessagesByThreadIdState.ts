import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export type QueuedMessage = {
  text: string;
};

export const agentChatQueuedMessagesByThreadIdState = createAtomState<
  Record<string, QueuedMessage[]>
>({
  key: 'ai/agentChatQueuedMessagesByThreadIdState',
  defaultValue: {},
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
});
