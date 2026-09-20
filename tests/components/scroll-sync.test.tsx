import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SongDisplay } from '@/components/live/song-display';
import { Tables } from '@/types/database';
import { useGigStore } from '@/stores/gig-store';
import { useUIStore } from '@/stores/ui-store';

// Mock dependencies
vi.mock('@/components/live/transpose-control', () => ({ TransposeControl: () => <div /> }));
vi.mock('@/components/live/font-size-control', () => ({ FontSizeControl: () => <div /> }));
vi.mock('@/components/live/auto-scroll', () => ({ AutoScroll: () => <div /> }));
vi.mock('@/components/songs/song-renderer', () => ({ SongRenderer: () => <div /> }));
vi.mock('@/components/live/general-notes', () => ({ GeneralNotes: () => <div /> }));

type Song = Tables<'songs'>;

const mockSong: Song = {
  id: '1', title: 'Test', artist: 'Test', content: 'Test', owner_id: '1', created_at: '', updated_at: '', structure: [], key: 'C', bpm: 120
};

describe('Scroll Sync in SongDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGigStore.setState({ scrollPosition: null });
    useUIStore.setState({ scrollLock: false });
  });

  it('admin sends throttled scroll sync messages', () => {
    const sendMock = vi.fn();
    render(<SongDisplay song={mockSong} isAdmin={true} send={sendMock} />);
    
    const container = screen.getByTestId('song-scroll-container');
    
    // Mock properties
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 500 });
    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 250 });
    
    fireEvent.scroll(container);
    
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith({
      type: 'SCROLL_SYNC',
      position: 250,
      percentage: 0.5,
      timestamp: expect.any(Number)
    });

    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 300 });
    fireEvent.scroll(container);
    
    // Should be throttled
    expect(sendMock).toHaveBeenCalledTimes(1);
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // Second call should happen after throttle window
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('musician with scroll lock responds to scroll position updates', () => {
    const scrollToMock = vi.fn();
    
    render(<SongDisplay song={mockSong} isAdmin={false} />);
    const container = screen.getByTestId('song-scroll-container');
    container.scrollTo = scrollToMock;
    
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 500 });
    
    // Enable scroll lock and update store
    act(() => {
      useUIStore.setState({ scrollLock: true });
      useGigStore.setState({ scrollPosition: { position: 250, percentage: 0.5 } });
    });
    
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 250,
      behavior: 'smooth'
    });
  });
});
