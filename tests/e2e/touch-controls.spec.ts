import { test, expect, Page } from '@playwright/test';

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

async function openUploader(page: Page) {
  await page.goto('/songs/new');
  await page.waitForLoadState('networkidle');
  await page.getByTestId('photo-file-input').setInputFiles(['tests/e2e/fixtures/photo1.png']);
  await expect(page.getByText('New', { exact: true })).toHaveCount(1);
}

test.describe('touch targets (hover: none)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('photo controls visible and sized on a phone', async ({ page }) => {
    await login(page);
    await openUploader(page);

    const media = await page.evaluate(() => ({
      hoverNone: matchMedia('(hover: none)').matches,
      hoverHover: matchMedia('(hover: hover)').matches,
    }));
    expect(media.hoverNone).toBe(true);
    expect(media.hoverHover).toBe(false);

    const overlay = page.locator('div.absolute.inset-0').first();
    await expect(overlay).toHaveCSS('opacity', '1');

    const overlayBox = await overlay.boundingBox();
    const thumbBox = await page.getByAltText(/photo page 1/i).boundingBox();
    expect(overlayBox).toBeTruthy();
    expect(thumbBox).toBeTruthy();
    if (overlayBox && thumbBox) {
      expect(overlayBox.height).toBeGreaterThanOrEqual(40);
      expect(overlayBox.y).toBeGreaterThanOrEqual(thumbBox.y - 1);
      expect(overlayBox.x).toBeGreaterThanOrEqual(thumbBox.x - 1);
      expect(overlayBox.x + overlayBox.width).toBeLessThanOrEqual(thumbBox.x + thumbBox.width + 1);
      expect(overlayBox.y + overlayBox.height).toBeLessThanOrEqual(thumbBox.y + thumbBox.height + 1);
    }

    for (const name of [/move photo up/i, /move photo down/i, /remove photo/i]) {
      const box = await page.getByRole('button', { name }).first().boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(32);
        expect(box.height).toBeGreaterThanOrEqual(32);
      }
    }
  });
});

test.describe('hover devices keep hover-reveal', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('photo controls hidden until hover', async ({ page }) => {
    await login(page);
    await openUploader(page);

    const media = await page.evaluate(() => matchMedia('(hover: hover)').matches);
    expect(media).toBe(true);

    const overlay = page.locator('div.absolute.inset-0').first();
    await expect(overlay).toHaveCSS('opacity', '0');
    await overlay.hover();
    await expect(overlay).toHaveCSS('opacity', '1');
  });
});
