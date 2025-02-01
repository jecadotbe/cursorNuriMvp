import { config } from 'dotenv';
import type { Express } from 'express';
import type { User } from '../server/auth';
import { jest, beforeAll, afterAll } from '@jest/globals';

// Load environment variables
config();

// Mock authentication for testing
jest.mock('../server/auth', () => {
  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    profilePicture: null,
    createdAt: new Date()
  };

  return {
    isAuthenticated: () => true,
    authenticate: (_strategy: string, callback: (error: any, user: User | false, info?: any) => void) => {
      callback(null, mockUser);
    }
  };
});

// Global test setup
beforeAll(async () => {
  // Add any global setup here
});

afterAll(async () => {
  // Add any cleanup here
});