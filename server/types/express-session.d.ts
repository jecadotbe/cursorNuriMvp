// Extend Express.Session
declare module 'express-session' {
  interface SessionData {
    checkSuggestions?: boolean;
    passport?: {
      user?: any;
    };
  }
}

export {};
