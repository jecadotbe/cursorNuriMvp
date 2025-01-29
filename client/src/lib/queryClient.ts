import { QueryClient } from "@tanstack/react-query";

// Helper function for exponential backoff calculation
const getBackoffDelay = (attempt: number, baseDelay = 1000) => {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max delay of 30 seconds
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 529) {
            throw new Error("Server overloaded");
          }
          if (res.status === 401) {
            // Force clear cache on auth errors
            queryClient.setQueryData(['user'], null);
            throw new Error("Not authenticated");
          }
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
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