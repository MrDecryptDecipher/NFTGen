declare module '@tanstack/react-query' {
  import * as React from 'react';

  export interface QueryClientConfig {
    defaultOptions?: {
      queries?: {
        retry?: boolean | number;
        staleTime?: number;
        cacheTime?: number;
        refetchOnWindowFocus?: boolean;
        refetchOnMount?: boolean;
        refetchOnReconnect?: boolean;
        suspense?: boolean;
      };
    };
  }

  export class QueryClient {
    constructor(config?: QueryClientConfig);
  }

  export interface QueryClientProviderProps {
    client: QueryClient;
    children?: React.ReactNode;
  }

  export function QueryClientProvider(props: QueryClientProviderProps): JSX.Element;
}
