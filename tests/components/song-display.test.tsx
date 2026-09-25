import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongDisplay } from '@/components/live/song-display';
import { Tables } from '@/types/database';

// Mock child components
vi.mock('@/components/live/transpose-control', () => ({
  TransposeControl: () => <div data-testid="mock-transpose" />
}));
vi.mock('@/components/live/font-size-control', () => ({
  FontSizeControl: () => <div data-testid="mock-font-size" />
}));
vi.mock('@/components/live/auto-scroll', () => ({
  AutoScroll: () => <div data-testid="mock-auto-scroll" />
}));
vi.mock('@/components/songs/song-renderer', () => ({
  SongRenderer: ({ content }: { content: string }) => <div data-testid="mock-song-renderer">{content}</div>
}));

type Song = Tables<'songs'>;

const mockSong: Song = {
  id: '1',
  title: 'Wonderwall',
  artist: 'Oasis',
  key: 'Em',
  bpm: 88,
  content: 'Today is gonna be the day',
  structure: [],
  owner_id: 'user-1',
  created_at: '',
  updated_at: ''
};

describe('SongDisplay', () => {
  it('renders "No song selected" when song is null', () => {
    render(<SongDisplay song={null} isAdmin={false} />);
    expect(screen.getByText('No song selected')).toBeInTheDocument();
  });

  it('renders song details and controls', () => {
    render(<SongDisplay song={mockSong} isAdmin={true} />);
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    expect(screen.getByText('Oasis')).toBeInTheDocument();
    expect(screen.getByText('88 BPM')).toBeInTheDocument();
    expect(screen.getByText('Em')).toBeInTheDocument();
    
    expect(screen.queryByTestId('mock-transpose')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-font-size')).toBeInTheDocument();
    expect(screen.getByTestId('mock-auto-scroll')).toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toHaveTextContent('Today is gonna be the day');
  });

  it('renders transpose control for musician', () => {
    render(<SongDisplay song={mockSong} isAdmin={false} />);
    expect(screen.getByTestId('mock-transpose')).toBeInTheDocument();
  });

  it('does not render view toggle when song has no photos', () => {
    render(<SongDisplay song={mockSong} isAdmin={true} photos={[]} />);
    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toBeInTheDocument();
  });

  it('shows toggle when both lyrics and photos exist, and switches views', async () => {
    const user = userEvent.setup();
    const photos = [
      { id: 'p1', url: 'https://example.com/1.jpg' },
      { id: 'p2', url: 'https://example.com/2.jpg' },
    ];
    render(<SongDisplay song={mockSong} isAdmin={true} photos={photos} />);

    const toggle = screen.getByTestId('view-toggle');
    expect(toggle).toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByTestId('photo-viewer')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-song-renderer')).not.toBeInTheDocument();
    expect(screen.getByAltText(/song photo/i)).toHaveAttribute('src', 'https://example.com/1.jpg');
  });

  it('navigates multiple photos with prev/next and shows counter', async () => {
    const user = userEvent.setup();
    const photos = [
      { id: 'p1', url: 'https://example.com/1.jpg' },
      { id: 'p2', url: 'https://example.com/2.jpg' },
    ];
    render(<SongDisplay song={mockSong} isAdmin={true} photos={photos} />);

    await user.click(screen.getByTestId('view-toggle'));

    expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');

    await user.click(screen.getByTestId('photo-next'));
    expect(screen.getByTestId('photo-counter')).toHaveTextContent('2/2');
    expect(screen.getByAltText(/song photo/i)).toHaveAttribute('src', 'https://example.com/2.jpg');

    await user.click(screen.getByTestId('photo-prev'));
    expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');
  });

  it('shows photo directly for photo-only song (no lyrics) without toggle', () => {
    const photoOnlySong = { ...mockSong, content: '' };
    const photos = [{ id: 'p1', url: 'https://example.com/1.jpg' }];
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);

    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-viewer')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-song-renderer')).not.toBeInTheDocument();
  });

  it('shows lyrics directly when song has lyrics but no photos', () => {
    render(<SongDisplay song={mockSong} isAdmin={true} photos={[]} />);
    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer')).not.toBeInTheDocument();
  });
});
