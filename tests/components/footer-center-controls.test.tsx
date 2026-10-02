import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FooterCenterControls } from '@/components/live/footer-center-controls';
import { useUIStore } from '@/stores/ui-store';

describe('FooterCenterControls', () => {
  beforeEach(() => {
    useUIStore.setState({
      isViewingPhoto: false,
      photoScale: 1,
      photoIndex: 0,
      photoCount: 0,
      fontSize: 16,
    });
  });

  it('renders font size control when viewing lyrics', () => {
    render(<FooterCenterControls />);
    expect(screen.getByTestId('font-size-slider')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-zoom-in')).not.toBeInTheDocument();
  });

  it('renders photo zoom controls when viewing photo', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 1 });
    render(<FooterCenterControls />);

    expect(screen.queryByTestId('font-size-slider')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-zoom-in')).toBeInTheDocument();
    expect(screen.getByTestId('photo-zoom-out')).toBeInTheDocument();
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
    expect(screen.getByTestId('photo-zoom-reset')).toBeInTheDocument();
  });

  it('disables zoom out and reset at min scale', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 1, photoScale: 1 });
    render(<FooterCenterControls />);

    expect(screen.getByTestId('photo-zoom-out')).toBeDisabled();
    expect(screen.getByTestId('photo-zoom-reset')).toBeDisabled();
    expect(screen.getByTestId('photo-zoom-in')).toBeEnabled();
  });

  it('handles zoom in, zoom out, and reset', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 1, photoScale: 1 });
    render(<FooterCenterControls />);

    fireEvent.click(screen.getByTestId('photo-zoom-in'));
    expect(useUIStore.getState().photoScale).toBe(1.25);

    fireEvent.click(screen.getByTestId('photo-zoom-out'));
    expect(useUIStore.getState().photoScale).toBe(1);

    act(() => {
      useUIStore.setState({ photoScale: 2 });
    });
    expect(screen.getByTestId('photo-zoom-reset')).toBeEnabled();

    fireEvent.click(screen.getByTestId('photo-zoom-reset'));
    expect(useUIStore.getState().photoScale).toBe(1);
  });

  it('disables zoom in at max scale', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 1, photoScale: 8 });
    render(<FooterCenterControls />);

    expect(screen.getByTestId('photo-zoom-in')).toBeDisabled();
    expect(screen.getByTestId('photo-zoom-out')).toBeEnabled();
    expect(screen.getByTestId('photo-zoom-reset')).toBeEnabled();
  });

  it('does not render photo pagination when photoCount <= 1', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 1, photoIndex: 0 });
    render(<FooterCenterControls />);

    expect(screen.queryByTestId('photo-counter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-prev')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-next')).not.toBeInTheDocument();
  });

  it('renders photo pagination when photoCount > 1', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 3, photoIndex: 1 });
    render(<FooterCenterControls />);

    expect(screen.getByTestId('photo-counter')).toHaveTextContent('2/3');
    expect(screen.getByTestId('photo-prev')).toBeEnabled();
    expect(screen.getByTestId('photo-next')).toBeEnabled();

    fireEvent.click(screen.getByTestId('photo-next'));
    expect(useUIStore.getState().photoIndex).toBe(2);

    fireEvent.click(screen.getByTestId('photo-prev'));
    expect(useUIStore.getState().photoIndex).toBe(1);
  });

  it('disables prev button at first photo and next button at last photo', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 2, photoIndex: 0 });
    const { rerender } = render(<FooterCenterControls />);

    expect(screen.getByTestId('photo-prev')).toBeDisabled();
    expect(screen.getByTestId('photo-next')).toBeEnabled();

    act(() => {
      useUIStore.setState({ photoIndex: 1 });
    });
    rerender(<FooterCenterControls />);

    expect(screen.getByTestId('photo-prev')).toBeEnabled();
    expect(screen.getByTestId('photo-next')).toBeDisabled();
  });

  it('applies custom className to container', () => {
    const { container: lyricsContainer } = render(<FooterCenterControls className="custom-class" />);
    expect(lyricsContainer.firstElementChild).toHaveClass('custom-class');

    act(() => {
      useUIStore.setState({ isViewingPhoto: true });
    });
    const { container: photoContainer } = render(<FooterCenterControls className="custom-photo-class" />);
    expect(photoContainer.firstElementChild).toHaveClass('custom-photo-class');
  });
});
