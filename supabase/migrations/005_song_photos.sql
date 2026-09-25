-- Song photos: storage bucket + table + policies
-- Run in Supabase SQL Editor.

-- 1. Storage bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'song-photos',
  'song-photos',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- 2. Storage RLS policies
drop policy if exists "Owner can upload song photos" on storage.objects;
create policy "Owner can upload song photos"
  on storage.objects for insert
  with check (
    bucket_id = 'song-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner can view own song photos" on storage.objects;
create policy "Owner can view own song photos"
  on storage.objects for select
  using (
    bucket_id = 'song-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_gig_member(
        ((storage.foldername(name))[2])::uuid,
        auth.uid()
      )
    )
  );

drop policy if exists "Owner can delete own song photos" on storage.objects;
create policy "Owner can delete own song photos"
  on storage.objects for delete
  using (
    bucket_id = 'song-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner can update own song photos" on storage.objects;
create policy "Owner can update own song photos"
  on storage.objects for update
  using (
    bucket_id = 'song-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. song_photos table
create table if not exists public.song_photos (
  id uuid primary key default uuid_generate_v4(),
  song_id uuid not null references public.songs(id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.song_photos enable row level security;

drop policy if exists "Owners can manage song photos" on public.song_photos;
create policy "Owners can manage song photos"
  on public.song_photos for all
  using (
    song_id in (
      select id from public.songs where owner_id = auth.uid()
    )
  );

drop policy if exists "Gig members can view song photos" on public.song_photos;
create policy "Gig members can view song photos"
  on public.song_photos for select
  using (
    song_id in (
      select ss.song_id
      from public.setlist_songs ss
      join public.gigs g on g.setlist_id = ss.setlist_id
      where public.is_gig_member(g.id, auth.uid())
    )
  );
