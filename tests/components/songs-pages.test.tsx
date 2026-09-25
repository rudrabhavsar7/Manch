import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SongsPage from '@/app/songs/page';
import NewSongPage from '@/app/songs/new/page';
import EditSongPage from '@/app/songs/[id]/page';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

const {
  mockRedirect,
  mockNotFound,
  mockPush,
  mockGetUser,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
} = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
  mockNotFound: vi.fn(),
  mockPush: vi.fn(),
  mockGetUser: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  redirect: (path: string) => mockRedirect(path),
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  }),
}));

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  }),
}));

describe('Song Pages', () => {
  const sampleSongs: Song[] = [
    {
      id: 'song-1',
      title: 'Time',
      artist: 'Pink Floyd',
      key: 'F#m',
      bpm: 120,
      content: '[F#m]Ticking away the moments',
      structure: [],
      owner_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    const chain = {
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    };
    mockSelect.mockReturnValue(chain);
    mockEq.mockReturnValue(chain);
    mockOrder.mockResolvedValue({ data: sampleSongs });
    mockSingle.mockResolvedValue({ data: sampleSongs[0] });
  });

  describe('SongsPage (/songs)', () => {
    it('redirects to /auth/login when user is unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      await SongsPage({});
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('renders song list and New Song button', async () => {
      const page = await SongsPage({});
      render(page);

      expect(screen.getByRole('heading', { name: /song library/i })).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Pink Floyd')).toBeInTheDocument();
      expect(screen.getAllByText('F#m').length).toBeGreaterThan(0);
    });

    it('renders empty state when user has no songs', async () => {
      mockOrder.mockResolvedValueOnce({ data: [] });

      const page = await SongsPage({});
      render(page);

      expect(screen.getByText(/no songs yet\. create your first song!/i)).toBeInTheDocument();
    });
  });

  describe('NewSongPage (/songs/new)', () => {
    it('renders the song editor for creating a song', () => {
      render(<NewSongPage />);
      expect(screen.getByRole('heading', { name: /new song/i })).toBeInTheDocument();
    });
  });

  describe('EditSongPage (/songs/[id])', () => {
    it('redirects unauthenticated user to login', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      await EditSongPage({ params: Promise.resolve({ id: 'song-1' }) });
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('calls notFound when song does not exist or does not belong to user', async () => {
      mockSingle.mockResolvedValueOnce({ data: null });
      await expect(
        EditSongPage({ params: Promise.resolve({ id: 'non-existent' }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mockNotFound).toHaveBeenCalled();
    });

    it('renders the song editor with song details after verifying ownership', async () => {
      const page = await EditSongPage({ params: Promise.resolve({ id: 'song-1' }) });
      render(page);

      expect(mockEq).toHaveBeenCalledWith('id', 'song-1');
      expect(mockEq).toHaveBeenCalledWith('owner_id', 'user-1');
      expect(screen.getByRole('heading', { name: /edit song/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toHaveValue('Time');
    });
  });
});
