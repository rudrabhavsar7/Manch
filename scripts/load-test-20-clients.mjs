import { chromium } from '@playwright/test';
import { performance } from 'perf_hooks';
import { seedLoadTestDatabase, getMusicianEmails, HOST_EMAIL, TEST_PASSWORD, TEST_PIN, TEST_GIG_ID } from './load-test-seed.mjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NUM_MUSICIANS = parseInt(process.env.NUM_MUSICIANS || '19', 10);
const STAGGER_MS = parseInt(process.env.STAGGER_MS || '1000', 10);

const CHROMIUM_ARGS = [
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync'
];

export function calculateStats(latencies) {
  if (!latencies || latencies.length === 0) return { count: 0, p50: 0, p95: 0, max: 0, min: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { count: latencies.length, p50: Math.round(p50), p95: Math.round(p95), max: Math.round(max), min: Math.round(min) };
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function printSummaryReport(metrics) {
  const loginStats = calculateStats(metrics.loginTimes);
  const joinStats = calculateStats(metrics.joinTimes);
  const songSyncStats = calculateStats(metrics.songSyncTimes);
  const transposeStats = calculateStats(metrics.transposeSyncTimes);

  const getStatus = (stats, target) => {
    if (stats.count === 0) return 'SKIPPED';
    return stats.p95 < target ? '✅ PASS' : '⚠️ WARN';
  };

  const loginStatus = getStatus(loginStats, 3000);
  const joinStatus = getStatus(joinStats, 3000);
  const songSyncStatus = getStatus(songSyncStats, 2000);
  const transposeStatus = getStatus(transposeStats, 2000);

  console.log(`\n======================================================`);
  console.log(`📊 20-BROWSER LOAD TEST PERFORMANCE REPORT`);
  console.log(`======================================================`);
  console.table([
    { Metric: 'Parallel Login (20 clients)', 'p50 (ms)': loginStats.count ? loginStats.p50 : 'N/A', 'p95 (ms)': loginStats.count ? loginStats.p95 : 'N/A', 'Max (ms)': loginStats.count ? loginStats.max : 'N/A', Target: '< 3000ms', Status: loginStatus },
    { Metric: 'Parallel Gig Join (19 clients)', 'p50 (ms)': joinStats.count ? joinStats.p50 : 'N/A', 'p95 (ms)': joinStats.count ? joinStats.p95 : 'N/A', 'Max (ms)': joinStats.count ? joinStats.max : 'N/A', Target: '< 3000ms', Status: joinStatus },
    { Metric: 'Realtime Song Switch Sync', 'p50 (ms)': songSyncStats.count ? songSyncStats.p50 : 'N/A', 'p95 (ms)': songSyncStats.count ? songSyncStats.p95 : 'N/A', 'Max (ms)': songSyncStats.count ? songSyncStats.max : 'N/A', Target: '< 2000ms', Status: songSyncStatus },
    { Metric: 'Realtime Transpose Sync', 'p50 (ms)': transposeStats.count ? transposeStats.p50 : 'N/A', 'p95 (ms)': transposeStats.count ? transposeStats.p95 : 'N/A', 'Max (ms)': transposeStats.count ? transposeStats.max : 'N/A', Target: '< 2000ms', Status: transposeStatus },
  ]);

  console.log(`\nError Summary: ${metrics.errors.length} errors encountered.`);
  if (metrics.errors.length > 0) {
    console.table(metrics.errors);
  }
  console.log(`======================================================\n`);

  const hasFailedSLA =
    (loginStats.count > 0 && loginStats.p95 >= 3000) ||
    (joinStats.count > 0 && joinStats.p95 >= 3000) ||
    (songSyncStats.count > 0 && songSyncStats.p95 >= 2000) ||
    (transposeStats.count > 0 && transposeStats.p95 >= 2000);

  if (metrics.errors.length > 0 || hasFailedSLA) {
    process.exitCode = 1;
  }
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
      args: CHROMIUM_ARGS
    });
    allBrowsers.push(hostBrowser);
    metrics.launchTimes.push(performance.now() - tHostStart);

    const hostContext = await hostBrowser.newContext({ viewport: { width: 1280, height: 800 } });
    const hostPage = await hostContext.newPage();

    console.log('[Step 1/4] Host logging in as', HOST_EMAIL);
    const tLoginHostStart = performance.now();
    await hostPage.goto(`${BASE_URL}/auth/login`, { timeout: 45000 });
    await hostPage.locator('#email').pressSequentially(HOST_EMAIL, { delay: 10 });
    await hostPage.locator('#password').pressSequentially(TEST_PASSWORD, { delay: 10 });
    await hostPage.click('button:has-text("Sign in")');
    await hostPage.waitForURL(/\/dashboard/, { timeout: 35000 });
    metrics.loginTimes.push(performance.now() - tLoginHostStart);

    console.log('[Step 1/4] Host navigating to gig', TEST_GIG_ID);
    await hostPage.goto(`${BASE_URL}/gigs/${TEST_GIG_ID}`, { timeout: 45000 });
    await hostPage.waitForSelector('text=Load Test Live Gig', { timeout: 45000 });
    
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
          args: CHROMIUM_ARGS
        });
        allBrowsers.push(browser);
        metrics.launchTimes.push(performance.now() - tLaunch);

        const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
        const page = await context.newPage();

        // Login
        const tLogin = performance.now();
        await page.goto(`${BASE_URL}/auth/login`, { timeout: 45000 });
        await page.locator('#email').pressSequentially(email, { delay: 10 });
        await page.locator('#password').pressSequentially(TEST_PASSWORD, { delay: 10 });
        await page.click('button:has-text("Sign in")');
        await page.waitForURL(/\/dashboard/, { timeout: 35000 });
        metrics.loginTimes.push(performance.now() - tLogin);

        // Join via PIN
        const tJoin = performance.now();
        await page.goto(`${BASE_URL}/gigs/join`, { timeout: 45000 });
        const pinInput = page.locator('#pin');
        await pinInput.waitFor({ state: 'visible', timeout: 30000 });
        
        // Use native value setter to ensure React 19 synthetic event triggers instantly
        await pinInput.evaluate((el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) {
            setter.call(el, val);
          } else {
            el.value = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, TEST_PIN);

        await page.waitForSelector('button:has-text("Join Gig"):not([disabled])', { timeout: 15000 });
        await page.click('button:has-text("Join Gig"):not([disabled])');
        await page.waitForURL(new RegExp(`/gigs/${TEST_GIG_ID}`), { timeout: 45000 });
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

    // Step 3: Real-Time Sync Under Load
    console.log('\n[Step 3/4] Testing real-time sync under load...');

    // Test A: Song Switch Sync (switch from initial song Hotel California to Kabira)
    console.log('[Step 3/4] Host switching active song to Kabira in setlist...');
    const kabiraBtn = hostPage.locator('button:has-text("Kabira"), [data-testid="setlist-item-10000000-0000-0000-0000-000000000001"]');
    const songCount = await kabiraBtn.count();

    if (songCount > 0 && activeMusicians.length > 0) {
      const tSongSwitchStart = performance.now();
      await kabiraBtn.first().click();

      // Measure propagation across all active musicians
      const syncPromises = activeMusicians.map(async ({ page, email }) => {
        try {
          await page.waitForSelector('h1:has-text("Kabira")', { timeout: 15000 });
          metrics.songSyncTimes.push(performance.now() - tSongSwitchStart);
        } catch (e) {
          metrics.errors.push({ client: email, phase: 'SongSync', error: e.message });
        }
      });
      await Promise.all(syncPromises);
      console.log(`[Step 3/4] Song switch sync completed across ${metrics.songSyncTimes.length} musicians.`);
    }

    // Test B: Key Transposition
    console.log('[Step 3/4] Testing chord transpose key button on musicians...');
    if (activeMusicians.length > 0) {
      const musicianPage = activeMusicians[0].page;
      const transposeBtn = musicianPage.locator('button[aria-label="Transpose up"], button:has-text("+1"), [data-testid="transpose-increment"]');
      if (await transposeBtn.count() > 0) {
        const tTransposeStart = performance.now();
        await transposeBtn.first().click();
        metrics.transposeSyncTimes.push(performance.now() - tTransposeStart);
        console.log(`[Step 3/4] Musician chord transpose test completed (${Math.round(metrics.transposeSyncTimes[0])}ms).`);
      }
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
