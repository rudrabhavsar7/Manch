import { chromium } from '@playwright/test';
import { performance } from 'perf_hooks';
import { seedLoadTestDatabase, getMusicianEmails, HOST_EMAIL, TEST_PASSWORD, TEST_PIN, TEST_GIG_ID } from './load-test-seed.mjs';

const BASE_URL = process.env.BASE_URL || 'https://manch-live.vercel.app';
const NUM = parseInt(process.env.NUM_MUSICIANS || '5', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '4', 10);

const CHROMIUM_ARGS = ['--disable-dev-shm-usage', '--no-sandbox', '--disable-gpu'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? Math.round(s[Math.floor(s.length * p)]) : 0;
};

const phases = {
  loginGoto: [], loginSubmit: [], loginToken: [], loginNav: [],
  joinGoto: [], joinPinReady: [], joinSubmit: [], joinForm: [], gigSsr: [],
};

async function login(page, email) {
  const t0 = performance.now();
  await page.goto(`${BASE_URL}/auth/login`, { timeout: 45000, waitUntil: 'load' });
  await page.waitForSelector('#email', { timeout: 30000 });
  const t1 = performance.now();
  phases.loginGoto.push(t1 - t0);

  await page.locator('#email').pressSequentially(email, { delay: 10 });
  await page.locator('#password').pressSequentially(TEST_PASSWORD, { delay: 10 });
  const t2 = performance.now();
  const tokenP = page.waitForResponse(r => r.url().includes('/auth/v1/token'), { timeout: 45000 });
  await page.click('button:has-text("Sign in")');
  await tokenP;
  const tTok = performance.now();
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  const t3 = performance.now();
  phases.loginSubmit.push(t3 - t2);
  phases.loginToken.push(tTok - t2);
  phases.loginNav.push(t3 - tTok);
  console.log(`  login ${email}: pageLoad=${Math.round(t1 - t0)}ms submit=${Math.round(t3 - t2)}ms (token=${Math.round(tTok - t2)}ms nav=${Math.round(t3 - tTok)}ms)`);
}

async function join(page) {
  const t0 = performance.now();
  await page.goto(`${BASE_URL}/gigs/join`, { timeout: 45000, waitUntil: 'load' });
  const pinInput = page.locator('#pin');
  await pinInput.waitFor({ state: 'visible', timeout: 30000 });
  const t1 = performance.now();
  phases.joinGoto.push(t1 - t0);

  const joinBtn = page.locator('button:has-text("Join Gig")');
  let attempts = 0;
  for (let i = 0; i < 6; i++) {
    attempts++;
    await pinInput.click();
    await pinInput.fill('');
    await pinInput.pressSequentially(TEST_PIN, { delay: 30 });
    await sleep(200);
    if (await joinBtn.isEnabled()) break;
  }
  const t2 = performance.now();
  phases.joinPinReady.push(t2 - t1);

  await joinBtn.click();
  await page.waitForURL(new RegExp(`/gigs/${TEST_GIG_ID}`), { timeout: 45000 });
  const tUrl = performance.now();
  await page.waitForSelector('text=Load Test Live Gig', { timeout: 45000 });
  const t3 = performance.now();
  phases.joinSubmit.push(t3 - t2);
  phases.joinForm.push(tUrl - t2);
  phases.gigSsr.push(t3 - tUrl);
  console.log(`  join: pageLoad=${Math.round(t1 - t0)}ms pinReady=${Math.round(t2 - t1)}ms(attempts=${attempts}) submit=${Math.round(t3 - t2)}ms (form=${Math.round(tUrl - t2)}ms ssr=${Math.round(t3 - tUrl)}ms)`);
}

(async () => {
  await seedLoadTestDatabase();
  const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
  const emails = getMusicianEmails(NUM);

  for (let b = 0; b < NUM; b += CONCURRENCY) {
    const slice = emails.slice(b, b + CONCURRENCY);
    console.log(`batch ${b / CONCURRENCY + 1}: ${slice.join(', ')}`);
    await Promise.all(slice.map(async (email, i) => {
      await sleep(i * 250);
      const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
      const page = await ctx.newPage();
      await login(page, email);
      await join(page);
    }));
  }

  console.log('\n=== PHASE STATS (ms) ===');
  for (const [k, v] of Object.entries(phases)) {
    if (!v.length) continue;
    console.log(`${k}: n=${v.length} p50=${pct(v, 0.5)} p95=${pct(v, 0.95)} max=${Math.round(Math.max(...v))}`);
  }
  await browser.close();
})();
