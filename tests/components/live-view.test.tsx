import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveView } from '@/components/live/live-view';
import { Tables } from '@/types/database';

// Mock child components
vi.mock('@/components/live/setlist-sidebar', () => ({
  SetlistSidebar: () => <div data-testid="mock-setlist-sidebar" />
}));
vi.mock('@/components/live/song-display', () => ({
  SongDisplay: () => <div data-testid="mock-song-display" />
}));
vi.mock('@/components/live/admin-controls', () => ({
  AdminControls: () => <div data-testid="mock-admin-controls" />
}));
vi.mock('@/components/live/musician-controls', () => ({
  MusicianControls: () => <div data-testid="mock-musician-controls" />
}));
vi.mock('@/components/live/member-list', () => ({
  MemberList: () => <div data-testid="mock-member-list" />
}));
vi.mock('@/components/gigs/connection-badge', () => ({
  ConnectionBadge: () => <div data-testid="mock-connection-badge" />
}));

vi.mock('@/hooks/use-sync', () => ({
  useSync: () => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    send: vi.fn()
  })
}));

type Gig = Tables<'gigs'>;
type Song = Tables<'songs'>;

const mockGig: Gig = {
  id: 'gig-1',
  name: 'Test Gig',
  admin_id: 'user-1',
  setlist_id: 'setlist-1',
  pin: '1234',
  status: 'live',
  created_at: '',
  ended_at: null
};

const mockSongs: Song[] = [];

describe('LiveView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders top bar, sidebar, and song display', () => {
    render(
      <LiveView 
        gig={mockGig} 
        songs={mockSongs} 
        songIds={[]} 
        myRole="admin" 
        userId="user-1" 
      />
    );
    
    expect(screen.getByText('Test Gig')).toBeInTheDocument();
    expect(screen.getByText('PIN: 1234')).toBeInTheDocument();
    
    // One for desktop, one in mobile sheet
    expect(screen.getAllByTestId('mock-setlist-sidebar').length).toBeGreaterThan(0);
    expect(screen.getByTestId('mock-song-display')).toBeInTheDocument();
  });

  it('renders admin controls for admin role', () => {
    render(
      <LiveView 
        gig={mockGig} 
        songs={mockSongs} 
        songIds={[]} 
        myRole="admin" 
        userId="user-1" 
      />
    );
    
    expect(screen.getByTestId('mock-admin-controls')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-musician-controls')).not.toBeInTheDocument();
  });

  it('renders musician controls for musician role', () => {
    render(
      <LiveView 
        gig={mockGig} 
        songs={mockSongs} 
        songIds={[]} 
        myRole="musician" 
        userId="user-1" 
      />
    );
    
    expect(screen.getByTestId('mock-musician-controls')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-admin-controls')).not.toBeInTheDocument();
    expect(screen.queryByText('PIN: 1234')).not.toBeInTheDocument();
  });
});
