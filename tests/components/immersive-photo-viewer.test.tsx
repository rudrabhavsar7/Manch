import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ImmersivePhotoViewer } from '@/components/photos/immersive-photo-viewer';
import { useUIStore } from '@/stores/ui-store';

const photos = [
  { id: 'p1', url: 'https://example.com/1.jpg' },
  { id: 'p2', url: 'https://example.com/2.jpg' },
];

const songNav = (
  <>
    <button data-testid="photo-song-prev">prev song</button>
    <span data-testid="photo-song-counter">2/3</span>
    <button data-testid="photo-song-next">next song</button>
  </>
);

const sheetExtra = <div data-testid="sheet-extra">extras</div>;

describe('ImmersivePhotoViewer', () => {
  afterEach(() => cleanup());

  describe('immersive idle chrome', () => {
    it('shows title chip, controls chip and counter but hides prev/next', () => {
      render(
        <ImmersivePhotoViewer photos={photos} immersive title="Dakor Na Thakor" subtitle="Desi (2 Tali)" />,
      );
      expect(screen.getByTestId('photo-title-chip')).toHaveTextContent('Dakor Na Thakor');
      expect(screen.getByTestId('photo-controls')).toBeInTheDocument();
      expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');
      expect(screen.queryByTestId('photo-prev')).not.toBeInTheDocument();
      expect(screen.queryByTestId('photo-next')).not.toBeInTheDocument();
      // zoom controls live in the sheet, not the idle surface
      expect(screen.queryByTestId('photo-zoom-level')).not.toBeInTheDocument();
    });

    it('tapping the photo reveals prev/next then auto-hides after 1s', () => {
      vi.useFakeTimers();
      render(<ImmersivePhotoViewer photos={photos} immersive />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.click(viewer);
      expect(screen.getByTestId('photo-prev')).toBeInTheDocument();
      expect(screen.getByTestId('photo-next')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(screen.getByTestId('photo-prev')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByTestId('photo-prev')).not.toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe('control sheet', () => {
    it('opens from the controls chip with zoom controls and closes', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive />);
      expect(screen.queryByTestId('photo-zoom-in')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('photo-controls'));
      expect(screen.getByTestId('photo-zoom-in')).toBeInTheDocument();
      expect(screen.getByTestId('photo-zoom-out')).toBeInTheDocument();
      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
      expect(screen.getByTestId('photo-zoom-reset')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('photo-sheet-close'));
      expect(screen.queryByTestId('photo-zoom-in')).not.toBeInTheDocument();
    });

    it('swiping up on the photo opens the sheet', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.touchStart(viewer, { touches: [{ clientX: 100, clientY: 500 }], changedTouches: [{ clientX: 100, clientY: 500 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 102, clientY: 380 }] });

      expect(screen.getByTestId('photo-zoom-in')).toBeInTheDocument();
    });

    it('renders sheetExtra and songNav inside the sheet when open', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive sheetExtra={sheetExtra} songNav={songNav} />);
      expect(screen.queryByTestId('sheet-extra')).not.toBeInTheDocument();
      expect(screen.queryByTestId('photo-song-next')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('photo-controls'));

      expect(screen.getByTestId('sheet-extra')).toBeInTheDocument();
      expect(screen.getByTestId('photo-song-next')).toBeInTheDocument();
    });

    it('swiping down closes an open sheet', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive />);
      const viewer = screen.getByTestId('photo-viewer');
      fireEvent.click(screen.getByTestId('photo-controls'));
      expect(screen.getByTestId('photo-zoom-in')).toBeInTheDocument();

      fireEvent.touchStart(viewer, { touches: [{ clientX: 100, clientY: 300 }], changedTouches: [{ clientX: 100, clientY: 300 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 100, clientY: 420 }] });

      expect(screen.queryByTestId('photo-zoom-in')).not.toBeInTheDocument();
    });
  });

  describe('collapse / expand', () => {
    it('calls onCollapse on the minimize chip', () => {
      const onCollapse = vi.fn();
      render(<ImmersivePhotoViewer photos={photos} immersive onCollapse={onCollapse} />);
      fireEvent.click(screen.getByTestId('photo-minimize'));
      expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    it('swiping down on idle photo calls onCollapse', () => {
      const onCollapse = vi.fn();
      render(<ImmersivePhotoViewer photos={photos} immersive onCollapse={onCollapse} />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.touchStart(viewer, { touches: [{ clientX: 100, clientY: 200 }], changedTouches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 100, clientY: 320 }] });

      expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    it('calls onExpand on the maximize chip when inline', () => {
      const onExpand = vi.fn();
      render(<ImmersivePhotoViewer photos={photos} immersive={false} onExpand={onExpand} />);
      fireEvent.click(screen.getByTestId('photo-expand'));
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('hides the expand chip when onExpand is absent', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      expect(screen.queryByTestId('photo-expand')).not.toBeInTheDocument();
    });
  });

  describe('inline (desktop) chrome', () => {
    it('shows zoom controls and prev/next immediately without tapping', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} title="Desktop" />);

      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
      expect(screen.getByTestId('photo-zoom-in')).toBeInTheDocument();
      expect(screen.getByTestId('photo-prev')).toBeInTheDocument();
      expect(screen.getByTestId('photo-next')).toBeInTheDocument();
      // immersive-only chips are absent
      expect(screen.queryByTestId('photo-minimize')).not.toBeInTheDocument();
      expect(screen.queryByTestId('photo-controls')).not.toBeInTheDocument();
    });

    it('renders songNav in the inline bottom bar', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} songNav={songNav} />);
      expect(screen.getByTestId('photo-song-next')).toBeInTheDocument();
    });
  });

  describe('zoom', () => {
    it('wheel zooms and buttons adjust level, fit resets', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.wheel(viewer, { deltaY: -100 });
      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('110%');

      fireEvent.click(screen.getByTestId('photo-zoom-out'));
      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
      expect(screen.getByTestId('photo-zoom-out')).toBeDisabled();
      expect(screen.getByTestId('photo-zoom-reset')).toBeDisabled();

      fireEvent.click(screen.getByTestId('photo-zoom-in'));
      fireEvent.click(screen.getByTestId('photo-zoom-in'));
      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('156%');
      fireEvent.click(screen.getByTestId('photo-zoom-reset'));
      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
    });

    it('trackpad pinch-to-zoom (ctrlKey) zooms photo smoothly and prevents browser window zoom', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      const viewer = screen.getByTestId('photo-viewer');

      const pinchZoomIn = new WheelEvent('wheel', {
        deltaY: -20,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        viewer.dispatchEvent(pinchZoomIn);
      });

      expect(pinchZoomIn.defaultPrevented).toBe(true);
      expect(useUIStore.getState().photoScale).toBeGreaterThan(1.1);
      expect(useUIStore.getState().photoScale).toBeLessThan(1.4);

      const pinchZoomOut = new WheelEvent('wheel', {
        deltaY: 50,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        viewer.dispatchEvent(pinchZoomOut);
      });

      expect(pinchZoomOut.defaultPrevented).toBe(true);
      expect(useUIStore.getState().photoScale).toBe(1);
    });

    it('Safari trackpad gestures zoom photo and prevent default page zoom', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      const viewer = screen.getByTestId('photo-viewer');

      const gestureStart = new CustomEvent('gesturestart', { bubbles: true, cancelable: true });
      act(() => {
        viewer.dispatchEvent(gestureStart);
      });
      expect(gestureStart.defaultPrevented).toBe(true);

      const gestureChange = new CustomEvent('gesturechange', { bubbles: true, cancelable: true });
      Object.defineProperty(gestureChange, 'scale', { value: 1.35 });
      act(() => {
        viewer.dispatchEvent(gestureChange);
      });

      expect(gestureChange.defaultPrevented).toBe(true);
      expect(useUIStore.getState().photoScale).toBeCloseTo(1.35);

      const gestureEnd = new CustomEvent('gestureend', { bubbles: true, cancelable: true });
      act(() => {
        viewer.dispatchEvent(gestureEnd);
      });
      expect(gestureEnd.defaultPrevented).toBe(true);
    });
  });

  describe('swipe to change song', () => {
    it('swiping left calls onSwipeSong(1) and leaves the photo alone', () => {
      const onSwipeSong = vi.fn();
      render(<ImmersivePhotoViewer photos={photos} immersive={false} onSwipeSong={onSwipeSong} />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 400 }], changedTouches: [{ clientX: 300, clientY: 400 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 180, clientY: 402 }] });

      expect(onSwipeSong).toHaveBeenCalledTimes(1);
      expect(onSwipeSong).toHaveBeenCalledWith(1);
      expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');
    });

    it('swiping right calls onSwipeSong(-1)', () => {
      const onSwipeSong = vi.fn();
      render(<ImmersivePhotoViewer photos={photos} immersive={false} onSwipeSong={onSwipeSong} />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.touchStart(viewer, { touches: [{ clientX: 180, clientY: 400 }], changedTouches: [{ clientX: 180, clientY: 400 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 300, clientY: 402 }] });

      expect(onSwipeSong).toHaveBeenCalledWith(-1);
      expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');
    });

    it('ignores horizontal swipe while the control sheet is open', () => {
      const onSwipeSong = vi.fn();
      render(<ImmersivePhotoViewer photos={photos} immersive onSwipeSong={onSwipeSong} />);
      const viewer = screen.getByTestId('photo-viewer');
      fireEvent.click(screen.getByTestId('photo-controls'));

      fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 400 }], changedTouches: [{ clientX: 300, clientY: 400 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 180, clientY: 402 }] });

      expect(onSwipeSong).not.toHaveBeenCalled();
    });

    it('ignores horizontal swipe while zoomed (pans instead)', () => {
      const onSwipeSong = vi.fn();
      render(<ImmersivePhotoViewer photos={photos} immersive={false} onSwipeSong={onSwipeSong} />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.wheel(viewer, { deltaY: -100 });
      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('110%');

      fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 400 }], changedTouches: [{ clientX: 300, clientY: 400 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 180, clientY: 402 }] });

      expect(onSwipeSong).not.toHaveBeenCalled();
      expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');
    });

    it('without onSwipeSong, horizontal swipe still steps the photo', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 400 }], changedTouches: [{ clientX: 300, clientY: 400 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 180, clientY: 402 }] });

      expect(screen.getByTestId('photo-counter')).toHaveTextContent('2/2');
    });
  });

  describe('photo navigation', () => {
    it('prev/next changes the photo and counter', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');
      expect(screen.getByAltText('Song photo')).toHaveAttribute('src', photos[0].url);

      fireEvent.click(screen.getByTestId('photo-next'));
      expect(screen.getByTestId('photo-counter')).toHaveTextContent('2/2');
      expect(screen.getByAltText('Song photo')).toHaveAttribute('src', photos[1].url);

      fireEvent.click(screen.getByTestId('photo-prev'));
      expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');
    });

    it('swiping horizontally changes photo', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 400 }], changedTouches: [{ clientX: 300, clientY: 400 }] });
      fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 180, clientY: 402 }] });

      expect(screen.getByTestId('photo-counter')).toHaveTextContent('2/2');
    });

    it('resets zoom when switching photos', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      const viewer = screen.getByTestId('photo-viewer');

      fireEvent.wheel(viewer, { deltaY: -100 });
      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('110%');

      fireEvent.click(screen.getByTestId('photo-next'));
      expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
    });

    it('starts at the provided initial index', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} initialIndex={1} />);
      expect(screen.getByTestId('photo-counter')).toHaveTextContent('2/2');
      expect(screen.getByAltText('Song photo')).toHaveAttribute('src', photos[1].url);
    });
  });

  describe('hideBottomCluster and uiStore sync', () => {
    it('omits bottom cluster when hideBottomCluster is true and !immersive', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} hideBottomCluster={true} />);
      expect(screen.queryByTestId('photo-zoom-level')).not.toBeInTheDocument();
      expect(screen.queryByTestId('photo-zoom-in')).not.toBeInTheDocument();
      expect(screen.queryByTestId('photo-prev')).not.toBeInTheDocument();
      expect(screen.queryByTestId('photo-next')).not.toBeInTheDocument();
      expect(screen.queryByTestId('photo-counter')).not.toBeInTheDocument();
    });

    it('syncs scale and index with uiStore bidirectionally', () => {
      render(<ImmersivePhotoViewer photos={photos} immersive={false} />);
      expect(useUIStore.getState().photoScale).toBe(1);
      expect(useUIStore.getState().photoIndex).toBe(0);

      // External zoom from store updates viewer
      act(() => {
        useUIStore.getState().setPhotoScale(2);
      });
      expect(screen.getByAltText('Song photo').style.transform).toContain('scale(2)');

      // External index from store updates viewer
      act(() => {
        useUIStore.getState().setPhotoIndex(1);
      });
      expect(screen.getByAltText('Song photo')).toHaveAttribute('src', photos[1].url);

      // Internal gesture/action updates store (photo was switched to index 1, which reset zoom to 1)
      const viewer = screen.getByTestId('photo-viewer');
      fireEvent.wheel(viewer, { deltaY: -100 });
      expect(useUIStore.getState().photoScale).toBeCloseTo(1.1);

      fireEvent.click(screen.getByTestId('photo-prev'));
      expect(useUIStore.getState().photoIndex).toBe(0);
    });
  });
});
