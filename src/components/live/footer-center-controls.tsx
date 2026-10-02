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
    <div className={`flex items-center justify-center gap-1 sm:gap-2 short:gap-0.5 flex-wrap ${className}`}>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Zoom out"
        data-testid="photo-zoom-out"
        disabled={photoScale <= PHOTO_MIN_SCALE}
        className="text-textPrimary h-8 w-8 short:h-7 short:w-7"
        onClick={() => zoomTo(photoScale / BUTTON_STEP)}
      >
        <ZoomOut className="h-4 w-4 short:h-3.5 short:w-3.5" />
      </Button>
      <span
        data-testid="photo-zoom-level"
        className="text-xs short:text-[11px] font-mono text-muted-foreground w-10 short:w-9 text-center"
      >
        {Math.round(photoScale * 100)}%
      </span>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Zoom in"
        data-testid="photo-zoom-in"
        disabled={photoScale >= PHOTO_MAX_SCALE}
        className="text-textPrimary h-8 w-8 short:h-7 short:w-7"
        onClick={() => zoomTo(photoScale * BUTTON_STEP)}
      >
        <ZoomIn className="h-4 w-4 short:h-3.5 short:w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Fit to screen"
        data-testid="photo-zoom-reset"
        disabled={photoScale <= PHOTO_MIN_SCALE}
        className="text-textPrimary h-8 px-2 short:h-7 short:px-1.5 short:text-xs"
        onClick={resetPhotoScale}
      >
        <Scan className="h-4 w-4 short:h-3.5 short:w-3.5 sm:mr-1" />
        <span className="hidden sm:inline">Fit</span>
      </Button>

      {photoCount > 1 && (
        <>
          <div className="w-px h-5 bg-border mx-1 short:mx-0.5" />
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous photo"
            data-testid="photo-prev"
            disabled={photoIndex === 0}
            className="text-textPrimary h-8 w-8 short:h-7 short:w-7"
            onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
          >
            <ChevronLeft className="h-4 w-4 short:h-3.5 short:w-3.5" />
          </Button>
          <span
            data-testid="photo-counter"
            className="text-xs short:text-[11px] font-mono text-muted-foreground"
          >
            {photoIndex + 1}/{photoCount}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next photo"
            data-testid="photo-next"
            disabled={photoIndex >= photoCount - 1}
            className="text-textPrimary h-8 w-8 short:h-7 short:w-7"
            onClick={() => setPhotoIndex(Math.min(photoCount - 1, photoIndex + 1))}
          >
            <ChevronRight className="h-4 w-4 short:h-3.5 short:w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
