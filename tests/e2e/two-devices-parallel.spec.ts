import { test, expect } from '@playwright/test';
import { resetSeedPasswords } from './test-helpers';

test.describe('Two Devices Parallel Verification', () => {
  test.setTimeout(90000);

  test('Host sees newly connected Musician device reflect in Band Members in real time', async ({ browser }) => {
    // 1. Reset seed passwords and gig state
    await resetSeedPasswords();

    // 2. Launch two independent browser contexts representing two physical devices
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const musicianContext = await browser.newContext({ viewport: { width: 800, height: 800 } });

    const hostPage = await hostContext.newPage();
    const musicianPage = await musicianContext.newPage();

    try {
      // Step A: Device 1 (Host - Rohan) logs in
      await hostPage.goto('/auth/login');
      await hostPage.fill('#email', 'rohan@manch.app');
      await hostPage.fill('#password', 'Password123!');
      await hostPage.click('button:has-text("Sign in")');
      await expect(hostPage).toHaveURL(/\/dashboard/, { timeout: 15000 });

      // Step B: Host enters the live gig
      await hostPage.goto('/gigs/30000000-0000-0000-0000-000000000001');
      await expect(hostPage.getByText('Live at The Habitat')).toBeVisible({ timeout: 15000 });
      await expect(hostPage.getByText('PIN: 4821')).toBeVisible();

      // Step C: Host opens Band Members drawer
      const hostToggleBtn = hostPage.locator('button[aria-label="Toggle band members"]');
      await hostToggleBtn.click();
      await expect(hostPage.getByText('Band Members')).toBeVisible();
      await expect(hostPage.getByText('Rohan Sharma')).toBeVisible();
      // Verify Priya is NOT in the list yet
      await expect(hostPage.getByText('Priya Nair')).not.toBeVisible();

      // Step D: Device 2 (Musician - Priya) logs in on the second browser in parallel
      await musicianPage.goto('/auth/login');
      await musicianPage.fill('#email', 'priya@manch.app');
      await musicianPage.fill('#password', 'Password123!');
      await musicianPage.click('button:has-text("Sign in")');
      await expect(musicianPage).toHaveURL(/\/dashboard/, { timeout: 15000 });

      // Step E: Device 2 joins the gig using the PIN
      await musicianPage.goto('/gigs/join');
      await musicianPage.fill('#pin', '4821');
      await musicianPage.click('button:has-text("Join Gig")');
      await expect(musicianPage).toHaveURL(/\/gigs\/30000000-0000-0000-0000-000000000001/, { timeout: 20000 });
      await expect(musicianPage.getByText('Live at The Habitat')).toBeVisible();

      // Step F: VERIFICATION ON HOST (Device 1)
      // Host page was already open with Band Members drawer open.
      // Priya Nair MUST reflect in the Band Members drawer!
      await expect(hostPage.getByText('Priya Nair')).toBeVisible({ timeout: 15000 });

      // Step G: VERIFICATION ON MUSICIAN (Device 2)
      // Musician opens Band Members drawer on Device 2
      const musicianToggleBtn = musicianPage.locator('button[aria-label="Toggle band members"]');
      await musicianToggleBtn.click();
      await expect(musicianPage.getByText('Band Members')).toBeVisible();
      await expect(musicianPage.getByText('Priya Nair')).toBeVisible();
      await expect(musicianPage.getByText('Rohan Sharma')).toBeVisible();

      // Step H: Save visual proof screenshots for both devices
      await hostPage.screenshot({ path: 'test-results/host-device-members.png' });
      await musicianPage.screenshot({ path: 'test-results/musician-device-members.png' });
      console.log('Visual proof captured: test-results/host-device-members.png & test-results/musician-device-members.png');

      // Keep windows open for headed user observation
      await hostPage.waitForTimeout(7000);
    } finally {
      await hostContext.close();
      await musicianContext.close();
    }
  });
});
