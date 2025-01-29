
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useBackgroundRefresh(interval = 5 * 60 * 1000) { // 5 minutes default
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    }, interval);

    return () => clearInterval(timer);
  }, [queryClient, interval]);
}
