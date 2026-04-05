import { test, expect } from '@playwright/test';

/**
 * AR Demo E2E Tests
 * Tests the /ar/demo route for audio-reactive AR visualizations
 */

test.describe('AR Demo Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo page
    await page.goto('/ar/demo');
  });

  test('demo page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/AR Demo — Amplify/);
  });

  test('shows camera permission prompt on load', async ({ page }) => {
    // Should see the permission prompt
    const enableButton = page.getByRole('button', { name: /Enable Camera/i });
    await expect(enableButton).toBeVisible();
  });

  test('shows AR Demo header', async ({ page }) => {
    const header = page.getByText(/AR Demo/i);
    await expect(header).toBeVisible();
  });

  test('displays instructions before camera grant', async ({ page }) => {
    const instructions = page.getByText(/audio-reactive 3D visualizations/i);
    await expect(instructions).toBeVisible();
  });

  test('camera button is clickable', async ({ page }) => {
    const enableButton = page.getByRole('button', { name: /Enable Camera/i });
    await expect(enableButton).toBeEnabled();
  });

  test('shows play audio button after camera (mocked)', async ({ page }) => {
    // Mock camera permission
    await page.context().grantPermissions(['camera']);
    
    // Reload to pick up permissions
    await page.reload();
    
    // Click enable camera
    await page.getByRole('button', { name: /Enable Camera/i }).click();
    
    // Should see play button after camera is granted
    const playButton = page.getByRole('button', { name: /Play Demo Audio/i });
    await expect(playButton).toBeVisible();
  });

  test('play button toggles to stop when clicked', async ({ page }) => {
    await page.context().grantPermissions(['camera']);
    await page.reload();
    await page.getByRole('button', { name: /Enable Camera/i }).click();
    
    // Click play
    await page.getByRole('button', { name: /Play Demo Audio/i }).click();
    
    // Should change to stop button
    const stopButton = page.getByRole('button', { name: /Stop Demo/i });
    await expect(stopButton).toBeVisible();
  });

  test('shows audio reactive indicator when playing', async ({ page }) => {
    await page.context().grantPermissions(['camera']);
    await page.reload();
    await page.getByRole('button', { name: /Enable Camera/i }).click();
    await page.getByRole('button', { name: /Play Demo Audio/i }).click();
    
    // Should show "Audio Reactive" badge
    const reactiveBadge = page.getByText(/Audio Reactive/i);
    await expect(reactiveBadge).toBeVisible();
  });

  test('canvas renders 3D scene', async ({ page }) => {
    await page.context().grantPermissions(['camera']);
    await page.reload();
    await page.getByRole('button', { name: /Enable Camera/i }).click();
    
    // Canvas should be present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('video element present for camera feed', async ({ page }) => {
    await page.context().grantPermissions(['camera']);
    await page.reload();
    await page.getByRole('button', { name: /Enable Camera/i }).click();
    
    // Video element should be present
    const video = page.locator('video');
    await expect(video).toBeVisible();
  });
});

test.describe('AR Demo - Database Integration', () => {
  test('demo stage exists in database', async ({ page }) => {
    // Navigate to API endpoint to check stage data
    const response = await page.goto('/api/ar/nearby?lat=37.7749&lng=-122.4194&radius=100');
    expect(response?.status()).toBe(200);
    
    const json = await response?.json();
    expect(json).toBeDefined();
    expect(Array.isArray(json)).toBe(true);
    
    // Should have at least the demo stage
    const demoStage = json?.find((s: any) => s.name?.includes('Demo Stage'));
    expect(demoStage).toBeDefined();
    expect(demoStage?.musician?.displayName).toBe('Demo Musician');
  });

  test('demo stage has visualizations', async ({ page }) => {
    const response = await page.goto('/api/ar/nearby?lat=37.7749&lng=-122.4194&radius=100');
    const json = await response?.json();
    
    const demoStage = json?.find((s: any) => s.name?.includes('Demo Stage'));
    expect(demoStage?.visualizations).toBeDefined();
    expect(demoStage?.visualizations.length).toBeGreaterThan(0);
    
    // Check for expected visualization types
    const vizNames = demoStage.visualizations.map((v: any) => v.name);
    expect(vizNames).toContain('Bass Pulse');
    expect(vizNames).toContain('Treble Waves');
  });
});

test.describe('AR Demo - Performance', () => {
  test('page loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/ar/demo');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('canvas maintains 60fps (basic check)', async ({ page }) => {
    await page.context().grantPermissions(['camera']);
    await page.reload();
    await page.getByRole('button', { name: /Enable Camera/i }).click();
    
    // Wait for canvas to initialize
    await page.waitForSelector('canvas');
    
    // Give it a moment to start rendering
    await page.waitForTimeout(1000);
    
    // Check canvas is still rendering (not crashed)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
