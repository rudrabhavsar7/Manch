import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongEditor } from '@/components/songs/song-editor';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

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
const mockSelectEqOrder = vi.fn();
const mockSelectEq = vi.fn(() => ({ order: mockSelectEqOrder }));
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }));
const mockStorageUpload = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageSignedUrl = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === 'song_photos') {
    return {
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect,
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
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
        remove: mockStorageRemove,
        createSignedUrl: mockStorageSignedUrl,
      })),
    },
  }),
}));

const sampleSong: Song = {
  id: 'song-123',
  title: 'Comfortably Numb',
  artist: 'Pink Floyd',
  key: 'Bm',
  bpm: 127,
  content: '[Bm]Hello, is there anybody in there?\n[A]Just nod if you can hear me',
  structure: [],
  owner_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('SongEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'musician@band.com' } },
    });
    mockInsert.mockImplementation(() => ({
      select: () => ({
        single: async () => ({ data: { id: 'new-song-id' }, error: null }),
      }),
    }));
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
    mockSelectEqOrder.mockResolvedValue({ data: [], error: null });
    mockStorageUpload.mockResolvedValue({ data: { path: 'uploaded' }, error: null });
    mockStorageRemove.mockResolvedValue({ data: null, error: null });
    mockStorageSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/x.jpg' }, error: null });
  });

  it('renders form elements for creating a new song', () => {
    render(<SongEditor />);

    expect(screen.getByRole('heading', { name: /new song/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.getByLabelText(/artist/i)).toHaveValue('');
    expect(screen.getByLabelText(/bpm/i)).toHaveValue(null);
    expect(screen.getByRole('button', { name: /save song/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete song/i })).not.toBeInTheDocument();
  });

  it('pre-fills fields when an existing song is provided and shows Delete Song', () => {
    render(<SongEditor song={sampleSong} />);

    expect(screen.getByRole('heading', { name: /edit song/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Comfortably Numb');
    expect(screen.getByLabelText(/artist/i)).toHaveValue('Pink Floyd');
    expect(screen.getByLabelText(/bpm/i)).toHaveValue(127);
    expect(screen.getByLabelText(/lyrics/i)).toHaveValue(sampleSong.content);
    expect(screen.getByRole('button', { name: /delete song/i })).toBeInTheDocument();
  });

  it('shows error when title is empty on save', async () => {
    const user = userEvent.setup();
    render(<SongEditor />);

    const saveButton = screen.getByRole('button', { name: /save song/i });
    await user.click(saveButton);

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('switches to preview tab and displays rendered chords and lyrics', async () => {
    const user = userEvent.setup();
    render(<SongEditor song={sampleSong} />);

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    await user.click(previewTab);

    // Chords and lyrics should be visible in preview panel
    const previewPanel = screen.getByRole('tabpanel');
    expect(within(previewPanel).getByText('Bm')).toBeInTheDocument();
    expect(within(previewPanel).getByText('A')).toBeInTheDocument();
    expect(within(previewPanel).getByText(/anybody in there/i)).toBeInTheDocument();
  });

  it('inserts new song, calls router.refresh(), and redirects to /songs on save', async () => {
    const user = userEvent.setup();
    render(<SongEditor />);

    await user.type(screen.getByLabelText(/title/i), 'Wish You Were Here');
    await user.type(screen.getByLabelText(/artist/i), 'Pink Floyd');
    await user.type(screen.getByLabelText(/bpm/i), '60');
    fireEvent.change(screen.getByLabelText(/lyrics/i), {
      target: { value: '[C]So, so you think you can tell' },
    });

    const saveButton = screen.getByRole('button', { name: /save song/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Wish You Were Here',
          artist: 'Pink Floyd',
          bpm: 60,
          content: '[C]So, so you think you can tell',
          owner_id: 'user-1',
        }),
      );
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/songs');
    });
  }, 15000);

  it('updates existing song and redirects to /songs', async () => {
    const user = userEvent.setup();
    render(<SongEditor song={sampleSong} />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Comfortably Numb (Live)');

    const saveButton = screen.getByRole('button', { name: /save song/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Comfortably Numb (Live)',
          artist: 'Pink Floyd',
          bpm: 127,
        }),
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'song-123');
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/songs');
    });
  }, 15000);

  it('does not delete song if confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(<SongEditor song={sampleSong} />);

    const deleteButton = screen.getByRole('button', { name: /delete song/i });
    await user.click(deleteButton);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('deletes song on confirmation and redirects to /songs', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(<SongEditor song={sampleSong} />);

    const deleteButton = screen.getByRole('button', { name: /delete song/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'song-123');
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/songs');
    });
  });

  it('displays error message when database save fails', async () => {
    const user = userEvent.setup();
    mockInsert.mockImplementationOnce(() => ({
      select: () => ({
        single: async () => ({ data: null, error: { message: 'Database connection error' } }),
      }),
    }));

    render(<SongEditor />);
    await user.type(screen.getByLabelText(/title/i), 'Echoes');
    fireEvent.change(screen.getByLabelText(/lyrics/i), {
      target: { value: '[C]Hello' },
    });

    const saveButton = screen.getByRole('button', { name: /save song/i });
    await user.click(saveButton);

    expect(await screen.findByText('Database connection error')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to /songs when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<SongEditor />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockPush).toHaveBeenCalledWith('/songs');
  });

  it('shows error when neither lyrics nor photos provided', async () => {
    const user = userEvent.setup();
    render(<SongEditor />);

    await user.type(screen.getByLabelText(/^title/i), 'No Content Song');

    await user.click(screen.getByRole('button', { name: /save song/i }));

    expect(
      await screen.findByText(/add lyrics or at least one photo/i),
    ).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders photo uploader section', () => {
    render(<SongEditor />);
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add photos/i })).toBeInTheDocument();
  });

  it('saves song with pending photo: uploads to storage and inserts song_photos row', async () => {
    const user = userEvent.setup();

    render(<SongEditor />);
    await user.type(screen.getByLabelText(/^title/i), 'Photo Song');

    const file = new File(['img'], 'page1.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('photo-file-input'), {
      target: { files: [file] },
    });

    await user.click(screen.getByRole('button', { name: /save song/i }));

    await waitFor(() => {
      expect(mockStorageUpload).toHaveBeenCalledWith(
        expect.stringContaining('new-song-id'),
        file,
        expect.anything(),
      );
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          song_id: 'new-song-id',
          position: 0,
        }),
      );
      expect(mockPush).toHaveBeenCalledWith('/songs');
    });
  }, 15000);

  it('loads existing photos when editing a song', async () => {
    mockSelectEqOrder.mockResolvedValue({
      data: [
        { id: 'ph-1', song_id: 'song-123', storage_path: 'user-1/song-123/a.jpg', position: 0 },
      ],
      error: null,
    });

    render(<SongEditor song={sampleSong} />);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('song_photos');
      expect(mockSelectEq).toHaveBeenCalledWith('song_id', 'song-123');
    });

    expect(await screen.findByAltText(/photo page 1/i)).toBeInTheDocument();
  });
});
