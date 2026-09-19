import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GigsPage from '@/app/gigs/page';
import NewGigPage from '@/app/gigs/new/page';
import JoinGigPage from '@/app/gigs/join/page';

const {
  mockRedirect,
  mockGetUser,
  mockGigsOrder,
  mockServerFrom,
} = vi.hoisted(() => {
  const mockRedirect = vi.fn();
  const mockGetUser = vi.fn();
  const mockGigsOrder = vi.fn();

  const mockServerFrom = vi.fn((table: string) => {
    if (table === 'gigs') {
      return {
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            order: mockGigsOrder,
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
    mockGetUser,
    mockGigsOrder,
    mockServerFrom,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  }),
}));

describe('Gig Pages', () => {
  const sampleGigs = [
    {
      id: 'gig-1',
      name: 'Friday Night at Blue Frog',
      admin_id: 'user-1',
      setlist_id: 'set-1',
      pin: '1234',
      status: 'live' as const,
      created_at: '2026-03-15T19:00:00Z',
      ended_at: null,
    },
    {
      id: 'gig-2',
      name: 'Sunday Showcase',
      admin_id: 'user-1',
      setlist_id: 'set-2',
      pin: '5678',
      status: 'ended' as const,
      created_at: '2026-03-10T14:00:00Z',
      ended_at: '2026-03-10T17:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'musician@band.com' } },
    });
    mockGigsOrder.mockResolvedValue({ data: sampleGigs });
  });

  describe('GigsPage (/gigs)', () => {
    it('redirects to /auth/login when unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(GigsPage()).rejects.toThrow('NEXT_REDIRECT: /auth/login');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('renders gig list, Join Gig button, and New Gig button', async () => {
      const jsx = await GigsPage();
      render(jsx!);

      expect(screen.getByRole('heading', { name: 'Gigs' })).toBeInTheDocument();
      expect(screen.getByText('Friday Night at Blue Frog')).toBeInTheDocument();
      expect(screen.getByText('Sunday Showcase')).toBeInTheDocument();
      expect(screen.getByText('PIN: 1234')).toBeInTheDocument();

      const joinLink = screen.getByRole('link', { name: /join gig/i });
      expect(joinLink).toHaveAttribute('href', '/gigs/join');

      const newLink = screen.getByRole('link', { name: /new gig/i });
      expect(newLink).toHaveAttribute('href', '/gigs/new');
    });

    it('renders empty state when no gigs exist', async () => {
      mockGigsOrder.mockResolvedValue({ data: [] });

      const jsx = await GigsPage();
      render(jsx!);

      expect(
        screen.getByText(/no gigs yet\. create or join one!/i),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /join gig/i })[0]).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /new gig/i })[0]).toBeInTheDocument();
    });
  });

  describe('NewGigPage (/gigs/new)', () => {
    it('redirects to /auth/login when unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(NewGigPage()).rejects.toThrow('NEXT_REDIRECT: /auth/login');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('renders the create gig form for authenticated user', async () => {
      const jsx = await NewGigPage();
      render(jsx!);

      expect(screen.getByText('Create Gig')).toBeInTheDocument();
      expect(screen.getByLabelText(/gig name/i)).toBeInTheDocument();
    });
  });

  describe('JoinGigPage (/gigs/join)', () => {
    it('redirects to /auth/login when unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(JoinGigPage()).rejects.toThrow('NEXT_REDIRECT: /auth/login');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('renders the join gig form with PIN and QR tabs for authenticated user', async () => {
      const jsx = await JoinGigPage();
      render(jsx!);

      expect(screen.getAllByText('Join Gig').length).toBeGreaterThan(0);
      expect(screen.getByRole('tab', { name: /enter pin/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /scan qr/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/4-digit pin/i)).toBeInTheDocument();
    });
  });
});
