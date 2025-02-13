import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(sql);

export * from './schema';
