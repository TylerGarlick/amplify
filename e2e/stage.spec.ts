import { test, expect, prisma } from './fixtures';

test.describe('Stage Creation', () => {
  const stageCoords = {
    lat: 37.7749,
    lng: -122.4194,
  };

  test.beforeEach(async ({ page }) => {
    // Create and login as approved musician
    const email = `musician${Date.now()}@test.com`;
    
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Test Musician',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Test Artist',
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
  });

  test('should create a stage with GPS location', async ({ page }) => {
    // Navigate to create stage page
    await page.goto('/musician/stages/new');

    // Fill stage form
    await page.fill('input[placeholder*="Stage Name"]', 'Test Stage');

    // Set coordinates via JavaScript (since they're controlled inputs)
    await page.evaluate((coords) => {
      const latInput = document.querySelector('input[placeholder="37.7749"]') as HTMLInputElement;
      const lngInput = document.querySelector('input[placeholder="-122.4194"]') as HTMLInputElement;
      if (latInput) {
        latInput.value = coords.lat.toString();
        latInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (lngInput) {
        lngInput.value = coords.lng.toString();
        lngInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, stageCoords);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to visualize page
    await expect(page).toHaveURL(/\/musician\/stages\/.+\/visualize/, { timeout: 15000 });
  });

  test('should show validation error without stage name', async ({ page }) => {
    await page.goto('/musician/stages/new');

    // Try to submit without name
    await page.click('button[type="submit"]');

    // Should stay on the same page
    await expect(page).toHaveURL('/musician/stages/new');
  });

  test('should show validation error without coordinates', async ({ page }) => {
    await page.goto('/musician/stages/new');

    // Fill name but no coordinates
    await page.fill('input[placeholder*="Stage Name"]', 'Test Stage');

    // Clear coordinates
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="number"]');
      inputs.forEach((input: any) => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=Latitude and longitude are required')).toBeVisible({ timeout: 5000 });
  });

  test('should list created stages', async ({ page }) => {
    // First create a stage
    const email = `musician${Date.now()}@test.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Stage List Test',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Stage List Artist',
            bio: 'Test',
            status: 'APPROVED',
          },
        },
      },
    });

    // Create a stage directly in DB
    await prisma.stage.create({
      data: {
        name: 'Existing Stage',
        description: 'Test stage for listing',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 50,
        isActive: true,
        isPublic: true,
        musicianId: user.musician!.id,
      },
    });

    // Login and navigate to stages list
    await page.goto('/login');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'musician123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/ar', { timeout: 10000 });

    await page.goto('/musician/stages');

    // Should see the created stage
    await expect(page.locator('text=Existing Stage')).toBeVisible({ timeout: 10000 });
  });
});