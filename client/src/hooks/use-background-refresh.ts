import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useBackgroundRefresh = (interval = 10 * 60 * 1000, disabled = false) => { // 10 minutes default
  const queryClient = useQueryClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCountRef = useRef<number>(0);

  useEffect(() => {
    // If disabled, don't setup the timer
    if (disabled) return;
    
    // Prevent initial refresh upon mounting
    if (refreshCountRef.current === 0) {
      refreshCountRef.current++;
      return;
    }
    
    // Start the refresh interval only if we actually need it
    const startTimer = () => {
      // Clear any existing timer first
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        // Only invalidate if the query exists in the cache and the tab is visible
        if (document.visibilityState === 'visible' && queryClient.getQueryData(['suggestions'])) {
          console.log('Background refresh: Updating suggestions');
          queryClient.invalidateQueries({ queryKey: ['suggestions'] });
        }
      }, interval);
    };

    // Only start timer if we're visible
    if (document.visibilityState === 'visible') {
      startTimer();
    }
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTimer();
      } else {
        // Clear timer when tab is hidden
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Remove visibility change listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Cancel any pending queries when unmounting
      queryClient.cancelQueries({ queryKey: ['suggestions'] });
    };
  }, [queryClient, interval, disabled]);
}