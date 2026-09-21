-- Fix RLS permissions on gig_members for join flow upsert
-- PostgREST upsert requires SELECT and UPDATE permissions in addition to INSERT

drop policy if exists "Users can view own membership" on public.gig_members;
create policy "Users can view own membership"
  on public.gig_members for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own membership" on public.gig_members;
create policy "Users can update own membership"
  on public.gig_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and role = 'musician');
