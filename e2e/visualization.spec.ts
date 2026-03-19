import { test, expect, prisma } from './fixtures';

test.describe('Visualization', () => {
  test('should create visualization for a stage', async ({ page }) => {
    // Create musician with a stage
    const email = `musician${Date.now()}@test.com`;
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Vis Test',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Vis Artist',
            bio: 'Test',
            status: 'APPROVED',
          },
        },
      },
    });

    // Create stage
    const stage = await prisma.stage.create({
      data: {
        name: 'Visualization Test Stage',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 50,
        isActive: true,
        isPublic: true,
        musicianId: user.musician!.id,
      },
    });

    // Login
    await page.goto('/login');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'musician123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/ar', { timeout: 10000 });

    // Navigate to visualize page
    await page.goto(`/musician/stages/${stage.id}/visualize`);

    // Click add new visualization
    await page.click('button:has-text("Add Visualization"), button:has-text("+")');

    // Fill form
    await page.fill('input[placeholder*="Bass Pulse"]', 'Test Visual');
    
    // Select visualization type
    await page.click('.text-white:has-text("Type")');
    await page.click('text=Particle System');

    // Save
    await page.click('button:has-text("Add Visualization")');

    // Should show success toast
    await expect(page.locator('text=Visualization added')).toBeVisible({ timeout: 5000 });
  });

  test('should list existing visualizations', async ({ page }) => {
    const email = `musician${Date.now()}@test.com`;
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'List Vis Test',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'List Vis Artist',
            bio: 'Test',
            status: 'APPROVED',
          },
        },
      },
    });

    // Create stage and visualization
    const stage = await prisma.stage.create({
      data: {
        name: 'List Vis Stage',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 50,
        isActive: true,
        isPublic: true,
        musicianId: user.musician!.id,
      },
    });

    await prisma.visualization.create({
      data: {
        name: 'Existing Visual',
        type: 'PARTICLE_SYSTEM',
        stageId: stage.id,
        configJson: '{}',
        isVisible: true,
      },
    });

    // Login and navigate
    await page.goto('/login');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'musician123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/ar', { timeout: 10000 });

    await page.goto(`/musician/stages/${stage.id}/visualize`);

    // Should see the visualization in the list
    await expect(page.locator('text=Existing Visual')).toBeVisible({ timeout: 10000 });
  });
});