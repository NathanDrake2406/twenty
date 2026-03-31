import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

type ClientConfigApiStatus = {
  isLoaded: boolean;
  error?: Error;
};

export const clientConfigApiStatusState =
  createAtomState<ClientConfigApiStatus>({
    key: 'clientConfigApiStatus',
    defaultValue: {
      isLoaded: false,
      error: undefined,
    },
  });
