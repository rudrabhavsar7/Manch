import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SongRenderer } from '@/components/songs/song-renderer';

describe('SongRenderer', () => {
  it('renders song content with chords', () => {
    const content = '[Am]Hello [G]world\n[C]Second line';
    render(<SongRenderer content={content} transpose={0} />);
    expect(screen.getByText('Am')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('applies transpose', () => {
    const content = '[Am]Hello';
    render(<SongRenderer content={content} transpose={2} />);
    expect(screen.getByText('Bm')).toBeInTheDocument();
    expect(screen.queryByText('Am')).not.toBeInTheDocument();
  });

  it('renders section markers', () => {
    const content = '--- Chorus ---\n[G]Sing along';
    render(<SongRenderer content={content} transpose={0} />);
    expect(screen.getByText('--- Chorus ---')).toBeInTheDocument();
  });

  it('applies custom fontSize and className', () => {
    const content = '[Am]Hello';
    const { container } = render(
      <SongRenderer content={content} transpose={0} fontSize={20} className="custom-test" />
    );
    expect(container.firstElementChild).toHaveStyle({ fontSize: '20px' });
    expect(container.firstElementChild).toHaveClass('custom-test');
  });
});
