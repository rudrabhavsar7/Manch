import { test, expect } from '@playwright/test';

test.describe('End Gig Full Flow', () => {
  test('create gig then end it', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.goto('/auth/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await page.fill('#email', 'rudra@manch.app');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('✅ Logged in');

    // Create setlist if none exists
    await page.goto('/setlists/new');
    await page.waitForLoadState('networkidle');
    const nameInput = page.locator('#name, input[placeholder*="setlist" i], input[name="name"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(`E2E Setlist ${Date.now()}`);
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        console.log('✅ Created setlist');
      }
    }

    // Create gig
    await page.goto('/gigs/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const gigNameInput = page.locator('#name');
    await expect(gigNameInput).toBeVisible();
    await gigNameInput.fill(`E2E Gig ${Date.now()}`);

    // Select first setlist
    const setlistTrigger = page.locator('#setlist');
    await setlistTrigger.click();
    await page.waitForTimeout(500);
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click();
    } else {
      // Radix select may use different structure
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    const createBtn = page.locator('button:has-text("Create & Go Live")');
    await expect(createBtn).toBeEnabled();
    await createBtn.click();
    await page.waitForURL(/\/gigs\//, { timeout: 15000 });
    console.log('✅ Created gig:', page.url());

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // End Gig
    const endGigBtn = page.locator('[data-testid="admin-end-gig"]');
    await expect(endGigBtn).toBeVisible();
    console.log('Is admin: true');

    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('supabase') || req.method() !== 'GET') {
        requests.push(`${req.method()} ${req.url()}`);
      }
    });
    page.on('response', res => {
      if (res.url().includes('supabase') || res.status() >= 400) {
        requests.push(`${res.status()} ${res.url()}`);
      }
    });

    console.log('About to click End Gig...');
    await endGigBtn.click();
    console.log('Clicked End Gig');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    console.log('Network requests:');
    requests.forEach(r => console.log('  ', r));

    const patchRequests = requests.filter(r => r.includes('PATCH') && r.includes('gigs'));
    const successResponses = requests.filter(r => r.startsWith('200') && r.includes('gigs'));

    console.log(`PATCH requests: ${patchRequests.length}`);
    console.log(`200 responses: ${successResponses.length}`);

    expect(patchRequests.length).toBeGreaterThan(0);
    expect(successResponses.length).toBeGreaterThan(0);
  });
});
