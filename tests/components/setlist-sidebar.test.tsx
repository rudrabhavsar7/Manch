import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
