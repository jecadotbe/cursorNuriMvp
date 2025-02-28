import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useBackgroundRefresh = (interval = 5 * 60 * 1000, disabled = false) => { // 5 minutes default
  const queryClient = useQueryClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If disabled, don't setup the timer
    if (disabled) return;
    
    // Start the refresh interval
    timerRef.current = setInterval(() => {
      // Only invalidate if the query exists in the cache
      if (queryClient.getQueryData(['suggestions'])) {
        queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      }
    }, interval);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Cancel any pending queries when unmounting
      queryClient.cancelQueries({ queryKey: ['suggestions'] });
    };
  }, [queryClient, interval, disabled]);
}