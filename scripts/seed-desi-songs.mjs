import fs from 'fs';
import crypto from 'crypto';
import { Client } from 'pg';

const env = fs.readFileSync('.env.local', 'utf8');
const pass = env.match(/DB Password:\s*(\S+)/)[1];
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const anon = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const conn = `postgresql://postgres:${pass}@db.uedphvuuunnaeaopadfz.supabase.co:5432/postgres`;

const USER_ID = '81ba7e2d-4058-4e15-9706-8c866d2b4379'; // rudra@manch.app
const EMAIL = 'rudra@manch.app';
const PASSWORD = 'password123';
const BOOK = 'Desi (2 Tali)';
const SPLIT_DIR = 'D:/Navratri2026/desi/split';

const manifest = JSON.parse(fs.readFileSync(`${SPLIT_DIR}/manifest.json`, 'utf8'));
if (manifest.total !== 70 || manifest.songs.length !== 70) {
  throw new Error(`expected 70 songs in manifest, got ${manifest.songs.length}`);
}
const titles = new Set(manifest.songs.map((s) => s.title));
console.log(`manifest: ${manifest.songs.length} songs, ${titles.size} unique titles`);

async function login() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status} ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token;
}

async function storageUpload(token, path, data) {
  const res = await fetch(`${url}/storage/v1/object/song-photos/${path}`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: data,
  });
  if (!res.ok) throw new Error(`upload ${path} failed: ${res.status} ${await res.text()}`);
}

async function run() {
  const client = new Client({ connectionString: conn });
  await client.connect();
  const token = await login();
  console.log('Authenticated as', EMAIL);

  const existing = await client.query(
    `SELECT title FROM public.songs WHERE owner_id = $1 AND artist = $2`,
    [USER_ID, BOOK],
  );
  const have = new Set(existing.rows.map((r) => r.title));
  console.log(`existing ${BOOK} songs in DB: ${have.size} (append-only, no wipe)`);

  let added = 0;
  let skipped = 0;
  for (const s of manifest.songs) {
    if (have.has(s.title)) {
      skipped++;
      continue;
    }
    const songId = crypto.randomUUID();
    const data = fs.readFileSync(`${SPLIT_DIR}/${s.file}`);
    const storagePath = `${USER_ID}/${songId}/1.jpg`;

    await client.query(
      `INSERT INTO public.songs (id, title, artist, key, content, owner_id)
       VALUES ($1, $2, $3, '', '', $4)`,
      [songId, s.title, BOOK, USER_ID],
    );
    await storageUpload(token, storagePath, data);
    await client.query(
      `INSERT INTO public.song_photos (song_id, storage_path, position)
       VALUES ($1, $2, 0)`,
      [songId, storagePath],
    );
    added++;
    if (added % 10 === 0) console.log(`  seeded ${added} (skipped ${skipped})`);
  }

  const count = await client.query(
    `SELECT count(*)::int AS n FROM public.songs WHERE owner_id = $1`,
    [USER_ID],
  );
  const bookCount = await client.query(
    `SELECT count(*)::int AS n FROM public.songs WHERE owner_id = $1 AND artist = $2`,
    [USER_ID, BOOK],
  );
  console.log(
    `DONE: added ${added}, skipped ${skipped}; ${BOOK}=${bookCount.rows[0].n} total songs=${count.rows[0].n}`,
  );
  await client.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
