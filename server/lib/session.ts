import session from 'express-session';
import { Redis } from 'ioredis';
import connectRedis from 'connect-redis';
import { randomBytes } from 'crypto';

// Environment variables with defaults
const SESSION_SECRET = process.env.SESSION_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL = parseInt(process.env.SESSION_TTL || '86400', 10); // 24 hours in seconds

// Validate session secret
if (!SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set. Using a random value. Sessions will be invalidated on server restart.');
}

// Create Redis client
const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis successfully');
});

// Create Redis store
const RedisStore = connectRedis(session);

// Session configuration
export const configureSession = (app: any) => {
  const isProduction = app.get('env') === 'production';
  
  const sessionConfig: session.SessionOptions = {
    store: new RedisStore({ 
      client: redisClient,
      ttl: SESSION_TTL,
      prefix: 'nuri:sess:',
    }),
    secret: SESSION_SECRET || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    name: 'nuri.session',
    rolling: true,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: SESSION_TTL * 1000, // convert to milliseconds
      sameSite: 'lax',
      path: '/'
    }
  };

  if (isProduction) {
    app.set('trust proxy', 1);
    sessionConfig.cookie!.secure = true;
  }

  return sessionConfig;
};

// Export Redis client for potential reuse
export { redisClient }; 