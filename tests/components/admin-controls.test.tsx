import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { AdminControls } from '@/components/live/admin-controls';
import { useGigStore } from '@/stores/gig-store';
import { useUIStore } from '@/stores/ui-store';
import { useSync } from '@/hooks/use-sync';

vi.mock('@/hooks/use-sync', () => ({
  useSync: vi.fn()
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/gigs/test-gig',
}));

vi.mock('@/hooks/use-gig', () => ({
  useGigActions: () => ({ endGig: vi.fn().mockResolvedValue({ error: null }) }),
}));

const mockSend = vi.fn();

describe('AdminControls', () => {
  const songIds = ['song-1', 'song-2', 'song-3'];

  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useGigStore.setState({ activeSongId: 'song-2' }); // Middle song
      useUIStore.setState({ isViewingPhoto: false, fontSize: 16 });
    });
  });

  it('renders counter correctly', () => {
    render(<AdminControls songIds={songIds} onSend={mockSend} />);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('handles previous song correctly', () => {
    render(<AdminControls songIds={songIds} onSend={mockSend} />);
    
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
    render(<AdminControls songIds={songIds} onSend={mockSend} />);
    
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
    act(() => { useGigStore.setState({ activeSongId: 'song-1' }); });
    const { rerender } = render(<AdminControls songIds={songIds} onSend={mockSend} />);
    
    expect(screen.getByTestId('admin-prev')).toBeDisabled();
    expect(screen.getByTestId('admin-next')).not.toBeDisabled();
    
    act(() => { useGigStore.setState({ activeSongId: 'song-3' }); });
    rerender(<AdminControls songIds={songIds} onSend={mockSend} />);
    
    expect(screen.getByTestId('admin-prev')).not.toBeDisabled();
    expect(screen.getByTestId('admin-next')).toBeDisabled();
  });

  it('handles end gig', async () => {
    render(<AdminControls songIds={songIds} onSend={mockSend} />);
    
    fireEvent.click(screen.getByTestId('admin-end-gig'));
    
    await waitFor(() => expect(useGigStore.getState().status).toBe('ended'));
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      type: 'GIG_STATUS',
      status: 'ended'
    }));
  });

  it('routes to dashboard after ending gig', async () => {
    render(<AdminControls songIds={songIds} onSend={mockSend} />);

    fireEvent.click(screen.getByTestId('admin-end-gig'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });

  it('fits narrow phone screens', () => {
    render(<AdminControls songIds={['a', 'b']} onSend={vi.fn()} />);

    const bar = screen.getByTestId('admin-prev').closest('[class*="justify-between"]') as HTMLElement;
    expect(bar).toHaveClass('flex-wrap');
    expect(bar).toHaveClass('min-h-[56px]');
    expect(bar).not.toHaveClass('h-[56px]');

    const prev = screen.getByTestId('admin-prev');
    expect(prev).toHaveClass('sm:w-24');
    expect(prev).not.toHaveClass('w-24');

    const next = screen.getByTestId('admin-next');
    expect(next).toHaveClass('sm:w-24');
    expect(next).not.toHaveClass('w-24');
  });

  it('renders center controls in lyrics mode', () => {
    render(<AdminControls songIds={songIds} onSend={mockSend} />);
    expect(screen.getByTestId('font-size-slider')).toBeInTheDocument();
  });

  it('renders photo zoom controls in center when viewing photo', () => {
    act(() => {
      useUIStore.setState({ isViewingPhoto: true, photoCount: 1 });
    });
    render(<AdminControls songIds={songIds} onSend={mockSend} />);
    expect(screen.queryByTestId('font-size-slider')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-zoom-in')).toBeInTheDocument();
  });
});
