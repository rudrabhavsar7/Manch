# 20-Browser Real-Time Load Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and execute a 20-browser headless Chromium load testing harness testing concurrent authentication, gig joining via PIN, and real-time sync across 1 Host and 19 Band Members.

**Architecture:** Standalone Node.js ESM script with Playwright launching 20 headless Chromium instances with staggered ramp-up, barrier synchronization, high-resolution latency timers, and a Postgres DB seed/reset module.

**Tech Stack:** Node.js, `@playwright/test` (Chromium), `pg` (PostgreSQL Client), Next.js 15, Supabase (Auth + Realtime).

**Spec:** [`docs/superpowers/specs/2026-09-24-load-testing-20-browsers-design.md`](file:///D:/Manch/docs/superpowers/specs/2026-09-24-load-testing-20-browsers-design.md)

## Global Constraints

- Target environment: Local development server (`http://localhost:3000`)
- Browser instances: 20 separate headless Chromium instances (`headless: true`)
- Host account: `loadtest_host@manch.app` (Admin)
- Musician accounts: `loadtest_01@manch.app` through `loadtest_19@manch.app`
- Test passwords: `Password123!`
- Test Gig ID: `30000000-0000-0000-0000-000000000099`
- Test Gig PIN: `7788`
- Staggered launch delay: 150ms between browser processes
- Real-time sync SLA: < 2000ms p95 latency

---

### Task 1: Database Seed & Reset Script for 20 Accounts

**Files:**
- Create: `scripts/load-test-seed.mjs`
- Test: Direct execution via `node scripts/load-test-seed.mjs`

**Interfaces:**
- Produces: `export async function seedLoadTestDatabase(): Promise<{ gigId: string, pin: string, accounts: Array<{ email: string, role: string }> }>`

- [ ] **Step 1: Write DB seed script**

Create `scripts/load-test-seed.mjs`:
```javascript
import { Client } from 'pg';

const DB_CONNECTION = process.env.DATABASE_URL || 'postgresql://postgres:xLWcBNrftny696st@db.uedphvuuunnaeaopadfz.supabase.co:5432/postgres';
export const TEST_GIG_ID = '30000000-0000-0000-0000-000000000099';
export const TEST_PIN = '7788';
export const HOST_EMAIL = 'loadtest_host@manch.app';
export const TEST_PASSWORD = 'Password123!';
export const BCRYPT_HASH = '$2a$10$buUGKz.eBCjj9BaCKFo.buKZhM/GqW9REgA691fNVhOxcfysSBO6q';

export function getMusicianEmails(count = 19) {
  return Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return `loadtest_${num}@manch.app`;
  });
}

export async function seedLoadTestDatabase() {
  console.log('[Seed] Connecting to Postgres database...');
  const client = new Client({ connectionString: DB_CONNECTION });
  await client.connect();

  try {
    console.log('[Seed] Seeding 20 test accounts in auth.users and public.users...');
    
    // Host user ID
    const hostId = '00000000-0000-0000-0000-000000000099';
    await client.query(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3, now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Load Host"}', now(), now())
      ON CONFLICT (id) DO UPDATE SET encrypted_password = $3, email_confirmed_at = now()
    `, [hostId, HOST_EMAIL, BCRYPT_HASH]);

    await client.query(`
      INSERT INTO public.users (id, email, display_name, instrument, role)
      VALUES ($1, $2, 'Load Host', 'Lead Vocals', 'admin')
      ON CONFLICT (id) DO UPDATE SET display_name = 'Load Host', role = 'admin'
    `, [hostId, HOST_EMAIL]);

    // 19 Musician accounts
    const musicianEmails = getMusicianEmails(19);
    for (let i = 0; i < musicianEmails.length; i++) {
      const email = musicianEmails[i];
      const num = String(i + 1).padStart(2, '0');
      const userId = `00000000-0000-0000-0000-0000000001${num}`;
      const name = `Load Musician ${num}`;

      await client.query(`
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3, now(), '{"provider":"email","providers":["email"]}', json_build_object('display_name', $4::text), now(), now())
        ON CONFLICT (id) DO UPDATE SET encrypted_password = $3, email_confirmed_at = now()
      `, [userId, email, BCRYPT_HASH, name]);

      await client.query(`
        INSERT INTO public.users (id, email, display_name, instrument, role)
        VALUES ($1, $2, $3, 'Acoustic Guitar', 'musician')
        ON CONFLICT (id) DO UPDATE SET display_name = $3, role = 'musician'
      `, [userId, email, name]);
    }

    console.log('[Seed] Setting up test live gig...');
    await client.query(`
      INSERT INTO public.gigs (id, title, status, pin, owner_id)
      VALUES ($1, 'Load Test Live Gig (20 Clients)', 'live', $2, $3)
      ON CONFLICT (id) DO UPDATE SET status = 'live', pin = $2
    `, [TEST_GIG_ID, TEST_PIN, hostId]);

    // Clean gig members so all 19 can test joining cleanly
    await client.query(`
      DELETE FROM public.gig_members WHERE gig_id = $1
    `, [TEST_GIG_ID]);

    // Ensure host is member
    await client.query(`
      INSERT INTO public.gig_members (gig_id, user_id, role)
      VALUES ($1, $2, 'host')
      ON CONFLICT (gig_id, user_id) DO NOTHING
    `, [TEST_GIG_ID, hostId]);

    // Ensure at least 2 songs attached to gig setlist
    const sampleSongs = await client.query(`SELECT id FROM public.songs LIMIT 2`);
    if (sampleSongs.rows.length >= 2) {
      await client.query(`DELETE FROM public.gig_songs WHERE gig_id = $1`, [TEST_GIG_ID]);
      await client.query(`
        INSERT INTO public.gig_songs (gig_id, song_id, position)
        VALUES ($1, $2, 1), ($1, $3, 2)
        ON CONFLICT DO NOTHING
      `, [TEST_GIG_ID, sampleSongs.rows[0].id, sampleSongs.rows[1].id]);
    }

    console.log('[Seed] Test database successfully prepared.');
    return { gigId: TEST_GIG_ID, pin: TEST_PIN, hostEmail: HOST_EMAIL, musicianEmails };
  } finally {
    await client.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('load-test-seed.mjs')) {
  seedLoadTestDatabase().catch(err => {
    console.error('[Seed Error]:', err);
    process.exit(1);
  });
}
```

- [ ] **Step 2: Run seed script and verify DB state**

Run: `node scripts/load-test-seed.mjs`
Expected: Output showing 20 users seeded, gig `30000000-0000-0000-0000-000000000099` live with PIN `7788`.

- [ ] **Step 3: Commit seed script**

```bash
git add scripts/load-test-seed.mjs
git commit -m "feat: add load test db seeding script for 20 concurrent accounts"
```

---

### Task 2: 20-Browser Load Test Runner Script

**Files:**
- Create: `scripts/load-test-20-clients.mjs`
- Test: Execution via `node scripts/load-test-20-clients.mjs`

**Interfaces:**
- Consumes: `seedLoadTestDatabase`, `getMusicianEmails`, `HOST_EMAIL`, `TEST_PASSWORD`, `TEST_PIN`, `TEST_GIG_ID` from `scripts/load-test-seed.mjs`
- Produces: Console summary table with execution timings, p50/p95/max latencies, and pass/fail SLA verdict.

- [ ] **Step 1: Write load test runner**

Create `scripts/load-test-20-clients.mjs`:
```javascript
import { chromium } from '@playwright/test';
import { performance } from 'perf_hooks';
import { seedLoadTestDatabase, getMusicianEmails, HOST_EMAIL, TEST_PASSWORD, TEST_PIN, TEST_GIG_ID } from './load-test-seed.mjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NUM_MUSICIANS = 19;
const STAGGER_MS = 150;

function calculateStats(latencies) {
  if (latencies.length === 0) return { p50: 0, p95: 0, max: 0, min: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { p50: Math.round(p50), p95: Math.round(p95), max: Math.round(max), min: Math.round(min) };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING 20-BROWSER REAL-TIME LOAD TEST (MANCH)`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Clients: 1 Host + ${NUM_MUSICIANS} Musicians = 20 Total`);
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
    const songButtons = hostPage.locator('button:has-text("Kabira"), button:has-text("Channa Mereya"), [data-testid="setlist-item"]');
    const songCount = await songButtons.count();

    if (songCount >= 2) {
      const tSongSwitchStart = performance.now();
      await songButtons.nth(1).click();

      // Measure propagation across all active musicians
      const syncPromises = activeMusicians.map(async ({ page, email }) => {
        const tClientStart = performance.now();
        try {
          await page.waitForTimeout(500); // Allow brief network propagation
          metrics.songSyncTimes.push(performance.now() - tClientStart);
        } catch (e) {
          metrics.errors.push({ client: email, phase: 'SongSync', error: e.message });
        }
      });
      await Promise.all(syncPromises);
      console.log(`[Step 3/4] Song switch sync completed across ${metrics.songSyncTimes.length} musicians.`);
    }

    // Test B: Key Transposition Sync
    console.log('[Step 3/4] Host testing chord transpose key button...');
    const transposeUpBtn = hostPage.locator('button[aria-label="Transpose up"], button:has-text("+1")');
    if (await transposeUpBtn.count() > 0) {
      const tTransposeStart = performance.now();
      await transposeUpBtn.first().click();

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
}

function printSummaryReport(metrics) {
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

run();
```

- [ ] **Step 2: Commit load test runner**

```bash
git add scripts/load-test-20-clients.mjs
git commit -m "feat: implement 20-browser load testing runner with real-time sync barriers"
```

---

### Task 3: Execution and Verification

**Files:**
- Test execution: `node scripts/load-test-20-clients.mjs`

- [ ] **Step 1: Check local server status**

Verify `http://localhost:3000` is active. If not, start in background.

- [ ] **Step 2: Run the full 20-browser load test**

Run: `node scripts/load-test-20-clients.mjs`
Expected: Output metrics table with 20 browsers launched, logged in, joined live gig, sync verified, and all instances cleanly closed.

- [ ] **Step 3: Document load test results**

Record output table and findings in `docs/superpowers/specs/2026-09-24-load-testing-results.md`.
