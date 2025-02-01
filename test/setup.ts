import { config } from 'dotenv';
import { Express } from 'express';
import type { User } from '../server/auth';
import { jest } from '@jest/globals';

declare global {
  namespace NodeJS {
    interface Global {
      app: Express;
    }
  }
}

// Load environment variables
config();

// Mock authentication for testing
jest.mock('../server/auth', () => ({
  ...jest.requireActual('../server/auth'),
  isAuthenticated: () => true,
  authenticate: (strategy: string, callback: (error: any, user: User | false, info?: any) => void) => {
    callback(null, { 
      id: 1, 
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      profilePicture: null,
      createdAt: new Date()
    });
  }
}));

// Global test setup
beforeAll(async () => {
  // Add any global setup here
});

afterAll(async () => {
  // Add any cleanup here
});