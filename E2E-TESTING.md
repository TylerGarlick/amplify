# Amplify E2E Testing

End-to-end tests for Amplify using [Playwright](https://playwright.dev/).

## Framework Choice

**Playwright** was chosen over Cypress for the following reasons:
- Native Next.js support with automatic webServer handling
- Better TypeScript integration and type safety
- More modern and actively maintained
- Flexible assertions with built-in expect
- Better handling of modern web features (SPA navigation, etc.)

## Prerequisites

- Node.js 18+
- npm or bun
- Playwright browsers (installed via `npx playwright install`)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client (if not already done):
```bash
npx prisma generate
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

## Running Tests

### Local Development
```bash
# Run all E2E tests
npm run test:e2e

# Run with visible browser (headed mode)
npm run test:e2e:headed

# Run with interactive UI
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug
```

### CI / GitHub Actions
Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

See [.github/workflows/e2e.yml](.github/workflows/e2e.yml) for the CI configuration.

## Test Structure

```
e2e/
├── fixtures.ts          # Shared test fixtures and helper methods
├── auth.spec.ts         # User registration and authentication
├── musician.spec.ts    # Musician application and approval flow
├── stage.spec.ts       # Stage creation with GPS location
├── track.spec.ts       # Track upload and processing
├── visualization.spec.ts # Visualization creation and management
└── explore.spec.ts     # Explore page and nearby stages
```

## Test Coverage

### Authentication
- User registration with validation
- User login/logout
- Protected route access
- Error handling for invalid credentials

### Musician Flow
- Musician application submission
- Admin approval workflow
- Musician access control

### Stage Management
- Stage creation with GPS coordinates
- Stage listing
- Validation for required fields

### Track Management
- Track upload with file selection
- Track metadata (title, artist)
- Track listing
- Error handling

### Visualizations
- Creating visualizations for stages
- Editing visualization settings
- Listing visualizations

### Explore Page
- Displaying public stages
- Location-based nearby stages
- Stage details display

## Environment Variables

The tests use the following environment variables (set in `.env.local` or CI):

```env
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Configuration

See [playwright.config.ts](playwright.config.ts) for test runner configuration, including:
- Base URL
- Browser settings
- Web server configuration
- Test timeouts
- Reporter settings

## Writing New Tests

### Using Fixtures

The `fixtures.ts` file provides helper methods:

```typescript
test('my test', async ({ page, createAndLoginUser }) => {
  // Create and login a test user
  await createAndLoginUser({ name: 'Custom User' });
  
  // Navigate and test
  await page.goto('/some-page');
});
```

### Database Access

Tests have direct access to Prisma for setup/teardown:

```typescript
test('test with db', async ({ page }) => {
  // Create data directly in DB
  await prisma.user.create({ ... });
  
  // Test...
});
```

### Custom Fixtures

Add custom fixtures in `fixtures.ts`:

```typescript
export const test = base.extend({
  myHelper: async ({ page }) => {
    // Return helper function
    return {
      doSomething: async () => { /* ... */ }
    };
  }
});
```

## Troubleshooting

### Tests timeout
- Increase the timeout in `playwright.config.ts`
- Check if the dev server is starting properly

### Database errors
- Ensure Prisma client is generated: `npx prisma generate`
- Check DATABASE_URL in your environment

### Geolocation tests fail
- Geolocation requires HTTPS or localhost
- In CI, geolocation is mocked or skipped

### Test data conflicts
- Tests use unique emails with timestamps to avoid conflicts
- Manual cleanup may be needed for stuck test data