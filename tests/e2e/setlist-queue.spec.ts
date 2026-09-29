import { test, expect, Page } from '@playwright/test';

const TS = Date.now();
const SHARED_SONG = `Queue Shared Song ${TS}`;
const BRAVO_ONLY_SONG = `Queue Bravo Song ${TS}`;
const ALPHA = `Queue Alpha ${TS}`;
const BRAVO = `Queue Bravo ${TS}`;
const CHARLIE = `Queue Charlie ${TS}`;
const GIG_TITLE = `Queue Gig ${TS}`;

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

async function createSong(page: Page, title: string) {
  await page.goto('/songs/new');
  await page.waitForLoadState('networkidle');
  const titleInput = page.getByLabel(/^Title/);
  await titleInput.fill(title);
  await expect(titleInput).toHaveValue(title);
  await page.getByLabel(/Lyrics & Chords/i).fill('[G]queue e2e lyrics line');
  await page.getByRole('button', { name: /save song/i }).click();
  await page.waitForURL('**/songs');
}

async function createSetlist(page: Page, name: string, songs: string[]) {
  await page.goto('/setlists/new');
  await page.waitForLoadState('networkidle');
  const nameInput = page.getByPlaceholder('e.g. Friday Night Live');
  await nameInput.fill(name);
  await expect(nameInput).toHaveValue(name);
  for (const song of songs) {
    await page.getByRole('button', { name: /add song/i }).click();
    await page.getByLabel('Search songs').fill(song);
    await page.getByRole('button', { name: song }).click({ force: true, timeout: 10000 });
  }
  await page.getByRole('button', { name: /save setlist/i }).click();
  await page.waitForURL('**/setlists');
}

test('admin swaps setlists mid-gig: switch keeps active song, remove and re-add tab', async ({
  page,
}) => {
  test.setTimeout(300000);
  await login(page);

  await createSong(page, SHARED_SONG);
  await createSong(page, BRAVO_ONLY_SONG);
  await createSetlist(page, ALPHA, [SHARED_SONG]);
  await createSetlist(page, BRAVO, [SHARED_SONG, BRAVO_ONLY_SONG]);
  await createSetlist(page, CHARLIE, [SHARED_SONG]);

  await page.goto('/gigs/new');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('Friday Night at Blue Frog').fill(GIG_TITLE);
  for (const name of [ALPHA, BRAVO, CHARLIE]) {
    await page.getByRole('checkbox', { name }).click();
  }
  await page.getByRole('button', { name: /create & go live/i }).click();
  await page.waitForURL(/\/gigs\/[0-9a-f-]+/);
  await page.waitForLoadState('networkidle');

  const tabs = page.getByTestId('queue-tabs');
  await expect(tabs).toBeVisible();
  await expect(page.getByTestId('active-setlist-name')).toHaveText(ALPHA);
  await expect(tabs.getByRole('button', { name: BRAVO, exact: true })).toBeVisible();
  await expect(
    tabs.getByRole('button', { name: ALPHA, exact: true })
  ).toHaveAttribute('aria-current', 'true');

  await page
    .locator('[data-testid^="setlist-item-"]')
    .filter({ hasText: SHARED_SONG })
    .click();
  const sharedItem = page
    .locator('[data-testid^="setlist-item-"]')
    .filter({ hasText: SHARED_SONG });
  await expect(sharedItem).toHaveClass(/bg-primary/);

  await tabs.getByRole('button', { name: BRAVO, exact: true }).click();
  await expect(page.getByTestId('active-setlist-name')).toHaveText(BRAVO);
  await expect(page.locator('[data-testid^="setlist-item-"]')).toHaveCount(2);
  await expect(sharedItem).toHaveClass(/bg-primary/);
  await expect(
    tabs.getByRole('button', { name: BRAVO, exact: true })
  ).toHaveAttribute('aria-current', 'true');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('queue-tabs')).toBeVisible();
  await expect(page.getByTestId('active-setlist-name')).toHaveText(BRAVO);
  await expect(page.locator('[data-testid^="setlist-item-"]')).toHaveCount(2);

  await page.getByRole('button', { name: `Remove ${ALPHA}` }).click();
  await expect(tabs.getByRole('button', { name: ALPHA, exact: true })).toHaveCount(0);
  await expect(page.getByTestId('active-setlist-name')).toHaveText(BRAVO);

  await page.getByRole('button', { name: 'Add setlist' }).click();
  const options = page.getByTestId('add-setlist-options');
  await expect(options).toBeVisible();
  await expect(options.getByRole('button', { name: CHARLIE, exact: true })).toHaveCount(0);
  await options.getByRole('button', { name: ALPHA, exact: true }).click();
  await expect(tabs.getByRole('button', { name: ALPHA, exact: true })).toBeVisible();

  await page.getByTestId('admin-end-gig').click();
  await page.waitForURL('**/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(GIG_TITLE)).toHaveCount(0);
});
