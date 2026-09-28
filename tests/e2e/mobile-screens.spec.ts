import { test, expect, Page } from '@playwright/test';

const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/signup'];
const APP_ROUTES = [
  '/dashboard',
  '/songs',
  '/songs/new',
  '/setlists',
  '/setlists/new',
  '/gigs',
  '/gigs/new',
];

async function login(page: Page) {
  await page.goto('/auth/login');
  const email = page.getByLabel('Email');
  const password = page.getByLabel('Password');
  await expect(async () => {
    await email.fill('rudra@manch.app');
    await password.fill('password123');
    await expect(email).toHaveValue('rudra@manch.app');
    await expect(password).toHaveValue('password123');
  }).toPass({ timeout: 15000 });
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}

async function expectNoOverflow(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    vw: document.documentElement.clientWidth,
  }));
  expect(m.scrollW, `horizontal overflow on ${route}`).toBeLessThanOrEqual(m.vw);
}

test.describe('mobile screens at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('public screens fit', async ({ page }) => {
    test.setTimeout(120000);
    for (const route of PUBLIC_ROUTES) {
      await expectNoOverflow(page, route);
    }
  });

  test('app screens fit after login', async ({ page }) => {
    test.setTimeout(180000);
    await login(page);
    for (const route of APP_ROUTES) {
      await expectNoOverflow(page, route);
    }
  });
});
