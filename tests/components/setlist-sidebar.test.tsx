import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SetlistSidebar } from '@/components/live/setlist-sidebar';
import { useGigStore } from '@/stores/gig-store';
import { Tables } from '@/types/database';

type Song = Tables<'songs'>;

const mockSongs: Song[] = [
  { id: '1', title: 'Song 1', artist: 'Artist 1', key: 'C', bpm: 120, content: 'Test', structure: [], owner_id: 'user-1', created_at: '', updated_at: '' },
  { id: '2', title: 'Song 2', artist: 'Artist 2', key: 'D', bpm: 100, content: 'Test', structure: [], owner_id: 'user-1', created_at: '', updated_at: '' },
];

describe('SetlistSidebar', () => {
  beforeEach(() => {
    useGigStore.setState({ activeSongId: '1' });
  });

  it('renders songs with correct numbering and details', () => {
    render(<SetlistSidebar songs={mockSongs} isAdmin={true} />);
    expect(screen.getByText('Song 1')).toBeInTheDocument();
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    
    expect(screen.getByText('Song 2')).toBeInTheDocument();
    expect(screen.getByText('Artist 2')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('highlights active song', () => {
    render(<SetlistSidebar songs={mockSongs} isAdmin={true} />);
    const activeItem = screen.getByTestId('setlist-item-1');
    expect(activeItem).toHaveClass('bg-primary');
    
    const inactiveItem = screen.getByTestId('setlist-item-2');
    expect(inactiveItem).not.toHaveClass('bg-primary');
  });

  it('calls onSongSelect when admin clicks song', () => {
    const onSelect = vi.fn();
    render(<SetlistSidebar songs={mockSongs} isAdmin={true} onSongSelect={onSelect} />);
    
    fireEvent.click(screen.getByTestId('setlist-item-2'));
    expect(onSelect).toHaveBeenCalledWith('2');
  });

  it('does not allow musician to click songs', () => {
    const onSelect = vi.fn();
    render(<SetlistSidebar songs={mockSongs} isAdmin={false} onSongSelect={onSelect} />);
    
    const item = screen.getByTestId('setlist-item-2');
    expect(item).toBeDisabled();
    fireEvent.click(item);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows search input for admin only', () => {
    const { unmount } = render(<SetlistSidebar songs={mockSongs} isAdmin={true} />);
    expect(screen.getByTestId('setlist-search')).toBeInTheDocument();
    unmount();

    render(<SetlistSidebar songs={mockSongs} isAdmin={false} />);
    expect(screen.queryByTestId('setlist-search')).not.toBeInTheDocument();
  });

  it('filters songs by title and by artist', () => {
    render(<SetlistSidebar songs={mockSongs} isAdmin={true} />);
    const input = screen.getByTestId('setlist-search');

    fireEvent.change(input, { target: { value: 'song 2' } });
    expect(screen.getByTestId('setlist-item-2')).toBeInTheDocument();
    expect(screen.queryByTestId('setlist-item-1')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'artist 1' } });
    expect(screen.getByTestId('setlist-item-1')).toBeInTheDocument();
    expect(screen.queryByTestId('setlist-item-2')).not.toBeInTheDocument();
  });

  it('keeps original list numbering when filtered', () => {
    render(<SetlistSidebar songs={mockSongs} isAdmin={true} />);
    fireEvent.change(screen.getByTestId('setlist-search'), { target: { value: 'song 2' } });

    expect(within(screen.getByTestId('setlist-item-2')).getByText('2.')).toBeInTheDocument();
  });

  it('shows empty state when nothing matches, clears restore full list', () => {
    render(<SetlistSidebar songs={mockSongs} isAdmin={true} />);
    const input = screen.getByTestId('setlist-search');

    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('No songs match')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByTestId('setlist-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('setlist-item-2')).toBeInTheDocument();
    expect(screen.queryByText('No songs match')).not.toBeInTheDocument();
  });

  describe('setlist queue', () => {
    const queue = [
      { id: 'q1', setlistId: 'sl-1', name: 'Opening' },
      { id: 'q2', setlistId: 'sl-2', name: 'Timli Set' },
    ];

    it('renders queue tabs for admin and forwards switch callback', () => {
      const onSwitch = vi.fn();
      render(
        <SetlistSidebar
          songs={mockSongs}
          isAdmin={true}
          queue={queue}
          activeSetlistId="sl-1"
          onSwitchSetlist={onSwitch}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Timli Set' }));
      expect(onSwitch).toHaveBeenCalledWith(queue[1]);
    });

    it('forwards remove and add callbacks for admin', () => {
      const onRemove = vi.fn();
      const onAdd = vi.fn();
      render(
        <SetlistSidebar
          songs={mockSongs}
          isAdmin={true}
          queue={queue}
          activeSetlistId="sl-1"
          onRemoveSetlist={onRemove}
          onAddSetlist={onAdd}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Remove Timli Set' }));
      expect(onRemove).toHaveBeenCalledWith(queue[1]);

      fireEvent.click(screen.getByRole('button', { name: 'Add setlist' }));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('hides queue tabs for musicians but shows active setlist name', () => {
      render(
        <SetlistSidebar
          songs={mockSongs}
          isAdmin={false}
          queue={queue}
          activeSetlistId="sl-1"
          activeSetName="Opening"
        />
      );

      expect(screen.queryByTestId('queue-tabs')).not.toBeInTheDocument();
      expect(screen.getByText('Opening')).toBeInTheDocument();
    });
  });
});
