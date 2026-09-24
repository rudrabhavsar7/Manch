import { Client } from 'pg';

const DB_CONNECTION = process.env.DATABASE_URL || 'postgresql://postgres:xLWcBNrftny696st@db.uedphvuuunnaeaopadfz.supabase.co:5432/postgres';
export const TEST_GIG_ID = '30000000-0000-0000-0000-000000000099';
export const TEST_SETLIST_ID = '20000000-0000-0000-0000-000000000099';
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
    console.log('[Seed] Seeding 20 test accounts in auth.users, auth.identities, and public.users...');
    
    // Host user ID
    const hostId = '00000000-0000-0000-0000-000000000099';
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      )
      VALUES (
        $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3, now(),
        '{"provider":"email","providers":["email"]}', '{"display_name":"Load Host","email_verified":true}', now(), now(),
        '', '', '', ''
      )
      ON CONFLICT (id) DO UPDATE SET
        encrypted_password = $3,
        email_confirmed_at = now(),
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        raw_user_meta_data = '{"display_name":"Load Host","email_verified":true}'::jsonb
    `, [hostId, HOST_EMAIL, BCRYPT_HASH]);

    await client.query(`
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
      VALUES ($1::uuid, $1::uuid, json_build_object('sub', $1::text, 'email', $2::text), 'email', $1::text, now(), now())
      ON CONFLICT (id) DO UPDATE SET updated_at = now()
    `, [hostId, HOST_EMAIL]);

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
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change
        )
        VALUES (
          $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3, now(),
          '{"provider":"email","providers":["email"]}', json_build_object('display_name', $4::text, 'email_verified', true), now(), now(),
          '', '', '', ''
        )
        ON CONFLICT (id) DO UPDATE SET
          encrypted_password = $3,
          email_confirmed_at = now(),
          confirmation_token = '',
          recovery_token = '',
          email_change_token_new = '',
          email_change = '',
          raw_user_meta_data = json_build_object('display_name', $4::text, 'email_verified', true)
      `, [userId, email, BCRYPT_HASH, name]);

      await client.query(`
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
        VALUES ($1::uuid, $1::uuid, json_build_object('sub', $1::text, 'email', $2::text), 'email', $1::text, now(), now())
        ON CONFLICT (id) DO UPDATE SET updated_at = now()
      `, [userId, email]);

      await client.query(`
        INSERT INTO public.users (id, email, display_name, instrument, role)
        VALUES ($1, $2, $3, 'Acoustic Guitar', 'musician')
        ON CONFLICT (id) DO UPDATE SET display_name = $3, role = 'musician'
      `, [userId, email, name]);
    }

    console.log('[Seed] Setting up test setlist and songs...');
    await client.query(`
      INSERT INTO public.setlists (id, name, owner_id, privacy)
      VALUES ($1, 'Load Test Setlist', $2, 'public')
      ON CONFLICT (id) DO UPDATE SET name = 'Load Test Setlist', owner_id = $2
    `, [TEST_SETLIST_ID, hostId]);

    // Ensure at least 2 songs attached to gig setlist
    const sampleSongs = await client.query(`SELECT id FROM public.songs ORDER BY created_at ASC LIMIT 2`);
    if (sampleSongs.rows.length >= 2) {
      await client.query(`DELETE FROM public.setlist_songs WHERE setlist_id = $1`, [TEST_SETLIST_ID]);
      await client.query(`
        INSERT INTO public.setlist_songs (setlist_id, song_id, position)
        VALUES ($1, $2, 1), ($1, $3, 2)
        ON CONFLICT DO NOTHING
      `, [TEST_SETLIST_ID, sampleSongs.rows[0].id, sampleSongs.rows[1].id]);
    }

    console.log('[Seed] Setting up test live gig...');
    await client.query(`
      INSERT INTO public.gigs (id, name, status, pin, admin_id, setlist_id)
      VALUES ($1, 'Load Test Live Gig (20 Clients)', 'live', $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        name = 'Load Test Live Gig (20 Clients)',
        status = 'live',
        pin = $2,
        admin_id = $3,
        setlist_id = $4
    `, [TEST_GIG_ID, TEST_PIN, hostId, TEST_SETLIST_ID]);

    // Clean gig members so all 19 can test joining cleanly
    await client.query(`
      DELETE FROM public.gig_members WHERE gig_id = $1
    `, [TEST_GIG_ID]);

    // Ensure host is member
    await client.query(`
      INSERT INTO public.gig_members (gig_id, user_id, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (gig_id, user_id) DO UPDATE SET role = 'admin'
    `, [TEST_GIG_ID, hostId]);

    console.log('[Seed] Test database successfully prepared.');
    const accounts = [
      { email: HOST_EMAIL, role: 'admin' },
      ...musicianEmails.map(email => ({ email, role: 'musician' }))
    ];
    return { gigId: TEST_GIG_ID, pin: TEST_PIN, hostEmail: HOST_EMAIL, musicianEmails, accounts };
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
