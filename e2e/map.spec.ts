import { test, expect, prisma } from './fixtures';
import bcrypt from 'bcryptjs';

test.describe('Stage Map - Component Verification', () => {
  async function loginAsMusician(page: any, email: string, password: string = 'musician123') {
    await page.goto('/login');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for either /ar (success) or an error message (failure)
    try {
      await page.waitForURL('/ar', { timeout: 8000 });
    } catch {
      // Check if login failed due to wrong password or user not found
      const errorMsg = await page.locator('[class*="error"], [class*="alert"], [role="alert"]').first().textContent().catch(() => '');
      throw new Error(`Login failed for ${email}: ${errorMsg}`);
    }
  }

  async function createApprovedMusician(email: string) {
    const hashedPassword = await bcrypt.hash('musician123', 10);
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Map Test Musician',
        password: hashedPassword,
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Map Test Artist',
            bio: 'Test musician for map testing',
            status: 'APPROVED',
          },
        },
      },
    });
  }

  test('map container renders with correct dimensions when stages are provided', async ({ page }) => {
    const email = `mapmusician${Date.now()}@test.com`;
    await createApprovedMusician(email);
    await loginAsMusician(page, email);

    const mockStages = [
      {
        id: '1',
        name: 'Test Stage SF',
        description: 'A test stage in San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 50,
        isActive: true,
        musicianId: 'm1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        musician: {
          id: 'm1',
          displayName: 'Test Artist',
          bio: 'Test bio',
          status: 'APPROVED',
          userId: 'u1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: 'u1',
            email: 'test@example.com',
            name: 'Test User',
            image: null,
            emailVerified: null,
            role: 'MUSICIAN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      },
      {
        id: '2',
        name: 'Test Stage LA',
        description: 'A test stage in Los Angeles',
        latitude: 34.0522,
        longitude: -118.2437,
        radius: 75,
        isActive: true,
        musicianId: 'm2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        musician: {
          id: 'm2',
          displayName: 'Another Artist',
          bio: 'Another bio',
          status: 'APPROVED',
          userId: 'u2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: 'u2',
            email: 'another@example.com',
            name: 'Another User',
            image: null,
            emailVerified: null,
            role: 'MUSICIAN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      },
    ];

    const consoleErrors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.route('/api/stages', (route: any) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockStages }),
      });
    });

    await page.goto('/musician/stages/map');

    // Page header should be visible
    await expect(page.locator('h1:has-text("Stage Map")')).toBeVisible({ timeout: 10000 });

    // Leaflet map container must be present and visible
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Map container must have non-zero dimensions
    const bbox = await mapContainer.boundingBox();
    expect(bbox, 'Map container must have non-zero dimensions').not.toBeNull();
    expect(bbox!.width).toBeGreaterThan(100, `Map width should be > 100, got ${bbox!.width}`);
    expect(bbox!.height).toBeGreaterThan(100, `Map height should be > 100, got ${bbox!.height}`);

    // Should show stage count — use more specific selector
    const badge = page.locator('.stage-map-badge');
    await expect(badge).toBeAttached({ timeout: 5000 });
    await expect(badge).toContainText('2 stages', { timeout: 5000 });

    // Should see stage markers
    const markers = page.locator('.stage-marker-wrapper');
    await expect(markers).toHaveCount(2, { timeout: 10000 });

    // No console errors (ignore React DevTools warnings and known NextAuth session noise)
    const realErrors = consoleErrors.filter(
      (e) =>
        !e.includes('Warning') &&
        !e.includes('DevTools') &&
        !e.includes('ClientFetchError') && // NextAuth noise in test env
        !e.includes('Failed to fetch') && // same noise
        !e.includes('500') // NextAuth session endpoint 500 in test env
    );
    expect(realErrors, `Unexpected console errors: ${realErrors.join('\n')}`).toHaveLength(0);
  });

  test('map shows empty state gracefully when no stages exist', async ({ page }) => {
    const email = `mapmusician${Date.now()}@test.com`;
    await createApprovedMusician(email);
    await loginAsMusician(page, email);

    await page.route('/api/stages', (route: any) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/musician/stages/map');

    await expect(page.locator('h1:has-text("Stage Map")')).toBeVisible({ timeout: 10000 });

    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    const bbox = await mapContainer.boundingBox();
    expect(bbox).not.toBeNull();
    expect(bbox!.width).toBeGreaterThan(0);
    expect(bbox!.height).toBeGreaterThan(0);
  });

  test('map handles API error gracefully', async ({ page }) => {
    const email = `mapmusician${Date.now()}@test.com`;
    await createApprovedMusician(email);
    await loginAsMusician(page, email);

    await page.route('/api/stages', (route: any) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/musician/stages/map');

    // Page header should still show (not crash)
    await expect(page.locator('h1:has-text("Stage Map")')).toBeVisible({ timeout: 10000 });

    // Map container should still be visible (shows empty/error state gracefully)
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });
  });
});
