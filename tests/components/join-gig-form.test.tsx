import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinGigForm } from '@/components/gigs/join-gig-form';
import { CacheManager } from '@/lib/offline/cache-manager';

let lastScanSuccessCallback: ((text: string) => void) | null = null;

vi.mock('html5-qrcode', () => {
  class MockHtml5Qrcode {
    isScanning = false;
    start = vi.fn().mockImplementation((_config: any, _settings: any, onSuccess: (text: string) => void) => {
      this.isScanning = true;
      lastScanSuccessCallback = onSuccess;
      return Promise.resolve();
    });
    stop = vi.fn().mockImplementation(() => {
      this.isScanning = false;
      return Promise.resolve();
    });
  }

  return {
    Html5Qrcode: MockHtml5Qrcode,
  };
});

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/offline/cache-manager', () => ({
  CacheManager: {
    cacheSongs: vi.fn().mockResolvedValue(undefined),
    cacheSetlist: vi.fn().mockResolvedValue(undefined),
    cacheGigState: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockGetUser = vi.fn();
const mockGigsSelect = vi.fn();
const mockMembersUpsert = vi.fn();
const mockSetlistsSelect = vi.fn();
const mockUsersUpsert = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === 'gigs') {
    return {
      select: mockGigsSelect,
    };
  }
  if (table === 'gig_members') {
    return {
      upsert: mockMembersUpsert,
    };
  }
  if (table === 'setlists') {
    return {
      select: mockSetlistsSelect,
    };
  }
  if (table === 'users') {
    return {
      upsert: mockUsersUpsert,
    };
  }
  return {};
});

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

describe('JoinGigForm', () => {
  const sampleSong = {
    id: 'song-1',
    title: 'Comfortably Numb',
    artist: 'Pink Floyd',
    key: 'Bm',
    bpm: 127,
    content: '[Bm]Hello',
    structure: [],
    owner_id: 'user-1',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const sampleGig = {
    id: 'gig-live-99',
    setlist_id: 'set-1',
    status: 'live',
  };

  const sampleSetlist = {
    id: 'set-1',
    name: 'Friday Live Set',
    owner_id: 'user-admin',
    privacy: 'public',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    setlist_songs: [
      {
        id: 'ss-1',
        setlist_id: 'set-1',
        song_id: 'song-1',
        position: 0,
        songs: sampleSong,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    lastScanSuccessCallback = null;

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'musician-1', email: 'musician@band.com' } },
    });

    mockGigsSelect.mockImplementation(() => {
      const builder: any = {
        eq: vi.fn((field: string, val: string) => {
          if (field === 'status') {
            return builder;
          }
          if (field === 'id') {
            return {
              single: vi.fn().mockResolvedValue({
                data: { ...sampleGig, id: val },
                error: null,
              }),
            };
          }
          return {
            single: vi.fn().mockResolvedValue({
              data: sampleGig,
              error: null,
            }),
          };
        }),
      };
      return builder;
    });

    mockSetlistsSelect.mockReturnValue({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: sampleSetlist,
          error: null,
        }),
      })),
    });

    mockMembersUpsert.mockResolvedValue({ error: null });
    mockUsersUpsert.mockResolvedValue({ error: null });
  });

  it('renders title, tabs, and PIN form elements', () => {
    render(<JoinGigForm />);

    expect(screen.getAllByText('Join Gig')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: /enter pin/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /scan qr/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/4-digit pin/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join gig/i })).toBeDisabled();
  });

  it('formats pin input to allow only 4 digits and enables submit button when complete', async () => {
    const user = userEvent.setup();
    render(<JoinGigForm />);

    const pinInput = screen.getByLabelText(/4-digit pin/i);
    const joinButton = screen.getByRole('button', { name: /join gig/i });

    await user.type(pinInput, 'abc12345');
    expect(pinInput).toHaveValue('1234');
    expect(joinButton).toBeEnabled();
  });

  it('joins gig by PIN, adds musician member with onConflict, pre-caches data, and redirects to /gigs/[id]', async () => {
    const user = userEvent.setup();
    render(<JoinGigForm />);

    const pinInput = screen.getByLabelText(/4-digit pin/i);
    await user.type(pinInput, '1234');

    const joinButton = screen.getByRole('button', { name: /join gig/i });
    await user.click(joinButton);

    await waitFor(() => {
      expect(mockMembersUpsert).toHaveBeenCalledWith(
        {
          gig_id: 'gig-live-99',
          user_id: 'musician-1',
          role: 'musician',
        },
        { onConflict: 'gig_id,user_id' },
      );
      expect(CacheManager.cacheSongs).toHaveBeenCalledWith([sampleSong]);
      expect(CacheManager.cacheSetlist).toHaveBeenCalledWith(sampleSetlist);
      expect(CacheManager.cacheGigState).toHaveBeenCalledWith(
        'gig-live-99',
        'set-1',
        ['song-1'],
      );
      expect(mockPush).toHaveBeenCalledWith('/gigs/gig-live-99');
    });
  });

  it('displays error when no active gig matches the PIN', async () => {
    const user = userEvent.setup();
    mockGigsSelect.mockImplementation(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Row not found' },
          }),
        })),
      })),
    }));

    render(<JoinGigForm />);

    const pinInput = screen.getByLabelText(/4-digit pin/i);
    await user.type(pinInput, '9999');

    const joinButton = screen.getByRole('button', { name: /join gig/i });
    await user.click(joinButton);

    expect(
      await screen.findByText('No active gig found with this PIN'),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(CacheManager.cacheSongs).not.toHaveBeenCalled();
  });

  it('ensures public.users profile exists before gig_members insert', async () => {
    const user = userEvent.setup();
    render(<JoinGigForm />);

    await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /join gig/i }));

    await waitFor(() => {
      expect(mockUsersUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'musician-1' }),
        { onConflict: 'id' },
      );
      expect(mockMembersUpsert).toHaveBeenCalled();
    });

    const usersCallOrder = mockFrom.mock.calls.findIndex(c => c[0] === 'users');
    const membersCallOrder = mockFrom.mock.calls.findIndex(c => c[0] === 'gig_members');
    expect(usersCallOrder).toBeLessThan(membersCallOrder);
  });

  it('shows error and does not redirect when gig_members insert fails', async () => {
    const user = userEvent.setup();
    mockMembersUpsert.mockResolvedValue({
      error: {
        code: '23503',
        message: 'insert or update on table "gig_members" violates foreign key constraint',
      },
    });

    render(<JoinGigForm />);

    await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /join gig/i }));

    expect(
      await screen.findByText(/failed to join gig/i),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('switches to QR tab and starts QR scanner', async () => {
    const user = userEvent.setup();
    render(<JoinGigForm />);

    const qrTab = screen.getByRole('tab', { name: /scan qr/i });
    await user.click(qrTab);

    const scanButton = screen.getByRole('button', { name: /scan qr code/i });
    expect(scanButton).toBeInTheDocument();

    await user.click(scanButton);
    expect(lastScanSuccessCallback).not.toBeNull();
  });

  it('joins gig when QR code containing PIN json is scanned', async () => {
    const user = userEvent.setup();
    render(<JoinGigForm />);

    const qrTab = screen.getByRole('tab', { name: /scan qr/i });
    await user.click(qrTab);

    const scanButton = screen.getByRole('button', { name: /scan qr code/i });
    await user.click(scanButton);

    // Simulate QR code scanned with json
    act(() => {
      lastScanSuccessCallback?.(JSON.stringify({ pin: '1234' }));
    });

    await waitFor(() => {
      expect(mockMembersUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ gig_id: 'gig-live-99' }),
        { onConflict: 'gig_id,user_id' },
      );
      expect(mockPush).toHaveBeenCalledWith('/gigs/gig-live-99');
    });
  });

  it('joins gig and pre-caches when QR code with gigId is scanned', async () => {
    const user = userEvent.setup();
    render(<JoinGigForm />);

    const qrTab = screen.getByRole('tab', { name: /scan qr/i });
    await user.click(qrTab);

    const scanButton = screen.getByRole('button', { name: /scan qr code/i });
    await user.click(scanButton);

    // Simulate QR code scanned with gigId
    act(() => {
      lastScanSuccessCallback?.(JSON.stringify({ gigId: 'direct-gig-789' }));
    });

    await waitFor(() => {
      expect(mockMembersUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ gig_id: 'direct-gig-789' }),
        { onConflict: 'gig_id,user_id' },
      );
      expect(CacheManager.cacheSongs).toHaveBeenCalledWith([sampleSong]);
      expect(mockPush).toHaveBeenCalledWith('/gigs/direct-gig-789');
    });
  });
});
