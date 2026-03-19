import { test as base, Page } from '@playwright/test';
import { PrismaClient } from '@/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url });
export const prisma = new PrismaClient({ adapter });

// Test user credentials - unique per test run to avoid conflicts
export const testUsers = {
  regular: {
    name: `Test User ${Date.now()}`,
    email: `user${Date.now()}@test.com`,
    password: 'testpassword123',
  },
  musician: {
    name: `Musician ${Date.now()}`,
    email: `musician${Date.now()}@test.com`,
    password: 'musician123',
    displayName: `Artist ${Date.now()}`,
    bio: 'Test musician for E2E testing',
  },
  admin: {
    email: 'admin@amplify.local',
    password: 'admin123',
  },
};

// Simple test fixture without complex type extensions
export const test = base;

export { expect } from '@playwright/test';

// Cleanup after all tests
base.afterAll(async () => {
  await prisma.$disconnect();
});