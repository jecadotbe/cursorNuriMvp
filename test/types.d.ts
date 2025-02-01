/// <reference types="@types/jest" />
import type { Express } from 'express';

declare global {
  namespace NodeJS {
    interface Global {
      app: Express;
    }
  }
}