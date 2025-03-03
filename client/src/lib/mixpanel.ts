
import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel with your project token
// Replace YOUR_MIXPANEL_TOKEN with your actual token from the Mixpanel dashboard
mixpanel.init('YOUR_MIXPANEL_TOKEN');

// Set this to false in production
const DEBUG_MODE = process.env.NODE_ENV !== 'production';

// Helper functions for tracking
export const Mixpanel = {
  identify: (id: string) => {
    mixpanel.identify(id);
  },
  
  alias: (id: string) => {
    mixpanel.alias(id);
  },
  
  track: (name: string, props?: Record<string, any>) => {
    if (DEBUG_MODE) {
      console.log('MIXPANEL TRACK:', name, props);
    }
    mixpanel.track(name, props);
  },
  
  trackLinks: (querySelector: string, name: string) => {
    mixpanel.track_links(querySelector, name);
  },
  
  people: {
    set: (props: Record<string, any>) => {
      mixpanel.people.set(props);
    },
  },
  
  setUser: (user: { id: number; username: string; email?: string }) => {
    // Set user ID
    mixpanel.identify(user.id.toString());
    
    // Set user properties
    mixpanel.people.set({
      $name: user.username,
      $email: user.email,
      $last_login: new Date().toISOString(),
    });
  },
  
  reset: () => {
    mixpanel.reset();
  }
};

export default Mixpanel;
