import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useBackgroundRefresh = (interval = 5 * 60 * 1000) => { // 5 minutes default
  const queryClient = useQueryClient();

  useEffect(() => {
    // Start the refresh interval
    const timer = setInterval(() => {
      // Only invalidate if the query exists in the cache
      if (queryClient.getQueryData(['suggestions'])) {
        queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      }
    }, interval);

    // Cleanup function
    return () => {
      clearInterval(timer);
      // Cancel any pending queries when unmounting
      queryClient.cancelQueries({ queryKey: ['suggestions'] });
    };
  }, [queryClient, interval]);
}