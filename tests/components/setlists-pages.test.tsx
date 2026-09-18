import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SetlistsPage from '@/app/setlists/page';
import NewSetlistPage from '@/app/setlists/new/page';
import EditSetlistPage from '@/app/setlists/[id]/page';

const {
  mockRedirect,
  mockNotFound,
  mockPush,
  mockGetUser,
  mockSingleSetlist,
  mockSetlistsOrder,
  mockSetlistSongsOrder,
  mockServerFrom,
} = vi.hoisted(() => {
  const mockRedirect = vi.fn();
  const mockNotFound = vi.fn();
  const mockPush = vi.fn();
  const mockGetUser = vi.fn();
  const mockSingleSetlist = vi.fn();
  const mockSetlistsOrder = vi.fn();
  const mockSetlistSongsOrder = vi.fn();

  const mockServerFrom = vi.fn((table: string) => {
    if (table === 'setlists') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_field: string, _val: string) => ({
            order: mockSetlistsOrder,
            eq: vi.fn((_field2: string, _val2: string) => ({
              single: mockSingleSetlist,
            })),
          })),
        })),
      };
    }
    if (table === 'setlist_songs') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: mockSetlistSongsOrder,
          })),
        })),
      };
    }
    return {
      select: vi.fn(),
    };
  });

  return {
    mockRedirect,
    mockNotFound,
    mockPush,
    mockGetUser,
    mockSingleSetlist,
    mockSetlistsOrder,
    mockSetlistSongsOrder,
    mockServerFrom,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`NEXT_REDIRECT: ${path}`);
  },
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
    from: mockServerFrom,
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
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
    })),
  }),
}));

describe('Setlist Pages', () => {
  const sampleSetlists = [
    {
      id: 'setlist-1',
      name: 'Friday Night Live',
      owner_id: 'user-1',
      privacy: 'public',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      setlist_songs: [{ count: 8 }],
    },
  ];

  const sampleSetlist = {
    id: 'setlist-1',
    name: 'Friday Night Live',
    owner_id: 'user-1',
    privacy: 'public',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleSong = {
    id: 'song-1',
    title: 'Comfortably Numb',
    artist: 'Pink Floyd',
    key: 'Bm',
    bpm: 127,
    content: '[Bm]Hello',
    structure: [],
    owner_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleSetlistSongs = [
    {
      id: 'ss-1',
      setlist_id: 'setlist-1',
      song_id: 'song-1',
      position: 0,
      songs: sampleSong,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    mockSetlistsOrder.mockResolvedValue({ data: sampleSetlists });
    mockSingleSetlist.mockResolvedValue({ data: sampleSetlist });
    mockSetlistSongsOrder.mockResolvedValue({ data: sampleSetlistSongs });
  });

  describe('SetlistsPage (/setlists)', () => {
    it('redirects to /auth/login when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(SetlistsPage()).rejects.toThrow('NEXT_REDIRECT: /auth/login');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('renders setlist list and New Setlist button', async () => {
      const jsx = await SetlistsPage();
      render(jsx!);

      expect(screen.getByRole('heading', { name: 'Setlists' })).toBeInTheDocument();
      expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
      expect(screen.getByText('8 songs')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /new setlist/i })).toHaveAttribute(
        'href',
        '/setlists/new'
      );
    });

    it('renders empty state when no setlists exist', async () => {
      mockSetlistsOrder.mockResolvedValue({ data: [] });

      const jsx = await SetlistsPage();
      render(jsx!);

      expect(
        screen.getByText(/no setlists yet\. create your first setlist!/i)
      ).toBeInTheDocument();
    });
  });

  describe('NewSetlistPage (/setlists/new)', () => {
    it('redirects to /auth/login when unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(NewSetlistPage()).rejects.toThrow('NEXT_REDIRECT: /auth/login');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('renders the setlist editor for creating a setlist', async () => {
      const jsx = await NewSetlistPage();
      render(jsx!);

      expect(screen.getByRole('heading', { name: /new setlist/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/setlist name/i)).toBeInTheDocument();
    });
  });

  describe('EditSetlistPage (/setlists/[id])', () => {
    it('redirects to /auth/login when unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(
        EditSetlistPage({ params: Promise.resolve({ id: 'setlist-1' }) })
      ).rejects.toThrow('NEXT_REDIRECT: /auth/login');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('throws notFound when setlist does not exist or owner does not match', async () => {
      mockSingleSetlist.mockResolvedValue({ data: null });

      await expect(
        EditSetlistPage({ params: Promise.resolve({ id: 'non-existent' }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mockNotFound).toHaveBeenCalled();
    });

    it('renders setlist editor with setlist details and initial songs', async () => {
      const jsx = await EditSetlistPage({
        params: Promise.resolve({ id: 'setlist-1' }),
      });
      render(jsx!);

      expect(screen.getByRole('heading', { name: /edit setlist/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/setlist name/i)).toHaveValue('Friday Night Live');
      expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete setlist/i })).toBeInTheDocument();
    });
  });
});
