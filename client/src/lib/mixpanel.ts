import mixpanel from 'mixpanel-browser';

// Replace this with your actual Mixpanel token
const MIXPANEL_TOKEN = 'YOUR_MIXPANEL_PROJECT_TOKEN';

// Initialize Mixpanel
mixpanel.init(MIXPANEL_TOKEN, { 
  debug: process.env.NODE_ENV !== 'production',
  track_pageview: true,
  persistence: 'localStorage'
});

// Create a Mixpanel instance with additional helper methods
export const Mixpanel = {
  identify: (id: string) => {
    mixpanel.identify(id);
  },
  alias: (id: string) => {
    mixpanel.alias(id);
  },
  track: (name: string, props?: Record<string, any>) => {
    mixpanel.track(name, props);
  },
  trackLinks: (query: string, name: string) => {
    mixpanel.track_links(query, name);
  },
  people: {
    set: (props: Record<string, any>) => {
      mixpanel.people.set(props);
    },
    setOnce: (props: Record<string, any>) => {
      mixpanel.people.set_once(props);
    },
    increment: (prop: string, by?: number) => {
      mixpanel.people.increment(prop, by);
    }
  },
  reset: () => {
    mixpanel.reset();
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
  }
};

export default Mixpanel;