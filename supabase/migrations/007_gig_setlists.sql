-- Gig setlist queue: multiple setlists per gig.
-- gigs.setlist_id keeps meaning "active setlist" (all existing RLS joins stay valid).

create table if not exists public.gig_setlists (
  id uuid primary key default uuid_generate_v4(),
  gig_id uuid not null references public.gigs(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  setlist_name text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (gig_id, setlist_id)
);

create index if not exists gig_setlists_gig_position_idx
  on public.gig_setlists (gig_id, position);

alter table public.gig_setlists enable row level security;

drop policy if exists "Members can view gig setlist queue" on public.gig_setlists;
create policy "Members can view gig setlist queue"
  on public.gig_setlists for select
  to authenticated
  using (public.is_gig_member(gig_id, auth.uid()));

drop policy if exists "Gig admins can add setlists to queue" on public.gig_setlists;
create policy "Gig admins can add setlists to queue"
  on public.gig_setlists for insert
  to authenticated
  with check (
    (
      exists (
        select 1 from public.gigs g
        where g.id = gig_id and g.admin_id = auth.uid()
      )
      or public.is_gig_co_admin(gig_id, auth.uid())
    )
    and setlist_id in (
      select id from public.setlists where owner_id = auth.uid()
    )
  );

drop policy if exists "Gig admins can remove setlists from queue" on public.gig_setlists;
create policy "Gig admins can remove setlists from queue"
  on public.gig_setlists for delete
  to authenticated
  using (
    exists (
      select 1 from public.gigs g
      where g.id = gig_id and g.admin_id = auth.uid()
    )
    or public.is_gig_co_admin(gig_id, auth.uid())
  );

grant select, insert, update, delete on public.gig_setlists to authenticated;

-- Backfill: one queue row per existing gig (its active setlist).
insert into public.gig_setlists (gig_id, setlist_id, setlist_name, position)
select g.id, g.setlist_id, coalesce(sl.name, ''), 0
from public.gigs g
left join public.setlists sl on sl.id = g.setlist_id
where g.setlist_id is not null
  and not exists (
    select 1 from public.gig_setlists gs where gs.gig_id = g.id
  )
on conflict (gig_id, setlist_id) do nothing;
