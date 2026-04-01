import { useCallback } from 'react';

import { isDefined } from 'twenty-shared/utils';

import { REST_API_BASE_URL } from '@/apollo/constant/rest-api-base-url';
import { getTokenPair } from '@/apollo/utils/getTokenPair';
import { renewToken } from '@/auth/services/AuthService';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

export const useAuthenticatedAgentChatFetch = () => {
  const setTokenPair = useSetAtomState(tokenPairState);

  const retryWithRenewedToken = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const tokenPair = getTokenPair();

      if (!isDefined(tokenPair)) {
        return null;
      }

      try {
        const renewedTokens = await renewToken(
          `${REACT_APP_SERVER_BASE_URL}/metadata`,
          tokenPair,
        );

        if (!isDefined(renewedTokens)) {
          setTokenPair(null);

          return null;
        }

        const renewedAccessToken =
          renewedTokens.accessOrWorkspaceAgnosticToken?.token;

        if (!isDefined(renewedAccessToken)) {
          setTokenPair(null);

          return null;
        }

        setTokenPair(renewedTokens);

        const updatedHeaders = new Headers(init?.headers ?? {});

        updatedHeaders.set('Authorization', `Bearer ${renewedAccessToken}`);

        return fetch(input, {
          ...init,
          headers: updatedHeaders,
        });
      } catch {
        setTokenPair(null);

        return null;
      }
    },
    [setTokenPair],
  );

  const authenticatedFetch = useCallback(
    async (
      path: string,
      init?: RequestInit & { skipAuth?: boolean },
    ): Promise<Response | null> => {
      const tokenPair = getTokenPair();

      if (!isDefined(tokenPair)) {
        return null;
      }

      const url = `${REST_API_BASE_URL}${path}`;
      const headers = new Headers(init?.headers ?? {});

      headers.set(
        'Authorization',
        `Bearer ${tokenPair.accessOrWorkspaceAgnosticToken.token}`,
      );

      const requestInit: RequestInit = {
        ...init,
        headers,
      };

      const response = await fetch(url, requestInit);

      if (response.status === 401) {
        const retriedResponse = await retryWithRenewedToken(url, requestInit);

        return retriedResponse ?? response;
      }

      return response;
    },
    [retryWithRenewedToken],
  );

  return { authenticatedFetch };
};
