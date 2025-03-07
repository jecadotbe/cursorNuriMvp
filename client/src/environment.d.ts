declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      VITE_APP_TITLE: string;
      VITE_API_URL: string;
      DATABASE_URL: string;
      SESSION_SECRET: string;
      REDIS_URL: string;
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      SMTP_FROM: string;
      VAPID_PUBLIC_KEY: string;
      VAPID_PRIVATE_KEY: string;
      VAPID_SUBJECT: string;
    }
  }
} 