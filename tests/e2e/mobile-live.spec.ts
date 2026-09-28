import { test, expect, Page } from '@playwright/test';

const TS = Date.now();
const LONG_TITLE = `Mobile Guard Song ${TS}`;
const SETLIST_NAME = `Mobile Guard Setlist ${TS}`;
const GIG_TITLE = `Mobile Guard Gig ${TS}`;

const LONG_CONTENT = [
  '[Verse 1]',
  '[G]Yeh duniya ek khel khilona aur yeh zamana hai masti ka deewana sabhi ko aata hai gana',
  '[D]Raata ko jaagna savere uthna har pal hai yeh zindagi ka rangini ka thikana kabhi kabhi',
  '[Chorus]',
  '[G]Chogada tara chogada tara chogada tara chogada tara chore chore chore re re re re',
  '[C]Thumka laga thumka laga thumka laga thumka laga re dhoom macha de re sabko nacha de',
].join('\n');

async function login(page: Page) {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('rudra@manch.app');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}

async function buildLiveGig(page: Page) {
  await page.goto('/songs/new');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/Lyrics & Chords/i).fill(LONG_CONTENT);
  await page.getByTestId('photo-file-input').setInputFiles([
    'tests/e2e/fixtures/photo1.png',
    'tests/e2e/fixtures/photo2.png',
  ]);
  await expect(page.getByText('New', { exact: true })).toHaveCount(2);
  const titleInput = page.getByLabel(/^Title/);
  await titleInput.fill(LONG_TITLE);
  await expect(titleInput).toHaveValue(LONG_TITLE);
  await page.getByRole('button', { name: /save song/i }).click();
  await page.waitForURL('**/songs');

  await page.goto('/setlists/new');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /add song/i }).click();
  await page.getByLabel('Search songs').fill(LONG_TITLE);
  await page.getByRole('button', { name: LONG_TITLE }).click({ force: true, timeout: 10000 });
  const nameInput = page.getByPlaceholder('e.g. Friday Night Live');
  await nameInput.fill(SETLIST_NAME);
  await expect(nameInput).toHaveValue(SETLIST_NAME);
  await page.getByRole('button', { name: /save setlist/i }).click();
  await page.waitForURL('**/setlists');

  await page.goto('/gigs/new');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('Friday Night at Blue Frog').fill(GIG_TITLE);
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: SETLIST_NAME }).click();
  await page.getByRole('button', { name: /create & go live/i }).click();
  await page.waitForURL(/\/gigs\/[0-9a-f-]+/);
  await page.waitForLoadState('networkidle');
}

test('live view fits a 390px phone without horizontal overflow', async ({ page }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await buildLiveGig(page);

  // L1: no document overflow, admin bar fits
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    vw: window.innerWidth,
    footer: document.querySelector('footer')?.scrollWidth ?? 0,
  }));
  expect(overflow.doc).toBeLessThanOrEqual(overflow.vw);
  expect(overflow.footer).toBeLessThanOrEqual(overflow.vw);

  // L3: song header compact (was 213px)
  const headerH = await page.evaluate(() => {
    const h1 = document.querySelector('main h1');
    return Math.round(h1?.closest('.p-3, .p-4')?.getBoundingClientRect().height ?? 0);
  });
  console.log('HEADER_HEIGHT', headerH);
  expect(headerH).toBeGreaterThan(0);
  expect(headerH).toBeLessThanOrEqual(170);

  // L2: lyrics wrap, no horizontal clipping
  const lyrics = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="song-scroll-container"]');
    return el ? { scrollW: el.scrollWidth, clientW: el.clientWidth } : null;
  });
  expect(lyrics).not.toBeNull();
  expect(lyrics!.scrollW).toBeLessThanOrEqual(lyrics!.clientW + 1);

  // L6: PIN visible on phone
  await expect(page.getByText(/PIN: \d{4}/)).toBeVisible();

  // L5: drawer opens and closes on song select
  await page.getByLabel('Open setlist').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid^="setlist-item-"]').first().click();
  await expect(dialog).toBeHidden();

  // L4: photo mode + fullscreen toolbar within viewport
  await page.getByTestId('view-toggle').click();
  await page.getByTestId('photo-viewer').waitFor();
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-testid="photo-viewer"] img') as HTMLImageElement | null;
    return !!img && img.complete && img.naturalWidth > 0;
  });

  const photoToolbar = await page.evaluate(() => {
    const tb = document.querySelector('[data-testid="photo-viewer"] .absolute.bottom-4');
    if (!tb) return null;
    const r = tb.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
  });
  expect(photoToolbar).not.toBeNull();
  expect(photoToolbar!.left).toBeGreaterThanOrEqual(0);
  expect(photoToolbar!.right).toBeLessThanOrEqual(photoToolbar!.vw);

  await page.getByTestId('photo-fullscreen').click();
  await page.waitForTimeout(500);
  const fsToolbar = await page.evaluate(() => {
    const tb = document.querySelector('[data-testid="photo-viewer"] .absolute.bottom-4');
    if (!tb) return null;
    const r = tb.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
  });
  expect(fsToolbar).not.toBeNull();
  expect(fsToolbar!.left).toBeGreaterThanOrEqual(0);
  expect(fsToolbar!.right).toBeLessThanOrEqual(fsToolbar!.vw);
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForTimeout(300);

  // cleanup: end gig
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByTestId('admin-end-gig').click();
  await page.waitForURL('**/dashboard');
});
