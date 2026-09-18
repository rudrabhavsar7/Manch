import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongEditor } from '@/components/songs/song-editor';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

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

const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

const mockFrom = vi.fn((table: string) => ({
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
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
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
  });

  it('renders form elements for creating a new song', () => {
    render(<SongEditor />);

    expect(screen.getByRole('heading', { name: /new song/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.getByLabelText(/artist/i)).toHaveValue('');
    expect(screen.getByLabelText(/bpm/i)).toHaveValue(null);
    expect(screen.getByRole('button', { name: /save song/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('pre-fills fields when an existing song is provided', () => {
    render(<SongEditor song={sampleSong} />);

    expect(screen.getByRole('heading', { name: /edit song/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Comfortably Numb');
    expect(screen.getByLabelText(/artist/i)).toHaveValue('Pink Floyd');
    expect(screen.getByLabelText(/bpm/i)).toHaveValue(127);
    expect(screen.getByLabelText(/lyrics/i)).toHaveValue(sampleSong.content);
  });

  it('shows error when title is empty on save', async () => {
    const user = userEvent.setup();
    render(<SongEditor />);

    const saveButton = screen.getByRole('button', { name: /save song/i });
    await user.click(saveButton);

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
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

  it('inserts new song and redirects to /songs on successful save', async () => {
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
      expect(mockPush).toHaveBeenCalledWith('/songs');
    });
  });

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
      expect(mockPush).toHaveBeenCalledWith('/songs');
    });
  });

  it('displays error message when database save fails', async () => {
    const user = userEvent.setup();
    mockInsert.mockResolvedValueOnce({ error: { message: 'Database connection error' } });

    render(<SongEditor />);
    await user.type(screen.getByLabelText(/title/i), 'Echoes');

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
});
