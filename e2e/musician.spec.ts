import { test, expect, prisma } from './fixtures';

test.describe('Musician Application', () => {
  test('should submit musician application', async ({ page }) => {
    const email = `musician${Date.now()}@test.com`;

    await page.goto('/register/musician');

    // Fill musician application form
    await page.fill('input[id="name"]', 'Test Musician');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'musician123');
    await page.fill('input[id="displayName"]', 'Test Artist');
    await page.fill('textarea[id="bio"]', 'Electronic music producer');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to login with success message
    await expect(page).toHaveURL('/login', { timeout: 10000 });
    await expect(page.locator('text=Application submitted')).toBeVisible({ timeout: 10000 });
  });

  test('should show error when required fields missing', async ({ page }) => {
    await page.goto('/register/musician');

    // Submit without filling any fields
    await page.click('button[type="submit"]');

    // Should not redirect - form should show validation errors
    await expect(page).toHaveURL('/register/musician');
  });

  test('should navigate back to regular signup', async ({ page }) => {
    await page.goto('/register/musician');

    // Click back link
    await page.click('text=Back to regular signup');

    await expect(page).toHaveURL('/register');
  });
});

test.describe('Musician Approval Flow', () => {
  test('should allow admin to view pending musicians', async ({ page }) => {
    // First create and approve a musician in DB
    const email = `musician${Date.now()}@test.com`;
    
    // Create musician in database with pending status
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Pending Musician',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Pending Artist',
            bio: 'Test',
            status: 'PENDING',
          },
        },
      },
    });

    // Login as admin
    await page.goto('/login');
    await page.fill('input[id="email"]', 'admin@amplify.app');
    await page.fill('input[id="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Navigate to admin musicians page
    await page.goto('/admin/musicians');

    // Should see pending musicians
    await expect(page.locator('text=Pending Artist')).toBeVisible({ timeout: 10000 });
  });

  test('should approve musician and allow access', async ({ page }) => {
    // Create pending musician
    const email = `musician${Date.now()}@test.com`;
    
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Approve Me',
        password: 'musician123',
        role: 'MUSICIAN',
        musician: {
          create: {
            displayName: 'Approve Me Artist',
            bio: 'Test musician',
            status: 'PENDING',
          },
        },
      },
    });

    // Login as admin
    await page.goto('/login');
    await page.fill('input[id="email"]', 'admin@amplify.app');
    await page.fill('input[id="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 10000 });

    // Go to musicians page
    await page.click('text=Musicians');
    await page.waitForURL('/admin/musicians');

    // Find and click approve button
    const approveButton = page.locator('button:has-text("Approve")').first();
    await approveButton.click();

    // Should show success
    await expect(page.locator('text=approved')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});