import { test, expect, Page } from '@playwright/test';

const TS = Date.now();
const SONG_TITLE = `Photo E2E Song ${TS}`;
const SETLIST_NAME = `Photo E2E Setlist ${TS}`;
const GIG_TITLE = `Photo E2E Gig ${TS}`;

async function login(page: Page) {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('rudra@manch.app');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}

test('create song with photos, persists on edit, photo mode in live view', async ({
  page,
}) => {
  test.setTimeout(240000);
  await login(page);

  // 1. Create song with lyrics + 2 photos
  await page.goto('/songs/new');
  await page.waitForLoadState('networkidle');
  const titleInput = page.getByLabel(/^Title/);
  await titleInput.fill(SONG_TITLE);
  await expect(titleInput).toHaveValue(SONG_TITLE);
  await page.getByLabel(/Lyrics & Chords/i).fill('[G]E2E photo lyrics line');
  await page.getByTestId('photo-file-input').setInputFiles([
    'tests/e2e/fixtures/photo1.png',
    'tests/e2e/fixtures/photo2.png',
  ]);
  await expect(page.getByText('New', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: /save song/i }).click();
  await page.waitForURL('**/songs');

  // 2. Edit page shows persisted photos (no New badges)
  await page.getByRole('link', { name: SONG_TITLE }).click();
  await page.waitForURL(/\/songs\/[0-9a-f-]+/);
  await expect(page.getByRole('heading', { name: 'Edit Song' })).toBeVisible();
  await expect(page.getByTestId('photo-uploader').locator('img')).toHaveCount(2);
  await expect(page.getByText('New', { exact: true })).toHaveCount(0);

  // 3. Create setlist containing the song
  await page.goto('/setlists/new');
  await page.waitForLoadState('networkidle');
  const nameInput = page.getByPlaceholder('e.g. Friday Night Live');
  await nameInput.fill(SETLIST_NAME);
  await expect(nameInput).toHaveValue(SETLIST_NAME);
  await page.getByRole('button', { name: /add song/i }).click();
  await page.getByLabel('Search songs').fill(SONG_TITLE);
  await page.getByRole('button', { name: SONG_TITLE }).click();
  await page.getByRole('button', { name: /save setlist/i }).click();
  await page.waitForURL('**/setlists');

  // 4. Create gig with that setlist -> goes live
  await page.goto('/gigs/new');
  await page.waitForLoadState('networkidle');
  const gigTitleInput = page.getByPlaceholder('Friday Night at Blue Frog');
  await gigTitleInput.fill(GIG_TITLE);
  await expect(gigTitleInput).toHaveValue(GIG_TITLE);
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: SETLIST_NAME }).click();
  await page.getByRole('button', { name: /create & go live/i }).click();
  await page.waitForURL(/\/gigs\/[0-9a-f-]+/);

  // 5. Live view: select song, toggle to photo mode, navigate photos
  const setlistItem = page
    .locator('[data-testid^="setlist-item-"]')
    .filter({ hasText: SONG_TITLE });
  await setlistItem.click();

  const viewToggle = page.getByTestId('view-toggle');
  await expect(viewToggle).toBeVisible();
  await viewToggle.click();

  const viewer = page.getByTestId('photo-viewer');
  await expect(viewer).toBeVisible();
  await expect(page.getByTestId('photo-counter')).toHaveText('1/2');

  await page.getByTestId('photo-next').click();
  await expect(page.getByTestId('photo-counter')).toHaveText('2/2');

  await page.getByTestId('photo-prev').click();
  await expect(page.getByTestId('photo-counter')).toHaveText('1/2');

  // Back to lyrics view
  await viewToggle.click();
  await expect(viewer).toHaveCount(0);
  await expect(page.getByTestId('song-scroll-container')).toBeVisible();

  // 6. Cleanup: end the gig, verify it leaves the live list
  await page.getByTestId('admin-end-gig').click();
  await page.waitForTimeout(2000);
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(GIG_TITLE)).toHaveCount(0);
});

