
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Mixpanel } from '@/lib/mixpanel';

/**
 * Hook to track page views
 * @param pageName Optional custom page name, defaults to the current path
 */
export function usePageView(pageName?: string) {
  const [location] = useLocation();
  
  useEffect(() => {
    // Track page view
    Mixpanel.track('Page View', {
      page: pageName || location,
      url: window.location.href,
      referrer: document.referrer
    });
  }, [location, pageName]);
}

export default usePageView;
