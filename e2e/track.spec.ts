import { test, expect, prisma } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Track Upload', () => {
  let audioBuffer: Buffer;

  test.beforeAll(() => {
    // Create a small valid MP3 file for testing (silent/minimal)
    // Using a minimal valid MP3 header for testing
    const minimalMp3 = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    audioBuffer = minimalMp3;
  });

  test('should upload a track with metadata', async ({ page }) => {
    // Create approved musician
    const email = `musician${Date.now()}@test.com`;
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Track Test',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Track Artist',
            bio: 'Test',
            status: 'APPROVED',
          },
        },
      },
    });

    // Login
    await page.goto('/login');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'musician123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/ar', { timeout: 10000 });

    // Navigate to upload track
    await page.goto('/musician/tracks/new');

    // Create a test audio file
    const testFilePath = '/tmp/test-audio.mp3';
    fs.writeFileSync(testFilePath, audioBuffer);

    // Upload file via input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Fill track metadata
    await page.fill('input[id="title"]', 'Test Track');
    await page.fill('input[id="artist"]', 'Test Artist');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to tracks page after success
    await expect(page).toHaveURL(/\/musician\/tracks/, { timeout: 30000 });
  });

  test('should show error without file', async ({ page }) => {
    const email = `musician${Date.now()}@test.com`;
    
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'No File Test',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'No File Artist',
            bio: 'Test',
            status: 'APPROVED',
          },
        },
      },
    });

    await page.goto('/login');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'musician123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/ar', { timeout: 10000 });

    await page.goto('/musician/tracks/new');

    // Try to submit without file
    await page.fill('input[id="title"]', 'Test Track');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=Please select an audio file')).toBeVisible({ timeout: 5000 });
  });

  test('should list uploaded tracks', async ({ page }) => {
    const email = `musician${Date.now()}@test.com`;
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'List Test',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'List Artist',
            bio: 'Test',
            status: 'APPROVED',
          },
        },
      },
    });

    // Create a track directly in DB
    await prisma.track.create({
      data: {
        title: 'Existing Track',
        artist: 'List Artist',
        fileUrl: '/uploads/test.mp3',
        mimeType: 'audio/mp3',
        fileSize: 1024,
        musicianId: user.musician!.id,
      },
    });

    // Login and navigate to tracks
    await page.goto('/login');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'musician123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/ar', { timeout: 10000 });

    await page.goto('/musician/tracks');

    // Should see the created track
    await expect(page.locator('text=Existing Track')).toBeVisible({ timeout: 10000 });
  });
});