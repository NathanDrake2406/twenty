import { useClientConfig } from '@/client-config/hooks/useClientConfig';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useEffect } from 'react';

export const ClientConfigProviderEffect = () => {
  const { isLoaded } = useAtomStateValue(clientConfigApiStatusState);
  const { fetchClientConfig } = useClientConfig();

  useEffect(() => {
    if (!isLoaded) {
      fetchClientConfig();
    }
  }, [isLoaded, fetchClientConfig]);

  return <></>;
};
