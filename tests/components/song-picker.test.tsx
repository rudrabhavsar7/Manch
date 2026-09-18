import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongPicker } from '@/components/setlists/song-picker';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  }),
}));

const sampleSongs: Song[] = [
  {
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
  },
  {
    id: 'song-2',
    title: 'Hotel California',
    artist: 'Eagles',
    key: 'Bm',
    bpm: 147,
    content: '[Bm]On a dark desert highway',
    structure: [],
    owner_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'song-3',
    title: 'Wish You Were Here',
    artist: 'Pink Floyd',
    key: 'G',
    bpm: 60,
    content: '[G]So, so you think you can tell',
    structure: [],
    owner_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('SongPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
    mockOrder.mockResolvedValue({ data: sampleSongs });
  });

  it('renders "Add Song" trigger button', () => {
    render(<SongPicker onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add song/i })).toBeInTheDocument();
  });

  it('opens dialog and displays songs when clicked', async () => {
    const user = userEvent.setup();
    render(<SongPicker onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add song/i }));

    expect(await screen.findByText('Add Song to Setlist')).toBeInTheDocument();
    expect(await screen.findByText('Comfortably Numb')).toBeInTheDocument();
    expect(screen.getByText('Hotel California')).toBeInTheDocument();
    expect(screen.getByText('Wish You Were Here')).toBeInTheDocument();
  });

  it('excludes songs passed in excludeSongIds', async () => {
    const user = userEvent.setup();
    render(<SongPicker excludeSongIds={['song-2']} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add song/i }));

    expect(await screen.findByText('Comfortably Numb')).toBeInTheDocument();
    expect(screen.queryByText('Hotel California')).not.toBeInTheDocument();
    expect(screen.getByText('Wish You Were Here')).toBeInTheDocument();
  });

  it('filters songs by search term matching title or artist', async () => {
    const user = userEvent.setup();
    render(<SongPicker onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add song/i }));
    await screen.findByText('Comfortably Numb');

    const searchInput = screen.getByLabelText('Search songs');
    await user.type(searchInput, 'Floyd');

    expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
    expect(screen.getByText('Wish You Were Here')).toBeInTheDocument();
    expect(screen.queryByText('Hotel California')).not.toBeInTheDocument();

    // Now search for something not found
    await user.clear(searchInput);
    await user.type(searchInput, 'NonExistentSong');

    expect(screen.getByText('No songs found')).toBeInTheDocument();
  });

  it('calls onSelect with chosen song and closes dialog', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(<SongPicker onSelect={handleSelect} />);

    await user.click(screen.getByRole('button', { name: /add song/i }));
    const songButton = await screen.findByText('Hotel California');

    await user.click(songButton);

    expect(handleSelect).toHaveBeenCalledWith(sampleSongs[1]);
    await waitFor(() => {
      expect(screen.queryByText('Add Song to Setlist')).not.toBeInTheDocument();
    });
  });
});
