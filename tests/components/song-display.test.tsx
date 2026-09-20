import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
