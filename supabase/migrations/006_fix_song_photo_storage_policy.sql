-- Fix song photo storage SELECT policy: folder[2] is song_id, not gig_id.
-- Old policy passed song_id to is_gig_member(gig_id, ...) -> always false,
-- so gig members (audience) could not create signed URLs for owner's photos.

drop policy if exists "Owner can view own song photos" on storage.objects;

create policy "Owner can view own song photos"
  on storage.objects for select
  using (
    bucket_id = 'song-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        ((storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
        and exists (
          select 1
          from public.setlist_songs ss
          join public.gigs g on g.setlist_id = ss.setlist_id
          where ss.song_id = ((storage.foldername(storage.objects.name))[2])::uuid
            and public.is_gig_member(g.id, auth.uid())
        )
      )
    )
  );
