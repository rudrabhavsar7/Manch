import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GigCard, type Gig } from '@/components/gigs/gig-card';

describe('GigCard', () => {
  const liveGig: Gig = {
    id: 'gig-live-1',
    name: 'Friday Night Live at Blue Frog',
    admin_id: 'user-1',
    setlist_id: 'setlist-1',
    pin: '4821',
    status: 'live',
    created_at: '2026-03-15T19:00:00Z',
    ended_at: null,
  };

  const draftGig: Gig = {
    id: 'gig-draft-1',
    name: 'Acoustic Jam Rehearsal',
    admin_id: 'user-1',
    setlist_id: 'setlist-2',
    pin: '9999',
    status: 'draft',
    created_at: '2026-03-10T14:00:00Z',
    ended_at: null,
  };

  const endedGig: Gig = {
    id: 'gig-ended-1',
    name: 'Sunday Morning Showcase',
    admin_id: 'user-2',
    setlist_id: 'setlist-3',
    pin: '1234',
    status: 'ended',
    created_at: '2026-02-28T10:00:00Z',
    ended_at: '2026-02-28T12:00:00Z',
  };

  it('renders gig name and link to gig details page', () => {
    render(<GigCard gig={liveGig} />);

    expect(screen.getByText('Friday Night Live at Blue Frog')).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/gigs/gig-live-1');
  });

  it('renders live status badge, pulse icon, and PIN for live gig', () => {
    render(<GigCard gig={liveGig} />);

    expect(screen.getByText('live')).toBeInTheDocument();
    expect(screen.getByTestId('live-pulse-icon')).toBeInTheDocument();
    expect(screen.getByText('PIN: 4821')).toBeInTheDocument();
  });

  it('renders draft status badge without PIN or pulse icon', () => {
    render(<GigCard gig={draftGig} />);

    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.queryByTestId('live-pulse-icon')).not.toBeInTheDocument();
    expect(screen.queryByText(/PIN:/)).not.toBeInTheDocument();
  });

  it('renders ended status badge without PIN or pulse icon', () => {
    render(<GigCard gig={endedGig} />);

    expect(screen.getByText('ended')).toBeInTheDocument();
    expect(screen.queryByTestId('live-pulse-icon')).not.toBeInTheDocument();
    expect(screen.queryByText(/PIN:/)).not.toBeInTheDocument();
  });

  it('renders formatted creation date', () => {
    render(<GigCard gig={liveGig} />);

    const expectedDate = new Date(liveGig.created_at).toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });
});
