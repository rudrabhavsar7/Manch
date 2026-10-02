import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MusicianControls } from '@/components/live/musician-controls';
import { useUIStore } from '@/stores/ui-store';

describe('MusicianControls', () => {
  beforeEach(() => {
    useUIStore.setState({
      isViewingPhoto: false,
      fontSize: 16,
      scrollLock: false,
    });
  });

  it('renders scroll lock switch, center font-size controls, and connection badge', () => {
    render(<MusicianControls />);
    expect(screen.getByTestId('scroll-lock-switch')).toBeInTheDocument();
    expect(screen.getByTestId('font-size-slider')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('toggles scroll lock when switch is clicked', () => {
    render(<MusicianControls />);
    const switchEl = screen.getByTestId('scroll-lock-switch');
    expect(useUIStore.getState().scrollLock).toBe(false);

    fireEvent.click(switchEl);
    expect(useUIStore.getState().scrollLock).toBe(true);
  });

  it('renders photo zoom controls when viewing photo', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 1 });
    render(<MusicianControls />);

    expect(screen.queryByTestId('font-size-slider')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-zoom-in')).toBeInTheDocument();
  });

  it('fits narrow phone screens with responsive layout', () => {
    render(<MusicianControls />);
    const bar = screen.getByTestId('scroll-lock-switch').closest('[class*="justify-between"]') as HTMLElement;
    expect(bar).toHaveClass('flex-wrap');
    expect(bar).toHaveClass('min-h-[56px]');
    expect(bar).not.toHaveClass('h-[56px]');
  });
});
