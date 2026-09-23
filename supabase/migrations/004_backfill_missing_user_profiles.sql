-- Backfill public.users for any auth.users rows missing a profile.
-- Fixes FK violation on gig_members for pre-trigger users (e.g. daksh).
-- Run in Supabase SQL Editor.

insert into public.users (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'display_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1),
    ''
  )
from auth.users u
left join public.users p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
