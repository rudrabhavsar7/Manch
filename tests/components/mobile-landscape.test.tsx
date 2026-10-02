import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveView } from '@/components/live/live-view';
import { SongDisplay } from '@/components/live/song-display';
import { AdminControls } from '@/components/live/admin-controls';
import { MusicianControls } from '@/components/live/musician-controls';
import { Tables } from '@/types/database';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/gigs/gig-1',
}));

vi.mock('@/components/live/setlist-sidebar', () => ({
  SetlistSidebar: () => <div data-testid="mock-setlist-sidebar" />,
}));

vi.mock('@/hooks/use-sync', () => ({
  useSync: () => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    send: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));

vi.mock('@/components/gigs/connection-badge', () => ({
  ConnectionBadge: () => <div data-testid="mock-connection-badge" />,
}));

const mockGig: Tables<'gigs'> = {
  id: 'gig-1',
  name: 'Test Gig',
  admin_id: 'user-1',
  setlist_id: 'setlist-1',
  pin: '1234',
  status: 'live',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSong: Tables<'songs'> = {
  id: 'song-1',
  title: 'Landscape Song',
  artist: 'Stage Band',
  key: 'G',
  bpm: 120,
  time_signature: '4/4',
  content: '[G]Lyrics on stage\n[D]Another line of chords',
  notes: null,
  owner_id: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Mobile Landscape Mode Enhancements', () => {
  it('LiveView hides permanent sidebar and shows hamburger menu trigger on short landscape screens', () => {
    const { container } = render(
      <LiveView
        gig={mockGig}
        songs={[mockSong]}
        songIds={[mockSong.id]}
        queue={[]}
        myRole="admin"
        userId="user-1"
      />
    );

    const desktopSidebar = container.querySelector('main > div.w-80');
    expect(desktopSidebar).toHaveClass('short:!hidden');

    const menuButton = screen.getByRole('button', { name: /open setlist/i });
    expect(menuButton).toHaveClass('short:!inline-flex');

    const header = container.querySelector('header');
    expect(header).toHaveClass('short:h-9');
  });

  it('SongDisplay applies compact subheader and reduced padding for mobile landscape', () => {
    const { container } = render(<SongDisplay song={mockSong} isAdmin={true} />);

    const scrollContainer = screen.getByTestId('song-scroll-container');
    expect(scrollContainer).toHaveClass('short:p-3');

    const subheader = container.querySelector('.border-b.bg-surface');
    expect(subheader).toHaveClass('short:py-1');
  });

  it('AdminControls has compact minimum height and padding for short screens', () => {
    const { container } = render(<AdminControls songIds={[mockSong.id]} onSend={vi.fn()} />);

    const root = container.firstElementChild;
    expect(root).toHaveClass('short:min-h-[38px]');
    expect(root).toHaveClass('short:py-1');
  });

  it('MusicianControls has compact minimum height and padding for short screens', () => {
    const { container } = render(<MusicianControls />);

    const root = container.firstElementChild;
    expect(root).toHaveClass('short:min-h-[38px]');
    expect(root).toHaveClass('short:py-1');
  });
});
