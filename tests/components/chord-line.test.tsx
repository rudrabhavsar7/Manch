import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChordLine } from '@/components/songs/chord-line';

describe('ChordLine', () => {
  it('renders chords above lyrics', () => {
    const segments = [
      { chord: 'Am', lyrics: 'Hello ' },
      { chord: 'G', lyrics: 'world' },
    ];
    render(<ChordLine segments={segments} />);
    expect(screen.getByText('Am')).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('renders lyrics-only line without chord row', () => {
    const segments = [{ chord: null, lyrics: 'Just words' }];
    render(<ChordLine segments={segments} />);
    expect(screen.getByText('Just words')).toBeInTheDocument();
    expect(screen.queryByText('Am')).not.toBeInTheDocument();
  });

  it('renders section markers as centered dividers', () => {
    const segments = [{ chord: null, lyrics: '--- Chorus ---' }];
    render(<ChordLine segments={segments} />);
    expect(screen.getByText('--- Chorus ---')).toBeInTheDocument();
  });
});
