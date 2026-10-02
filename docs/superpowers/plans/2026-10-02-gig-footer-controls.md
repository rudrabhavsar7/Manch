# Gig Footer Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move photo zoom/page controls and lyrics font size slider to the gig screen footer bar, remove the floating bottom cluster that blocks sheet music photos, and drop duplicate next/prev song buttons from the viewer.

**Architecture:** 
1. Store transient photo viewer state (`photoScale`, `photoIndex`, `photoCount`, `isViewingPhoto`) in `ui-store.ts`.
2. Create `FooterCenterControls` component that displays photo zoom & page navigation when viewing photos, or font size slider when viewing lyrics.
3. Integrate `FooterCenterControls` into both `AdminControls` and `MusicianControls` in the footer bar.
4. Remove `FontSizeControl` from `SongDisplay` top header and remove the floating bottom cluster and redundant `songNav` from `ImmersivePhotoViewer` on the gig screen.

**Tech Stack:** Next.js 15, React 19, Zustand, Tailwind CSS, Lucide icons, Vitest, Testing Library.

---

### Task 1: Add Photo & View Mode State to `ui-store.ts`

**Files:**
- Modify: `src/stores/ui-store.ts:1-55`
- Test: `tests/unit/ui-store-controls.test.ts`

**Interfaces:**
- Produces:
  - `photoScale: number` (default 1)
  - `photoIndex: number` (default 0)
  - `photoCount: number` (default 0)
  - `isViewingPhoto: boolean` (default false)
  - `setPhotoScale: (scale: number) => void`
  - `resetPhotoScale: () => void`
  - `setPhotoIndex: (index: number) => void`
  - `setPhotoCount: (count: number) => void`
  - `setIsViewingPhoto: (isViewing: boolean) => void`

- [ ] **Step 1: Write failing unit test for photo controls state in `ui-store`**

Create `tests/unit/ui-store-controls.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/ui-store';

describe('UI Store Photo & View Controls', () => {
  beforeEach(() => {
    useUIStore.setState({
      photoScale: 1,
      photoIndex: 0,
      photoCount: 0,
      isViewingPhoto: false,
    });
  });

  it('updates and resets photo scale', () => {
    expect(useUIStore.getState().photoScale).toBe(1);
    useUIStore.getState().setPhotoScale(1.5);
    expect(useUIStore.getState().photoScale).toBe(1.5);
    useUIStore.getState().resetPhotoScale();
    expect(useUIStore.getState().photoScale).toBe(1);
  });

  it('updates photo index and photo count', () => {
    useUIStore.getState().setPhotoCount(3);
    expect(useUIStore.getState().photoCount).toBe(3);
    useUIStore.getState().setPhotoIndex(2);
    expect(useUIStore.getState().photoIndex).toBe(2);
  });

  it('toggles isViewingPhoto', () => {
    expect(useUIStore.getState().isViewingPhoto).toBe(false);
    useUIStore.getState().setIsViewingPhoto(true);
    expect(useUIStore.getState().isViewingPhoto).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/ui-store-controls.test.ts`
Expected: FAIL due to missing actions and properties.

- [ ] **Step 3: Update `src/stores/ui-store.ts`**

Add the photo viewer state and actions without including them in `partialize` (they must stay ephemeral/session-only):
```ts
interface UIState {
  theme: 'dark' | 'light';
  fontSize: number;
  scrollLock: boolean;
  autoScroll: boolean;
  autoScrollSpeed: number;
  transposeMap: Record<string, number>;
  photoScale: number;
  photoIndex: number;
  photoCount: number;
  isViewingPhoto: boolean;
  
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
  setScrollLock: (lock: boolean) => void;
  setAutoScroll: (auto: boolean) => void;
  setAutoScrollSpeed: (speed: number) => void;
  setTranspose: (songId: string, amount: number) => void;
  getTranspose: (songId: string) => number;
  setPhotoScale: (scale: number) => void;
  resetPhotoScale: () => void;
  setPhotoIndex: (index: number) => void;
  setPhotoCount: (count: number) => void;
  setIsViewingPhoto: (isViewing: boolean) => void;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/ui-store-controls.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/ui-store.ts tests/unit/ui-store-controls.test.ts
git commit -m "feat(store): add photo zoom and view mode state to ui-store"
```

---

### Task 2: Create `FooterCenterControls` Component

**Files:**
- Create: `src/components/live/footer-center-controls.tsx`
- Test: `tests/components/footer-center-controls.test.tsx`

**Interfaces:**
- Produces: `<FooterCenterControls className?: string />`
- Consumes: `useUIStore` (`isViewingPhoto`, `photoScale`, `photoIndex`, `photoCount`, `setPhotoScale`, `resetPhotoScale`, `setPhotoIndex`, `fontSize`, `setFontSize`), `<FontSizeControl />`.

- [ ] **Step 1: Write test for `FooterCenterControls`**

Create `tests/components/footer-center-controls.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders photo pagination when photoCount > 1', () => {
    useUIStore.setState({ isViewingPhoto: true, photoCount: 3, photoIndex: 1 });
    render(<FooterCenterControls />);

    expect(screen.getByTestId('photo-counter')).toHaveTextContent('2/3');
    expect(screen.getByTestId('photo-prev')).toBeEnabled();
    expect(screen.getByTestId('photo-next')).toBeEnabled();

    fireEvent.click(screen.getByTestId('photo-next'));
    expect(useUIStore.getState().photoIndex).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/components/footer-center-controls.test.tsx`
Expected: FAIL due to missing module.

- [ ] **Step 3: Implement `src/components/live/footer-center-controls.tsx`**

Implement zoom in/out, fit, and page navigation with accessible test IDs and tooltips/labels:
```tsx
'use client';

import { ZoomIn, ZoomOut, Scan, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { FontSizeControl } from './font-size-control';

const PHOTO_MIN_SCALE = 1;
const PHOTO_MAX_SCALE = 8;
const BUTTON_STEP = 1.25;

export function FooterCenterControls({ className = '' }: { className?: string }) {
  const isViewingPhoto = useUIStore((s) => s.isViewingPhoto);
  const photoScale = useUIStore((s) => s.photoScale);
  const photoIndex = useUIStore((s) => s.photoIndex);
  const photoCount = useUIStore((s) => s.photoCount);
  const setPhotoScale = useUIStore((s) => s.setPhotoScale);
  const resetPhotoScale = useUIStore((s) => s.resetPhotoScale);
  const setPhotoIndex = useUIStore((s) => s.setPhotoIndex);

  if (!isViewingPhoto) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <FontSizeControl />
      </div>
    );
  }

  const zoomTo = (target: number) => {
    const clamped = Math.min(PHOTO_MAX_SCALE, Math.max(PHOTO_MIN_SCALE, target));
    setPhotoScale(Math.round(clamped * 100) / 100);
  };

  return (
    <div className={`flex items-center justify-center gap-1 sm:gap-2 flex-wrap ${className}`}>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Zoom out"
        data-testid="photo-zoom-out"
        disabled={photoScale <= PHOTO_MIN_SCALE}
        className="text-textPrimary h-8 w-8"
        onClick={() => zoomTo(photoScale / BUTTON_STEP)}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span
        data-testid="photo-zoom-level"
        className="text-xs font-mono text-muted-foreground w-10 text-center"
      >
        {Math.round(photoScale * 100)}%
      </span>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Zoom in"
        data-testid="photo-zoom-in"
        disabled={photoScale >= PHOTO_MAX_SCALE}
        className="text-textPrimary h-8 w-8"
        onClick={() => zoomTo(photoScale * BUTTON_STEP)}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Fit to screen"
        data-testid="photo-zoom-reset"
        disabled={photoScale <= PHOTO_MIN_SCALE}
        className="text-textPrimary h-8 px-2"
        onClick={resetPhotoScale}
      >
        <Scan className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Fit</span>
      </Button>

      {photoCount > 1 && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous photo"
            data-testid="photo-prev"
            disabled={photoIndex === 0}
            className="text-textPrimary h-8 w-8"
            onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span
            data-testid="photo-counter"
            className="text-xs font-mono text-muted-foreground"
          >
            {photoIndex + 1}/{photoCount}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next photo"
            data-testid="photo-next"
            disabled={photoIndex >= photoCount - 1}
            className="text-textPrimary h-8 w-8"
            onClick={() => setPhotoIndex(Math.min(photoCount - 1, photoIndex + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/components/footer-center-controls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/live/footer-center-controls.tsx tests/components/footer-center-controls.test.tsx
git commit -m "feat(live): add FooterCenterControls component for zoom and font size"
```

---

### Task 3: Embed Center Controls in `AdminControls` and `MusicianControls`

**Files:**
- Modify: `src/components/live/admin-controls.tsx`
- Modify: `src/components/live/musician-controls.tsx`
- Test: `tests/components/admin-controls.test.tsx`
- Test: `tests/components/musician-controls.test.tsx`

**Interfaces:**
- Consumes: `<FooterCenterControls />`
- Produces: Updated footer bars that contain center controls without horizontal overflow on mobile.

- [ ] **Step 1: Write test for center controls in `AdminControls` and `MusicianControls`**

Create `tests/components/musician-controls.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MusicianControls } from '@/components/live/musician-controls';
import { useUIStore } from '@/stores/ui-store';

describe('MusicianControls', () => {
  beforeEach(() => {
    useUIStore.setState({ isViewingPhoto: false, fontSize: 16 });
  });

  it('renders scroll lock switch, center font-size controls, and connection badge', () => {
    render(<MusicianControls />);
    expect(screen.getByTestId('scroll-lock-switch')).toBeInTheDocument();
    expect(screen.getByTestId('font-size-slider')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update `src/components/live/admin-controls.tsx`**

Integrate `<FooterCenterControls />` between the song navigation buttons and the `End Gig` button.
Ensure flex layout is responsive and cleanly centered.

- [ ] **Step 3: Update `src/components/live/musician-controls.tsx`**

Integrate `<FooterCenterControls />` between the Scroll Lock switch and ConnectionBadge.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/components/admin-controls.test.tsx tests/components/musician-controls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/live/admin-controls.tsx src/components/live/musician-controls.tsx tests/components/musician-controls.test.tsx
git commit -m "feat(live): integrate center controls into admin and musician footers"
```

---

### Task 4: Clean Up `SongDisplay` Top Header & Remove Floating Photo Pill

**Files:**
- Modify: `src/components/live/song-display.tsx`
- Modify: `src/components/photos/immersive-photo-viewer.tsx`
- Test: `tests/components/song-display.test.tsx`
- Test: `tests/components/immersive-photo-viewer.test.tsx`

**Interfaces:**
- Remove `<FontSizeControl />` from `SongDisplay` top header (now housed in footer).
- Remove redundant `songNav` duplicate navigation from `ImmersivePhotoViewer` on gig screen.
- Sync `photoScale` and `photoIndex` between `ImmersivePhotoViewer` and `ui-store`.
- Pass `hideBottomCluster={true}` from `SongDisplay` to `ImmersivePhotoViewer` so no overlay blocks sheet music photos.

- [ ] **Step 1: Update `ImmersivePhotoViewer` to support `hideBottomCluster` and connect with `ui-store`**

In `src/components/photos/immersive-photo-viewer.tsx`:
- Add `hideBottomCluster?: boolean` to `ImmersivePhotoViewerProps`.
- When `hideBottomCluster` is true, omit rendering the floating bottom cluster when `!immersive`.
- Bind `scale` and `index` to `uiStore` when mounted so gestures (pinch, wheel, swipe) update the store, and store changes update the viewer.

- [ ] **Step 2: Update `SongDisplay`**

In `src/components/live/song-display.tsx`:
- Remove `<FontSizeControl />` and its divider from the subheader.
- Sync `setIsViewingPhoto(showPhoto)` and `setPhotoCount(photos.length)` in `useUIStore`.
- Pass `hideBottomCluster={true}` to `ImmersivePhotoViewer`.
- Remove `songNav={songNav}` prop from `ImmersivePhotoViewer`.

- [ ] **Step 3: Update unit tests in `tests/components/song-display.test.tsx`**

Update `song-display.test.tsx` to align with the cleaner header (font size moved to footer; song nav managed by footer).

- [ ] **Step 4: Run vitest suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 5: Verify in Playwright browser**

Navigate to live gig view and verify visually:
- Photo mode has completely clean, unobstructed sheet music.
- Zoom & page controls are in the footer bar.
- Prev/Next song buttons exist ONLY once in the footer.
- Lyrics mode has clean top header; font size slider is in the footer bar.

- [ ] **Step 6: Commit**

```bash
git add src/components/live/song-display.tsx src/components/photos/immersive-photo-viewer.tsx tests/components/song-display.test.tsx
git commit -m "feat(live): move page/zoom controls to footer and clean up top header"
```
