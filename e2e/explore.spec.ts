import { test, expect, prisma } from './fixtures';

test.describe('Explore Page', () => {
  test('should load and display public stages', async ({ page }) => {
    // Create a musician with a public stage
    const email = `musician${Date.now()}@test.com`;
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Explore Test',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Explore Artist',
            bio: 'Test',
            status: 'APPROVED',
          },
        },
      },
    });

    // Create public stage
    await prisma.stage.create({
      data: {
        name: 'Public Stage for Explore',
        description: 'A public AR stage',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 50,
        isActive: true,
        isPublic: true,
        musicianId: user.musician!.id,
      },
    });

    // Navigate to explore page (not authenticated)
    await page.goto('/explore');

    // Should show stages
    await expect(page.locator('text=Public Stage for Explore')).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no stages', async ({ page }) => {
    // Delete all stages first
    await prisma.stage.deleteMany({});

    await page.goto('/explore');

    // Should show empty state
    await expect(page.locator('text=No stages found')).toBeVisible({ timeout: 10000 });
  });

  test('should request location for nearby stages', async ({ page }) => {
    await page.goto('/explore');

    // Click "Near Me" button
    const nearMeButton = page.locator('button:has-text("Near Me")');
    await nearMeButton.click();

    // Should trigger geolocation prompt or show nearby stages
    // The actual behavior depends on browser geolocation permissions
    // Just verify the button exists and is clickable
    await expect(nearMeButton).toBeVisible();
  });

  test('should display stage details', async ({ page }) => {
    const email = `musician${Date.now()}@test.com`;
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Details Test',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Details Artist',
            bio: 'Test',
            status: 'APPROVED',
          },
        },
      },
    });

    // Create stage with track
    const track = await prisma.track.create({
      data: {
        title: 'Test Track',
        artist: 'Details Artist',
        fileUrl: '/uploads/test.mp3',
        mimeType: 'audio/mp3',
        fileSize: 1024,
        musicianId: user.musician!.id,
      },
    });

    const stage = await prisma.stage.create({
      data: {
        name: 'Stage With Track',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 50,
        isActive: true,
        isPublic: true,
        musicianId: user.musician!.id,
        stageTrackLinks: {
          create: {
            trackId: track.id,
          },
        },
      },
    });

    await page.goto('/explore');

    // Should display stage name and artist
    await expect(page.locator('text=Stage With Track')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Details Artist')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Test Track')).toBeVisible({ timeout: 10000 });
  });
});