-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ==================
-- USERS (extends auth.users)
-- ==================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  instrument text not null default '',
  role text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Allow users to see other users' display names (for member lists)
create policy "Users can view other users display info"
  on public.users for select
  using (true);

-- ==================
-- SONGS
-- ==================
create table public.songs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  artist text not null default '',
  key text not null default '',
  bpm integer,
  content text not null default '',
  structure jsonb not null default '[]'::jsonb,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.songs enable row level security;

create policy "Users can CRUD own songs"
  on public.songs for all
  using (auth.uid() = owner_id);

-- Gig members can read songs in their gig's setlist
create policy "Gig members can read setlist songs"
  on public.songs for select
  using (
    id in (
      select ss.song_id from public.setlist_songs ss
      join public.gigs g on g.setlist_id = ss.setlist_id
      join public.gig_members gm on gm.gig_id = g.id
      where gm.user_id = auth.uid()
        and g.status in ('live', 'ended')
    )
  );

-- ==================
-- SETLISTS
-- ==================
create table public.setlists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  privacy text not null default 'private' check (privacy in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.setlists enable row level security;

create policy "Users can CRUD own setlists"
  on public.setlists for all
  using (auth.uid() = owner_id);

create policy "Shared users can view private setlists"
  on public.setlists for select
  using (
    id in (
      select setlist_id from public.setlist_shares
      where user_id = auth.uid()
    )
  );

create policy "Gig members can view gig setlists"
  on public.setlists for select
  using (
    id in (
      select g.setlist_id from public.gigs g
      join public.gig_members gm on gm.gig_id = g.id
      where gm.user_id = auth.uid()
    )
  );

-- ==================
-- SETLIST_SONGS (join table)
-- ==================
create table public.setlist_songs (
  id uuid primary key default uuid_generate_v4(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null default 0
);

alter table public.setlist_songs enable row level security;

create policy "Setlist owner can CRUD setlist songs"
  on public.setlist_songs for all
  using (
    setlist_id in (
      select id from public.setlists where owner_id = auth.uid()
    )
  );

create policy "Gig members can view setlist songs"
  on public.setlist_songs for select
  using (
    setlist_id in (
      select g.setlist_id from public.gigs g
      join public.gig_members gm on gm.gig_id = g.id
      where gm.user_id = auth.uid()
    )
  );

-- ==================
-- GIGS
-- ==================
create table public.gigs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  admin_id uuid not null references public.users(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  pin text not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.gigs enable row level security;

create policy "Admin can CRUD own gigs"
  on public.gigs for all
  using (auth.uid() = admin_id);

create policy "Co-admins can update gigs"
  on public.gigs for update
  using (
    id in (
      select gig_id from public.gig_members
      where user_id = auth.uid() and role = 'co-admin'
    )
  );

create policy "Members can view their gigs"
  on public.gigs for select
  using (
    id in (
      select gig_id from public.gig_members
      where user_id = auth.uid()
    )
  );

-- Allow anyone to look up active gigs by PIN (for joining)
create policy "Anyone can find active gigs by PIN"
  on public.gigs for select
  using (status = 'live');

-- ==================
-- GIG_MEMBERS
-- ==================
create table public.gig_members (
  id uuid primary key default uuid_generate_v4(),
  gig_id uuid not null references public.gigs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'musician' check (role in ('admin', 'co-admin', 'musician')),
  joined_at timestamptz not null default now(),
  unique (gig_id, user_id)
);

alter table public.gig_members enable row level security;

create policy "Admin can manage gig members"
  on public.gig_members for all
  using (
    gig_id in (
      select id from public.gigs where admin_id = auth.uid()
    )
  );

create policy "Co-admins can view gig members"
  on public.gig_members for select
  using (
    gig_id in (
      select gig_id from public.gig_members
      where user_id = auth.uid() and role = 'co-admin'
    )
  );

create policy "Users can insert themselves as members"
  on public.gig_members for insert
  with check (auth.uid() = user_id);

create policy "Members can view fellow members"
  on public.gig_members for select
  using (
    gig_id in (
      select gig_id from public.gig_members
      where user_id = auth.uid()
    )
  );

-- ==================
-- ANNOTATIONS
-- ==================
create table public.annotations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  type text not null default 'general' check (type in ('inline', 'general')),
  line_number integer,
  content text not null default '',
  color text not null default '#fbbf24',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.annotations enable row level security;

-- Annotations are strictly private
create policy "Users can CRUD own annotations only"
  on public.annotations for all
  using (auth.uid() = user_id);

-- ==================
-- SETLIST_SHARES
-- ==================
create table public.setlist_shares (
  id uuid primary key default uuid_generate_v4(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view', 'edit')),
  shared_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (setlist_id, user_id)
);

alter table public.setlist_shares enable row level security;

create policy "Setlist owner can manage shares"
  on public.setlist_shares for all
  using (
    setlist_id in (
      select id from public.setlists where owner_id = auth.uid()
    )
  );

create policy "Shared users can view their shares"
  on public.setlist_shares for select
  using (auth.uid() = user_id);

-- ==================
-- FUNCTIONS & TRIGGERS
-- ==================

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger songs_updated_at
  before update on public.songs
  for each row execute function public.update_updated_at();

create trigger setlists_updated_at
  before update on public.setlists
  for each row execute function public.update_updated_at();

create trigger annotations_updated_at
  before update on public.annotations
  for each row execute function public.update_updated_at();

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Unique PIN among active gigs index
create unique index gigs_active_pin_idx on public.gigs (pin) where status = 'live';
