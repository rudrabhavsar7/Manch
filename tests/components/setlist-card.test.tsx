import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SetlistCard } from '@/components/setlists/setlist-card';
import type { Database } from '@/types/database';

type Setlist = Database['public']['Tables']['setlists']['Row'];

describe('SetlistCard', () => {
  const publicSetlist: Setlist = {
    id: 'setlist-1',
    name: 'Friday Night Live',
    owner_id: 'user-1',
    privacy: 'public',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const privateSetlist: Setlist = {
    id: 'setlist-2',
    name: 'Rehearsal Set',
    owner_id: 'user-1',
    privacy: 'private',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('renders setlist name, song count (plural), and link', () => {
    render(<SetlistCard setlist={publicSetlist} songCount={5} />);

    expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
    expect(screen.getByText('5 songs')).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/setlists/setlist-1');
  });

  it('renders singular song count when songCount is 1', () => {
    render(<SetlistCard setlist={publicSetlist} songCount={1} />);

    expect(screen.getByText('1 song')).toBeInTheDocument();
  });

  it('renders public badge and globe icon for public setlists', () => {
    render(<SetlistCard setlist={publicSetlist} songCount={3} />);

    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument();
  });

  it('renders private badge and lock icon for private setlists', () => {
    render(<SetlistCard setlist={privateSetlist} songCount={0} />);

    expect(screen.getByText('private')).toBeInTheDocument();
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('globe-icon')).not.toBeInTheDocument();
    expect(screen.getByText('0 songs')).toBeInTheDocument();
  });
});
