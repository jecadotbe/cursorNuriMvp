import { QueryClient } from "@tanstack/react-query";

// Helper function for exponential backoff calculation
const getBackoffDelay = (attempt: number, baseDelay = 1000) => {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max delay of 30 seconds
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // Add cache control headers to prevent browser caching
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        if (!res.ok) {
          if (res.status === 529) {
            throw new Error("Server overloaded");
          }
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      refetchInterval: false, 
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: (failureCount, error) => {
        // Retry up to 3 times for server errors (500s) and overloaded states (529)
        if (error instanceof Error && 
            (error.message.startsWith("500") || 
             error.message.startsWith("529"))) {
          return failureCount < 3;
        }
        return false; // Don't retry other errors
      },
      retryDelay: (attemptIndex) => getBackoffDelay(attemptIndex),
    },
    mutations: {
      retry: (failureCount, error) => {
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