import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SongCard } from '@/components/songs/song-card';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

describe('SongCard', () => {
  const song: Song = {
    id: 'test-song-id',
    title: 'Sultans of Swing',
    artist: 'Dire Straits',
    key: 'Dm',
    bpm: 148,
    content: '[Dm]You get a shiver in the dark',
    structure: [],
    owner_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('renders song title, artist, key, and bpm', () => {
    render(<SongCard song={song} />);

    expect(screen.getByText('Sultans of Swing')).toBeInTheDocument();
    expect(screen.getByText('Dire Straits')).toBeInTheDocument();
    expect(screen.getByText('Dm')).toBeInTheDocument();
    expect(screen.getByText('148 BPM')).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/songs/test-song-id');
  });

  it('handles empty artist gracefully', () => {
    render(<SongCard song={{ ...song, artist: '' }} />);

    expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
  });
});
