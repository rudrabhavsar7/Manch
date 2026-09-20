-- Fix RLS recursion on setlists, setlist_shares, and setlist_songs

-- 1. Security definer function to check setlist ownership without triggering RLS recursion
create or replace function public.is_setlist_owner(check_setlist_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.setlists
    where id = check_setlist_id and owner_id = check_user_id
  );
$$;

-- 2. Replace setlist_shares policy to break recursion loop with setlists
drop policy if exists "Setlist owner can manage shares" on public.setlist_shares;
create policy "Setlist owner can manage shares"
  on public.setlist_shares for all
  using (
    auth.uid() = shared_by
    or public.is_setlist_owner(setlist_id, auth.uid())
  );

-- 3. Replace setlist_songs policy to use security definer function
drop policy if exists "Setlist owner can CRUD setlist songs" on public.setlist_songs;
create policy "Setlist owner can CRUD setlist songs"
  on public.setlist_songs for all
  using (public.is_setlist_owner(setlist_id, auth.uid()));
