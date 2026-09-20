import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Database, SongSection, Tables, TablesInsert, TablesUpdate } from '@/types/database';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest } from 'next/server';

// Mock cookies for next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => {
    const store = new Map<string, string>();
    return {
      getAll: () => Array.from(store.entries()).map(([name, value]) => ({ name, value })),
      set: (name: string, value: string) => store.set(name, value),
      delete: (name: string) => store.delete(name),
    };
  }),
}));

describe('Supabase Client & Types', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-abc123xyz',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Browser Client Factory', () => {
    it('creates browser client with expected supabase methods', () => {
      const client = createBrowserClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(typeof client.auth.getUser).toBe('function');
      expect(typeof client.from).toBe('function');
      expect(typeof client.channel).toBe('function');
    });
  });

  describe('Server Client Factory', () => {
    it('creates server client with expected supabase methods', async () => {
      const client = await createServerClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(typeof client.auth.getUser).toBe('function');
      expect(typeof client.from).toBe('function');
    });
  });

  describe('Database Types', () => {
    it('defines correct structure for SongSection', () => {
      const section: SongSection = {
        type: 'verse',
        label: 'Verse 1',
        startLine: 1,
        endLine: 8,
      };
      expect(section.type).toBe('verse');
      expect(section.label).toBe('Verse 1');
      expect(section.startLine).toBe(1);
      expect(section.endLine).toBe(8);
    });

    it('enforces table row shapes for all 8 tables', () => {
      // Compile-time type check tests: will fail tsc if shape does not match
      type UserRow = Tables<'users'>;
      type SongRow = Tables<'songs'>;
      type SetlistRow = Tables<'setlists'>;
      type SetlistSongRow = Tables<'setlist_songs'>;
      type GigRow = Tables<'gigs'>;
      type GigMemberRow = Tables<'gig_members'>;
      type AnnotationRow = Tables<'annotations'>;
      type SetlistShareRow = Tables<'setlist_shares'>;

      const user: UserRow = {
        id: 'user-1',
        email: 'user@test.com',
        display_name: 'Test User',
        instrument: 'Guitar',
        role: 'admin',
        avatar_url: null,
        created_at: '2026-09-18T00:00:00Z',
      };

      const song: SongRow = {
        id: 'song-1',
        title: 'Test Song',
        artist: 'Test Artist',
        key: 'Am',
        bpm: 120,
        content: '[Am]Test lyrics',
        structure: [{ type: 'verse', label: 'Verse 1', startLine: 1, endLine: 4 }],
        owner_id: user.id,
        created_at: '2026-09-18T00:00:00Z',
        updated_at: '2026-09-18T00:00:00Z',
      };

      const setlist: SetlistRow = {
        id: 'setlist-1',
        name: 'Gig 1 Setlist',
        owner_id: user.id,
        privacy: 'public',
        created_at: '2026-09-18T00:00:00Z',
        updated_at: '2026-09-18T00:00:00Z',
      };

      const setlistSong: SetlistSongRow = {
        id: 'ss-1',
        setlist_id: setlist.id,
        song_id: song.id,
        position: 0,
      };

      const gig: GigRow = {
        id: 'gig-1',
        name: 'Live Show',
        admin_id: user.id,
        setlist_id: setlist.id,
        pin: '1234',
        status: 'live',
        created_at: '2026-09-18T00:00:00Z',
        ended_at: null,
      };

      const gigMember: GigMemberRow = {
        id: 'gm-1',
        gig_id: gig.id,
        user_id: user.id,
        role: 'admin',
        joined_at: '2026-09-18T00:00:00Z',
      };

      const annotation: AnnotationRow = {
        id: 'ann-1',
        user_id: user.id,
        song_id: song.id,
        type: 'inline',
        line_number: 1,
        content: 'Fuzz pedal on',
        color: '#fbbf24',
        created_at: '2026-09-18T00:00:00Z',
        updated_at: '2026-09-18T00:00:00Z',
      };

      const setlistShare: SetlistShareRow = {
        id: 'share-1',
        setlist_id: setlist.id,
        user_id: user.id,
        permission: 'view',
        shared_by: user.id,
        created_at: '2026-09-18T00:00:00Z',
      };

      expect(user.email).toBe('user@test.com');
      expect(song.structure).toHaveLength(1);
      expect(setlist.privacy).toBe('public');
      expect(setlistSong.position).toBe(0);
      expect(gig.status).toBe('live');
      expect(gigMember.role).toBe('admin');
      expect(annotation.type).toBe('inline');
      expect(setlistShare.permission).toBe('view');
    });

    it('enforces insert and update types', () => {
      type SongInsert = TablesInsert<'songs'>;
      type SongUpdate = TablesUpdate<'songs'>;

      const songInsert: SongInsert = {
        title: 'New Song',
        owner_id: 'user-1',
      };

      const songUpdate: SongUpdate = {
        key: 'G',
        bpm: 110,
      };

      expect(songInsert.title).toBe('New Song');
      expect(songUpdate.key).toBe('G');
    });
  });

  describe('Auth Middleware session handler', () => {
    it('allows public route access without user session', async () => {
      const req = new NextRequest('http://localhost:3000/auth/login');
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });

    it('redirects unauthenticated user from protected route to /auth/login', async () => {
      const req = new NextRequest('http://localhost:3000/dashboard');
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/auth/login');
    });

    it('allows root route as public route', async () => {
      const req = new NextRequest('http://localhost:3000/');
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });

    it('allows /auth/callback as public route', async () => {
      const req = new NextRequest('http://localhost:3000/auth/callback');
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });

    it('forwards cookies during redirect to login', async () => {
      const req = new NextRequest('http://localhost:3000/gigs', {
        headers: {
          cookie: 'sb-test-auth-token=expired-token',
        },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/auth/login');
      expect(res.cookies).toBeDefined();
    });
  });
});
