import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminControls } from '@/components/live/admin-controls';
import { useGigStore } from '@/stores/gig-store';
import { useSync } from '@/hooks/use-sync';

vi.mock('@/hooks/use-sync', () => ({
  useSync: vi.fn()
}));

const mockSend = vi.fn();

describe('AdminControls', () => {
  const songIds = ['song-1', 'song-2', 'song-3'];

  beforeEach(() => {
    vi.clearAllMocks();
    (useSync as any).mockReturnValue({ send: mockSend });
    useGigStore.setState({ activeSongId: 'song-2' }); // Middle song
  });

  it('renders counter correctly', () => {
    render(<AdminControls songIds={songIds} />);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('handles previous song correctly', () => {
    render(<AdminControls songIds={songIds} />);
    
    const prevBtn = screen.getByTestId('admin-prev');
    expect(prevBtn).not.toBeDisabled();
    
    fireEvent.click(prevBtn);
    
    expect(useGigStore.getState().activeSongId).toBe('song-1');
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SONG_CHANGE',
      songId: 'song-1'
    }));
  });

  it('handles next song correctly', () => {
    render(<AdminControls songIds={songIds} />);
    
    const nextBtn = screen.getByTestId('admin-next');
    expect(nextBtn).not.toBeDisabled();
    
    fireEvent.click(nextBtn);
    
    expect(useGigStore.getState().activeSongId).toBe('song-3');
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SONG_CHANGE',
      songId: 'song-3'
    }));
  });

  it('disables prev at start and next at end', () => {
    useGigStore.setState({ activeSongId: 'song-1' });
    const { rerender } = render(<AdminControls songIds={songIds} />);
    
    expect(screen.getByTestId('admin-prev')).toBeDisabled();
    expect(screen.getByTestId('admin-next')).not.toBeDisabled();
    
    useGigStore.setState({ activeSongId: 'song-3' });
    rerender(<AdminControls songIds={songIds} />);
    
    expect(screen.getByTestId('admin-prev')).not.toBeDisabled();
    expect(screen.getByTestId('admin-next')).toBeDisabled();
  });

  it('handles end gig', () => {
    render(<AdminControls songIds={songIds} />);
    
    fireEvent.click(screen.getByTestId('admin-end-gig'));
    
    expect(useGigStore.getState().status).toBe('ended');
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      type: 'GIG_STATUS',
      status: 'ended'
    }));
  });
});
