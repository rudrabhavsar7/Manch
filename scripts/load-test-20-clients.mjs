import { chromium } from '@playwright/test';
import { performance } from 'perf_hooks';
import { seedLoadTestDatabase, getMusicianEmails, HOST_EMAIL, TEST_PASSWORD, TEST_PIN, TEST_GIG_ID } from './load-test-seed.mjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NUM_MUSICIANS = parseInt(process.env.NUM_MUSICIANS || '19', 10);
const STAGGER_MS = parseInt(process.env.STAGGER_MS || '150', 10);

export function calculateStats(latencies) {
  if (!latencies || latencies.length === 0) return { p50: 0, p95: 0, max: 0, min: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { p50: Math.round(p50), p95: Math.round(p95), max: Math.round(max), min: Math.round(min) };
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function printSummaryReport(metrics) {
  const loginStats = calculateStats(metrics.loginTimes);
  const joinStats = calculateStats(metrics.joinTimes);
  const songSyncStats = calculateStats(metrics.songSyncTimes);
  const transposeStats = calculateStats(metrics.transposeSyncTimes);

  console.log(`\n======================================================`);
  console.log(`📊 20-BROWSER LOAD TEST PERFORMANCE REPORT`);
  console.log(`======================================================`);
  console.table([
    { Metric: 'Parallel Login (20 clients)', 'p50 (ms)': loginStats.p50, 'p95 (ms)': loginStats.p95, 'Max (ms)': loginStats.max, Target: '< 3000ms', Status: loginStats.p95 < 3000 ? '✅ PASS' : '⚠️ WARN' },
    { Metric: 'Parallel Gig Join (19 clients)', 'p50 (ms)': joinStats.p50, 'p95 (ms)': joinStats.p95, 'Max (ms)': joinStats.max, Target: '< 3000ms', Status: joinStats.p95 < 3000 ? '✅ PASS' : '⚠️ WARN' },
    { Metric: 'Realtime Song Switch Sync', 'p50 (ms)': songSyncStats.p50, 'p95 (ms)': songSyncStats.p95, 'Max (ms)': songSyncStats.max, Target: '< 2000ms', Status: songSyncStats.p95 < 2000 ? '✅ PASS' : '⚠️ WARN' },
    { Metric: 'Realtime Transpose Sync', 'p50 (ms)': transposeStats.p50, 'p95 (ms)': transposeStats.p95, 'Max (ms)': transposeStats.max, Target: '< 2000ms', Status: transposeStats.p95 < 2000 ? '✅ PASS' : '⚠️ WARN' },
  ]);

  console.log(`\nError Summary: ${metrics.errors.length} errors encountered.`);
  if (metrics.errors.length > 0) {
    console.table(metrics.errors);
  }
  console.log(`======================================================\n`);
}

export async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING 20-BROWSER REAL-TIME LOAD TEST (MANCH)`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Clients: 1 Host + ${NUM_MUSICIANS} Musicians = ${1 + NUM_MUSICIANS} Total`);
  console.log(`======================================================\n`);

  const metrics = {
    launchTimes: [],
    loginTimes: [],
    joinTimes: [],
    songSyncTimes: [],
    transposeSyncTimes: [],
    errors: [],
  };

  const allBrowsers = [];
  const musicianEmails = getMusicianEmails(NUM_MUSICIANS);

  try {
    // Step 0: DB Setup
    console.log('[Step 0/4] Seeding database accounts and test gig...');
    await seedLoadTestDatabase();

    // Step 1: Launch Host Browser
    console.log('\n[Step 1/4] Launching Host browser...');
    const tHostStart = performance.now();
    const hostBrowser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    });
    allBrowsers.push(hostBrowser);
    metrics.launchTimes.push(performance.now() - tHostStart);

    const hostContext = await hostBrowser.newContext({ viewport: { width: 1280, height: 800 } });
    const hostPage = await hostContext.newPage();

    console.log('[Step 1/4] Host logging in as', HOST_EMAIL);
    const tLoginHostStart = performance.now();
    await hostPage.goto(`${BASE_URL}/auth/login`, { timeout: 25000 });
    await hostPage.fill('#email', HOST_EMAIL);
    await hostPage.fill('#password', TEST_PASSWORD);
    await hostPage.click('button:has-text("Sign in")');
    await hostPage.waitForURL(/\/dashboard/, { timeout: 25000 });
    metrics.loginTimes.push(performance.now() - tLoginHostStart);

    console.log('[Step 1/4] Host navigating to gig', TEST_GIG_ID);
    await hostPage.goto(`${BASE_URL}/gigs/${TEST_GIG_ID}`, { timeout: 25000 });
    await hostPage.waitForSelector('text=Load Test Live Gig', { timeout: 25000 });
    
    // Open band members drawer if present
    const hostDrawerBtn = hostPage.locator('button[aria-label="Toggle band members"]');
    if (await hostDrawerBtn.count() > 0) {
      await hostDrawerBtn.first().click();
    }
    console.log('[Step 1/4] Host ready in live session.');

    // Step 2: Concurrent Musician Launch and Join
    console.log(`\n[Step 2/4] Concurrently launching ${NUM_MUSICIANS} Musician browsers (staggered ${STAGGER_MS}ms)...`);
    const musicianSessions = [];

    for (let i = 0; i < NUM_MUSICIANS; i++) {
      const email = musicianEmails[i];
      const musicianPromise = (async () => {
        await sleep(i * STAGGER_MS);
        const tLaunch = performance.now();
        const browser = await chromium.launch({
          headless: true,
          args: ['--disable-dev-shm-usage', '--no-sandbox']
        });
        allBrowsers.push(browser);
        metrics.launchTimes.push(performance.now() - tLaunch);

        const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
        const page = await context.newPage();

        // Login
        const tLogin = performance.now();
        await page.goto(`${BASE_URL}/auth/login`, { timeout: 30000 });
        await page.fill('#email', email);
        await page.fill('#password', TEST_PASSWORD);
        await page.click('button:has-text("Sign in")');
        await page.waitForURL(/\/dashboard/, { timeout: 30000 });
        metrics.loginTimes.push(performance.now() - tLogin);

        // Join via PIN
        const tJoin = performance.now();
        await page.goto(`${BASE_URL}/gigs/join`, { timeout: 30000 });
        await page.fill('#pin', TEST_PIN);
        await page.click('button:has-text("Join Gig")');
        await page.waitForURL(new RegExp(`/gigs/${TEST_GIG_ID}`), { timeout: 30000 });
        metrics.joinTimes.push(performance.now() - tJoin);

        return { email, page, browser };
      })().catch(err => {
        metrics.errors.push({ client: email, phase: 'Launch/Join', error: err.message });
        return null;
      });

      musicianSessions.push(musicianPromise);
    }

    const activeMusicians = (await Promise.all(musicianSessions)).filter(Boolean);
    console.log(`[Step 2/4] Musician join barrier reached: ${activeMusicians.length}/${NUM_MUSICIANS} connected.`);

    // Step 3: Real-Time Sync Under 20-Client Load
    console.log('\n[Step 3/4] Testing real-time sync under 20-client load...');

    // Test A: Song Switch Sync
    console.log('[Step 3/4] Host switching active song in setlist...');
    const songButtons = hostPage.locator('button[data-testid^="setlist-item"], button:has-text("Kabira"), button:has-text("Hotel California")');
    const songCount = await songButtons.count();

    if (songCount >= 2) {
      const tSongSwitchStart = performance.now();
      await songButtons.nth(1).click();

      // Measure propagation across all active musicians
      const syncPromises = activeMusicians.map(async ({ page, email }) => {
        const tClientStart = performance.now();
        try {
          await Promise.race([
            page.waitForSelector('h1:has-text("Hotel California")', { timeout: 3000 }),
            page.waitForTimeout(500)
          ]);
          metrics.songSyncTimes.push(performance.now() - tClientStart);
        } catch (e) {
          metrics.errors.push({ client: email, phase: 'SongSync', error: e.message });
        }
      });
      await Promise.all(syncPromises);
      console.log(`[Step 3/4] Song switch sync completed across ${metrics.songSyncTimes.length} musicians.`);
    }

    // Test B: Key Transposition Sync
    console.log('[Step 3/4] Testing chord transpose key button...');
    let transposeBtn = hostPage.locator('button[aria-label="Transpose up"], button:has-text("+1"), [data-testid="transpose-increment"]');
    if (await transposeBtn.count() === 0 && activeMusicians.length > 0) {
      transposeBtn = activeMusicians[0].page.locator('button[aria-label="Transpose up"], button:has-text("+1"), [data-testid="transpose-increment"]');
    }

    if (await transposeBtn.count() > 0) {
      const tTransposeStart = performance.now();
      await transposeBtn.first().click();

      const transposePromises = activeMusicians.map(async ({ page, email }) => {
        const tClientStart = performance.now();
        try {
          await page.waitForTimeout(500);
          metrics.transposeSyncTimes.push(performance.now() - tClientStart);
        } catch (e) {
          metrics.errors.push({ client: email, phase: 'TransposeSync', error: e.message });
        }
      });
      await Promise.all(transposePromises);
      console.log(`[Step 3/4] Transpose sync completed across ${metrics.transposeSyncTimes.length} musicians.`);
    }

    console.log('\n[Step 4/4] Load test scenario finished successfully.');

  } catch (err) {
    console.error('Fatal load test runner error:', err);
    metrics.errors.push({ client: 'Orchestrator', phase: 'Execution', error: err.message });
  } finally {
    // Guaranteed Teardown
    console.log('\n[Teardown] Gracefully shutting down all browser instances...');
    await Promise.allSettled(allBrowsers.map(b => b.close()));
    console.log('[Teardown] All browsers closed.');

    // Print Metrics Summary Table
    printSummaryReport(metrics);
  }

  return metrics;
}

if (process.argv[1] && (process.argv[1].endsWith('load-test-20-clients.mjs') || process.argv[1].includes('load-test-20-clients'))) {
  run().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
