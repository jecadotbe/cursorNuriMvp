import { QueryClient } from "@tanstack/react-query";

// Helper function for exponential backoff calculation
const getBackoffDelay = (attempt: number, baseDelay = 1000) => {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max delay of 30 seconds
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        console.log('[QueryClient Debug] Making request:', {
          queryKey,
          cacheEntries: queryClient.getQueryCache().findAll()
        });

        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        console.log('[QueryClient Debug] Response received:', {
          status: res.status,
          ok: res.ok,
          queryKey,
          headers: Object.fromEntries(res.headers.entries())
        });

        if (!res.ok) {
          if (res.status === 529) {
            throw new Error("Server overloaded");
          }
          if (res.status === 401) {
            console.log('[QueryClient Debug] Auth error (401), clearing cache');
            // Force clear cache on auth errors
            queryClient.setQueryData(['user'], null);
            queryClient.clear();
            throw new Error("Not authenticated");
          }
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        console.log('[QueryClient Debug] Parsed response data:', {
          queryKey,
          data
        });
        return data;
      },
      refetchInterval: false,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        console.log('[QueryClient Debug] Retry attempt:', {
          failureCount,
          error
        });

        // Don't retry auth failures
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        // Retry up to 3 times for server errors (500s) and overloaded states (529)
        if (error instanceof Error && 
            (error.message.startsWith("500") || 
             error.message.startsWith("529"))) {
          return failureCount < 3;
        }
        return false; // Don't retry other errors
      },
      retryDelay: (attemptIndex) => {
        const delay = getBackoffDelay(attemptIndex);
        console.log('[QueryClient Debug] Retry delay:', {
          attemptIndex,
          delay
        });
        return delay;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        console.log('[QueryClient Debug] Mutation retry attempt:', {
          failureCount,
          error
        });
        // Same retry logic for mutations
        if (error instanceof Error && 
            (error.message.startsWith("500") || 
             error.message.startsWith("529"))) {
          return failureCount < 3;
        }
        return false;
      },
      retryDelay: (attemptIndex) => getBackoffDelay(attemptIndex),
    }
  },
});