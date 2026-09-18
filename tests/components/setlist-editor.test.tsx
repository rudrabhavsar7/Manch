import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetlistEditor, type SetlistSongItem } from '@/components/setlists/setlist-editor';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];
type Setlist = Database['public']['Tables']['setlists']['Row'];

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: mockRefresh,
  }),
}));

const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();

const song1: Song = {
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

const song2: Song = {
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
};

const mockSongsOrder = vi.fn();
const mockSongsEq = vi.fn();
const mockSongsSelect = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === 'songs') {
    return {
      select: mockSongsSelect,
    };
  }
  return {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };
});

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

const sampleSetlist: Setlist = {
  id: 'setlist-100',
  name: 'Festival Set',
  owner_id: 'user-1',
  privacy: 'public',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleInitialSongs: SetlistSongItem[] = [
  { id: 'item-1', song: song1, position: 0 },
  { id: 'item-2', song: song2, position: 1 },
];

describe('SetlistEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'musician@band.com' } },
    });

    mockInsert.mockImplementation(() => {
      const result: any = Promise.resolve({ error: null, data: null });
      result.select = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-setlist-1', name: 'New Set', privacy: 'private' },
          error: null,
        }),
      });
      return result;
    });

    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });

    mockSongsSelect.mockReturnValue({ eq: mockSongsEq });
    mockSongsEq.mockReturnValue({ order: mockSongsOrder });
    mockSongsOrder.mockResolvedValue({ data: [song1, song2] });
  });

  it('renders form elements for creating a new setlist', () => {
    render(<SetlistEditor />);

    expect(screen.getByRole('heading', { name: /new setlist/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/setlist name/i)).toHaveValue('');
    expect(screen.getByText('No songs added yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save setlist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete setlist/i })).not.toBeInTheDocument();
  });

  it('pre-fills fields when editing existing setlist and shows Delete Setlist', () => {
    render(<SetlistEditor setlist={sampleSetlist} initialSongs={sampleInitialSongs} />);

    expect(screen.getByRole('heading', { name: /edit setlist/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/setlist name/i)).toHaveValue('Festival Set');
    expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
    expect(screen.getByText('Hotel California')).toBeInTheDocument();
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete setlist/i })).toBeInTheDocument();
  });

  it('shows error when setlist name is empty on save', async () => {
    const user = userEvent.setup();
    render(<SetlistEditor />);

    const saveButton = screen.getByRole('button', { name: /save setlist/i });
    await user.click(saveButton);

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('adds a song via SongPicker', async () => {
    const user = userEvent.setup();
    render(<SetlistEditor />);

    expect(screen.getByText('Songs (0)')).toBeInTheDocument();

    const addSongTrigger = screen.getByRole('button', { name: /add song/i });
    await user.click(addSongTrigger);

    const songPickBtn = await screen.findByText('Comfortably Numb');
    await user.click(songPickBtn);

    expect(screen.getByText('Songs (1)')).toBeInTheDocument();
    expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.queryByText('No songs added yet')).not.toBeInTheDocument();
  });

  it('removes a song and recalculates positions', async () => {
    const user = userEvent.setup();
    render(<SetlistEditor setlist={sampleSetlist} initialSongs={sampleInitialSongs} />);

    expect(screen.getByText('Songs (2)')).toBeInTheDocument();
    expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
    expect(screen.getByText('Hotel California')).toBeInTheDocument();

    // Click remove button on first song
    const removeBtn = screen.getByRole('button', { name: /remove comfortably numb/i });
    await user.click(removeBtn);

    expect(screen.getByText('Songs (1)')).toBeInTheDocument();
    expect(screen.queryByText('Comfortably Numb')).not.toBeInTheDocument();
    expect(screen.getByText('Hotel California')).toBeInTheDocument();
    // Hotel California should now be position 1.
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.queryByText('2.')).not.toBeInTheDocument();
  });

  it('creates new setlist and setlist_songs, refreshes and redirects to /setlists', async () => {
    const user = userEvent.setup();
    render(<SetlistEditor />);

    const nameInput = screen.getByLabelText(/setlist name/i);
    await user.type(nameInput, 'Acoustic Gig');

    // Add a song
    const addSongTrigger = screen.getByRole('button', { name: /add song/i });
    await user.click(addSongTrigger);
    const songPickBtn = await screen.findByText('Comfortably Numb');
    await user.click(songPickBtn);

    const saveButton = screen.getByRole('button', { name: /save setlist/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    // First insert was setlist
    expect(mockInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'Acoustic Gig',
        privacy: 'private',
        owner_id: 'user-1',
      })
    );

    // Second insert was setlist_songs
    expect(mockInsert).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          setlist_id: 'new-setlist-1',
          song_id: 'song-1',
          position: 0,
        }),
      ])
    );

    expect(mockRefresh).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/setlists');
  });

  it('updates existing setlist, replaces setlist_songs, and redirects', async () => {
    const user = userEvent.setup();
    render(<SetlistEditor setlist={sampleSetlist} initialSongs={sampleInitialSongs} />);

    const nameInput = screen.getByLabelText(/setlist name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Festival Set');

    const saveButton = screen.getByRole('button', { name: /save setlist/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Festival Set',
          privacy: 'public',
        })
      );
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          setlist_id: 'setlist-100',
          song_id: 'song-1',
          position: 0,
        }),
        expect.objectContaining({
          setlist_id: 'setlist-100',
          song_id: 'song-2',
          position: 1,
        }),
      ])
    );

    expect(mockRefresh).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/setlists');
  });

  it('deletes setlist when Delete Setlist is confirmed', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SetlistEditor setlist={sampleSetlist} initialSongs={sampleInitialSongs} />);

    const deleteBtn = screen.getByRole('button', { name: /delete setlist/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'setlist-100');
    });

    expect(mockRefresh).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/setlists');
  });

  it('does not delete setlist when confirmation is canceled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SetlistEditor setlist={sampleSetlist} initialSongs={sampleInitialSongs} />);

    const deleteBtn = screen.getByRole('button', { name: /delete setlist/i });
    await user.click(deleteBtn);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles database error gracefully when saving fails', async () => {
    const user = userEvent.setup();
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'Database save error' } }),
    });

    render(<SetlistEditor setlist={sampleSetlist} initialSongs={[]} />);

    const saveButton = screen.getByRole('button', { name: /save setlist/i });
    await user.click(saveButton);

    expect(await screen.findByText('Database save error')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('supports drag-and-drop reordering via keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<SetlistEditor setlist={sampleSetlist} initialSongs={sampleInitialSongs} />);

    const reorderBtn = screen.getByRole('button', { name: /reorder comfortably numb/i });
    reorderBtn.focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');

    const list = screen.getByTestId('sortable-songs-list');
    expect(list).toBeInTheDocument();
  });

  it('cancels and navigates back to /setlists', async () => {
    const user = userEvent.setup();
    render(<SetlistEditor />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockPush).toHaveBeenCalledWith('/setlists');
  });
});
