import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React, {useMemo} from 'react';

function TenstackProvider({children}: {children: React.ReactNode}) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if ((error as any).status === 502) {
                return false; // Do not retry on 502 errors
              }
              return failureCount < 1; // Retry once for other errors
            },
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 60,
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export default TenstackProvider;
