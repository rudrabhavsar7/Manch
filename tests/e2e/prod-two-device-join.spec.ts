import { test, expect } from '@playwright/test';

test.describe('Two Device Join 404', () => {
  test.setTimeout(120000);

  test('device1 creates gig, device2 joins via PIN', async ({ browser }) => {
    const base = process.env.PLAYWRIGHT_TEST_BASE_URL || '';

    const d1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const d2 = await browser.newContext({ viewport: { width: 800, height: 800 } });
    const p1 = await d1.newPage();
    const p2 = await d2.newPage();

    p1.on('console', msg => console.log('D1:', msg.type(), msg.text()));
    p1.on('pageerror', err => console.log('D1 PAGE ERROR:', err.message));
    p2.on('console', msg => console.log('D2:', msg.type(), msg.text()));
    p2.on('pageerror', err => console.log('D2 PAGE ERROR:', err.message));
    p2.on('response', res => {
      if (res.status() >= 400) console.log('D2 HTTP', res.status(), res.url());
    });

    try {
      // Device 1: login as admin
      await p1.goto(`${base}/auth/login`);
      await p1.fill('#email', 'rudra@manch.app');
      await p1.fill('#password', 'password123');
      await p1.click('button[type="submit"]');
      await expect(p1).toHaveURL(/\/dashboard/, { timeout: 15000 });
      console.log('D1 logged in');

      // Create setlist if needed
      await p1.goto(`${base}/setlists/new`);
      await p1.waitForLoadState('networkidle');
      const slName = p1.locator('#name, input[placeholder*="setlist" i]').first();
      if (await slName.isVisible().catch(() => false)) {
        await slName.fill(`Join Test SL ${Date.now()}`);
        const save = p1.locator('button:has-text("Save"), button:has-text("Create")').first();
        if (await save.isVisible().catch(() => false)) {
          await save.click();
          await p1.waitForTimeout(2000);
        }
      }

      // Create gig
      await p1.goto(`${base}/gigs/new`);
      await p1.waitForLoadState('networkidle');
      await p1.waitForTimeout(1000);
      const gigName = `Join Test Gig ${Date.now()}`;
      await p1.locator('#name').fill(gigName);
      await p1.locator('#setlist').click();
      await p1.waitForTimeout(500);
      const opt = p1.locator('[role="option"]').first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
      } else {
        await p1.keyboard.press('ArrowDown');
        await p1.keyboard.press('Enter');
      }
      await p1.locator('button:has-text("Create & Go Live")').click();
      await p1.waitForURL(/\/gigs\/[0-9a-f-]+/, { timeout: 15000 });
      const gigUrl = p1.url();
      const gigId = gigUrl.split('/gigs/')[1];
      console.log('D1 gig created:', gigId);

      await p1.waitForLoadState('networkidle');
      await p1.waitForTimeout(2000);

      // Get PIN from D1
      const pinText = await p1.getByText(/PIN:\s*\d+/).textContent().catch(() => null);
      console.log('PIN text:', pinText);
      const pin = pinText?.match(/\d{4,}/)?.[0];
      if (!pin) throw new Error('Could not read PIN');
      console.log('PIN:', pin);

      // Device 2: login as second user (or same if only one)
      await p2.goto(`${base}/auth/login`);
      await p2.fill('#email', 'rudra@manch.app');
      await p2.fill('#password', 'password123');
      await p2.click('button[type="submit"]');
      await expect(p2).toHaveURL(/\/dashboard/, { timeout: 15000 });
      console.log('D2 logged in');

      // Join via PIN
      await p2.goto(`${base}/gigs/join`);
      await p2.waitForLoadState('networkidle');
      await p2.fill('#pin', pin);
      await p2.click('button:has-text("Join Gig")');

      // Capture what happens
      await p2.waitForTimeout(8000);
      console.log('D2 final URL:', p2.url());
      const bodyText = await p2.locator('body').innerText().catch(() => '');
      console.log('D2 body snippet:', bodyText.slice(0, 500));

      const is404 = p2.url().includes('404') || bodyText.toLowerCase().includes('404') || bodyText.toLowerCase().includes('not found');
      console.log('D2 shows 404:', is404);

      await p2.screenshot({ path: 'test-results/d2-join-result.png' });
      await p1.screenshot({ path: 'test-results/d1-host-result.png' });

      // Don't assert pass/fail yet — gather evidence
      console.log('EVIDENCE_COMPLETE');
    } finally {
      await d1.close();
      await d2.close();
    }
  });
});
