import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

const {
  mockRedirect,
  mockGetUser,
  mockGetClaims,
  mockSongsEq,
  mockSetlistsEq,
  mockMembersEq,
  mockServerFrom,
} = vi.hoisted(() => {
  const mockRedirect = vi.fn();
  const mockGetUser = vi.fn();
  const mockGetClaims = vi.fn();
  const mockSongsEq = vi.fn();
  const mockSetlistsEq = vi.fn();
  const mockMembersEq = vi.fn();

  const mockServerFrom = vi.fn((table: string) => {
    if (table === 'songs') {
      return {
        select: vi.fn(() => ({
          eq: mockSongsEq,
        })),
      };
    }
    if (table === 'setlists') {
      return {
        select: vi.fn(() => ({
          eq: mockSetlistsEq,
        })),
      };
    }
    if (table === 'gig_members') {
      return {
        select: vi.fn(() => ({
          eq: mockMembersEq,
        })),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], count: 0 }),
      })),
    };
  });

  return {
    mockRedirect,
    mockGetUser,
    mockGetClaims,
    mockSongsEq,
    mockSetlistsEq,
    mockMembersEq,
    mockServerFrom,
  };
});

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    mockRedirect(path);
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
      getClaims: mockGetClaims,
    },
    from: mockServerFrom,
  }),
}));

describe('DashboardPage (/dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: 'user-123' } },
      error: null,
    });
    mockSongsEq.mockResolvedValue({ count: 15, data: null });
    mockSetlistsEq.mockResolvedValue({ count: 4, data: null });
    mockMembersEq.mockResolvedValue({
      data: [
        {
          gig_id: 'gig-live-1',
          gigs: { name: 'Friday Night Live', status: 'live', pin: '4321' },
        },
        {
          gig_id: 'gig-past-2',
          gigs: { name: 'Old Rehearsal', status: 'ended', pin: '1111' },
        },
      ],
    });
  });

  it('redirects to /auth/login when user is unauthenticated', async () => {
    mockGetClaims.mockResolvedValueOnce({ data: { claims: null }, error: null });
    await DashboardPage();
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
  });

  it('renders song count, setlist count, and active live gig count', async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument(); // Song count
    expect(screen.getByText('4')).toBeInTheDocument(); // Setlist count
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 live gig out of 2 total
    expect(screen.getByText(/1 active session/i)).toBeInTheDocument();
  });

  it('renders quick action buttons and links', async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.getByRole('link', { name: /new gig/i })).toHaveAttribute('href', '/gigs/new');
    expect(screen.getByRole('link', { name: /join gig/i })).toHaveAttribute('href', '/gigs/join');
    expect(screen.getByRole('link', { name: /\+ add song/i })).toHaveAttribute('href', '/songs/new');
    expect(screen.getByRole('link', { name: /\+ create setlist/i })).toHaveAttribute('href', '/setlists/new');
  });

  it('renders active live gig details card with Enter Gig link', async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
    expect(screen.getByText(/PIN: 4321/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /enter gig/i })).toHaveAttribute(
      'href',
      '/gigs/gig-live-1'
    );
  });
});
