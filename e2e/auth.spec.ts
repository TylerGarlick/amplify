import { test, expect, prisma } from './fixtures';

test.describe('User Registration', () => {
  const uniqueEmail = `user${Date.now()}@test.com`;

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[id="name"]', 'Test User');
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to login with success message
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/register');

    // Click sign in link
    await page.click('text=Sign in');

    await expect(page).toHaveURL('/login');
  });
});

test.describe('User Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    // First create a user
    const email = `user${Date.now()}@test.com`;
    await page.goto('/register');
    await page.fill('input[id="name"]', 'Test User');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/login');

    // Now login
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to AR page
    await page.waitForURL('/ar', { timeout: 15000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[id="email"]', 'nonexistent@test.com');
    await page.fill('input[id="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/ar');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});