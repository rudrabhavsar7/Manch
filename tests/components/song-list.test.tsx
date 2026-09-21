import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongList } from '@/components/songs/song-list';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

const mockSongs: Song[] = [
  {
    id: 'song-1',
    title: 'Time',
    artist: 'Pink Floyd',
    key: 'F#m',
    bpm: 120,
    content: '[F#m]Ticking away the moments that make up a dull day',
    structure: [],
    owner_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
  },
  {
    id: 'song-2',
    title: 'Amba Avo To Ramiye',
    artist: 'Garba Folk',
    key: 'Am',
    bpm: 140,
    content: '[Am]અંબા આવો તો રમીએ અમને રમતાં ના આવડે',
    structure: [],
    owner_id: 'user-1',
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'song-3',
    title: 'Char Char Bangdi',
    artist: 'Kinjal Dave',
    key: 'Dm',
    bpm: 160,
    content: '[Dm]ચાર ચાર બંગડી વાળી ગાડી લાઈ દઉં',
    structure: [],
    owner_id: 'user-1',
    created_at: '2026-01-03T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('SongList Component', () => {
  it('renders search input and all songs by default', () => {
    render(<SongList initialSongs={mockSongs} />);

    expect(screen.getByPlaceholderText(/search songs/i)).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Amba Avo To Ramiye')).toBeInTheDocument();
    expect(screen.getByText('Char Char Bangdi')).toBeInTheDocument();
  });

  it('filters songs by title', async () => {
    render(<SongList initialSongs={mockSongs} />);
    const searchInput = screen.getByPlaceholderText(/search songs/i);

    fireEvent.change(searchInput, { target: { value: 'Amba' } });

    expect(screen.getByText('Amba Avo To Ramiye')).toBeInTheDocument();
    expect(screen.queryByText('Time')).not.toBeInTheDocument();
    expect(screen.queryByText('Char Char Bangdi')).not.toBeInTheDocument();
  });

  it('filters songs by artist', async () => {
    render(<SongList initialSongs={mockSongs} />);
    const searchInput = screen.getByPlaceholderText(/search songs/i);

    fireEvent.change(searchInput, { target: { value: 'Kinjal' } });

    expect(screen.getByText('Char Char Bangdi')).toBeInTheDocument();
    expect(screen.queryByText('Time')).not.toBeInTheDocument();
  });

  it('filters songs by lyrics content', async () => {
    render(<SongList initialSongs={mockSongs} />);
    const searchInput = screen.getByPlaceholderText(/search songs/i);

    fireEvent.change(searchInput, { target: { value: 'Ticking away' } });

    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.queryByText('Amba Avo To Ramiye')).not.toBeInTheDocument();
  });

  it('filters songs by Gujarati lyrics', async () => {
    render(<SongList initialSongs={mockSongs} />);
    const searchInput = screen.getByPlaceholderText(/search songs/i);

    fireEvent.change(searchInput, { target: { value: 'રમતાં' } });

    expect(screen.getByText('Amba Avo To Ramiye')).toBeInTheDocument();
    expect(screen.queryByText('Time')).not.toBeInTheDocument();
  });

  it('clears search when clear button is clicked', async () => {
    render(<SongList initialSongs={mockSongs} />);
    const searchInput = screen.getByPlaceholderText(/search songs/i);

    fireEvent.change(searchInput, { target: { value: 'Kinjal' } });
    expect(screen.queryByText('Time')).not.toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear search input/i });
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Char Char Bangdi')).toBeInTheDocument();
  });

  it('shows empty search state with clear button when no songs match', () => {
    render(<SongList initialSongs={mockSongs} />);
    const searchInput = screen.getByPlaceholderText(/search songs/i);

    fireEvent.change(searchInput, { target: { value: 'Nonexistent Song 999' } });

    expect(screen.getByText(/no songs found/i)).toBeInTheDocument();
    const clearButton = screen.getByRole('button', { name: /clear search & filters/i });
    fireEvent.click(clearButton);

    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  it('filters by key selection', () => {
    render(<SongList initialSongs={mockSongs} />);

    const keyButton = screen.getByRole('button', { name: /^Dm$/i });
    fireEvent.click(keyButton);

    expect(screen.getByText('Char Char Bangdi')).toBeInTheDocument();
    expect(screen.queryByText('Time')).not.toBeInTheDocument();
    expect(screen.queryByText('Amba Avo To Ramiye')).not.toBeInTheDocument();
  });

  it('sorts songs by title A-Z and BPM', () => {
    render(<SongList initialSongs={mockSongs} />);
    const sortSelect = screen.getByRole('combobox', { name: /sort songs/i });

    // Sort by Title A-Z
    fireEvent.change(sortSelect, { target: { value: 'title_asc' } });
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('Amba Avo To Ramiye');
    expect(links[1]).toHaveTextContent('Char Char Bangdi');
    expect(links[2]).toHaveTextContent('Time');

    // Sort by BPM (Fastest)
    fireEvent.change(sortSelect, { target: { value: 'bpm_desc' } });
    const bpmLinks = screen.getAllByRole('link');
    expect(bpmLinks[0]).toHaveTextContent('Char Char Bangdi'); // 160 BPM
    expect(bpmLinks[1]).toHaveTextContent('Amba Avo To Ramiye'); // 140 BPM
    expect(bpmLinks[2]).toHaveTextContent('Time'); // 120 BPM
  });

  it('focuses search input when pressing "/" key', () => {
    render(<SongList initialSongs={mockSongs} />);
    const searchInput = screen.getByPlaceholderText(/search songs/i);

    expect(document.activeElement).not.toBe(searchInput);
    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(searchInput);
  });
});

