-- ==================
-- SEED DATA
-- ==================

-- 1. Sample Auth Users (Supabase Auth)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rohan@manch.app',
    '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Rohan Sharma"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'arjun@manch.app',
    '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Arjun Patel"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sarah@manch.app',
    '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Sarah Chen"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'priya@manch.app',
    '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Priya Nair"}',
    now(),
    now()
  )
on conflict (id) do nothing;

-- 2. Public Users profiles
insert into public.users (id, email, display_name, instrument, role, avatar_url)
values
  ('00000000-0000-0000-0000-000000000001', 'rohan@manch.app', 'Rohan Sharma', 'Vocals / Acoustic Guitar', 'admin', null),
  ('00000000-0000-0000-0000-000000000002', 'arjun@manch.app', 'Arjun Patel', 'Lead Guitar', 'co-admin', null),
  ('00000000-0000-0000-0000-000000000003', 'sarah@manch.app', 'Sarah Chen', 'Bass Guitar', 'musician', null),
  ('00000000-0000-0000-0000-000000000004', 'priya@manch.app', 'Priya Nair', 'Drums / Percussion', 'musician', null)
on conflict (id) do update set
  display_name = excluded.display_name,
  instrument = excluded.instrument,
  role = excluded.role;

-- 3. Sample Songs
insert into public.songs (id, title, artist, key, bpm, content, structure, owner_id)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'Kabira',
    'Tochi Raina, Rekha Bhardwaj',
    'D',
    85,
    '[D]Bano re bano meri chali sasuraal ko
[Bm]Aankhiyon mein paani de gayi
[G]Duaa mein meethi gud dhaani de gayi
[A]Re Kabira maan jaa, re Fakeera maan jaa

[D]Kaisi teri khudgarzi
[Bm]Lab namak rame na mishri
[G]Kaisi teri khudgarzi
[A]Zamaana yeh zamaana bole na',
    '[{"type":"verse","label":"Verse 1","startLine":1,"endLine":4},{"type":"chorus","label":"Chorus","startLine":5,"endLine":8}]'::jsonb,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Hotel California',
    'Eagles',
    'Bm',
    75,
    '[Bm]On a dark desert highway, [F#]cool wind in my hair
[A]Warm smell of colitas, [E]rising up through the air
[G]Up ahead in the distance, [D]I saw a shimmering light
[Em]My head grew heavy and my sight grew dim, [F#]I had to stop for the night

[G]Welcome to the Hotel Cali[D]fornia
Such a [F#]lovely place, such a [Bm]lovely face
[G]Plenty of room at the Hotel Cali[D]fornia
Any [Em]time of year, you can [F#]find it here',
    '[{"type":"verse","label":"Verse 1","startLine":1,"endLine":4},{"type":"chorus","label":"Chorus","startLine":5,"endLine":8}]'::jsonb,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Fix You',
    'Coldplay',
    'Eb',
    138,
    '[Eb]When you try your best, but you [Gm]don''t succeed
[Cm7]When you get what you want, but [Bb]not what you need
[Eb]When you feel so tired, but you [Gm]can''t sleep
[Cm7]Stuck in re[Bb]verse

[Ab]Lights will [Eb]guide you [Bb]home
[Ab]And ig[Eb]nite your [Bb]bones
[Ab]And I will [Eb]try to [Bb]fix you',
    '[{"type":"verse","label":"Verse 1","startLine":1,"endLine":4},{"type":"chorus","label":"Chorus","startLine":5,"endLine":7}]'::jsonb,
    '00000000-0000-0000-0000-000000000001'
  )
on conflict (id) do nothing;

-- 4. Sample Setlist
insert into public.setlists (id, name, owner_id, privacy)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'Friday Acoustic Showcase',
    '00000000-0000-0000-0000-000000000001',
    'public'
  )
on conflict (id) do nothing;

-- 5. Setlist Songs
insert into public.setlist_songs (id, setlist_id, song_id, position)
values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 0),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 2)
on conflict (id) do nothing;

-- 6. Sample Gig
insert into public.gigs (id, name, admin_id, setlist_id, pin, status)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'Live at The Habitat',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '4821',
    'live'
  )
on conflict (id) do nothing;

-- 7. Gig Members
insert into public.gig_members (id, gig_id, user_id, role)
values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'co-admin'),
  ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'musician')
on conflict (id) do nothing;

-- 8. Sample Annotations
insert into public.annotations (id, user_id, song_id, type, line_number, content, color)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'inline',
    3,
    'Delay pedal on + light chorus',
    '#fbbf24'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'general',
    null,
    'Twin guitar solo breakdown at outro with Arjun',
    '#60a5fa'
  )
on conflict (id) do nothing;

-- 9. Sample Setlist Shares
insert into public.setlist_shares (id, setlist_id, user_id, permission, shared_by)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    'view',
    '00000000-0000-0000-0000-000000000001'
  )
on conflict (id) do nothing;
