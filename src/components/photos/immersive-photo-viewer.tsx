'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Scan,
  Minimize2,
  Maximize2,
  Ellipsis,
} from 'lucide-react';

export interface ViewerPhoto {
  id: string;
  url: string;
}

const PHOTO_MIN_SCALE = 1;
const PHOTO_MAX_SCALE = 8;
const WHEEL_STEP = 1.1;
const BUTTON_STEP = 1.25;
const PINCH_BASE_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const AUTO_HIDE_MS = 1000;
const SWIPE_THRESHOLD = 60;

const clampScale = (value: number) =>
  Math.min(PHOTO_MAX_SCALE, Math.max(PHOTO_MIN_SCALE, value));

interface ImmersivePhotoViewerProps {
  photos: ViewerPhoto[];
  immersive: boolean;
  title?: string;
  subtitle?: string;
  onCollapse?: () => void;
  onExpand?: () => void;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  onSwipeSong?: (dir: -1 | 1) => void;
  sheetExtra?: React.ReactNode;
  songNav?: React.ReactNode;
  className?: string;
}

export function ImmersivePhotoViewer({
  photos,
  immersive,
  title,
  subtitle,
  onCollapse,
  onExpand,
  initialIndex = 0,
  onIndexChange,
  onSwipeSong,
  sheetExtra,
  songNav,
  className = '',
}: ImmersivePhotoViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(PHOTO_MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showChrome, setShowChrome] = useState(!immersive);
  const [sheetOpen, setSheetOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const pinchedRef = useRef(false);
  const lastTapRef = useRef(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeIndex = Math.min(index, photos.length - 1);
  const autoHide = immersive;

  useEffect(() => {
    setShowChrome(!immersive);
    if (immersive) setSheetOpen(false);
  }, [immersive]);

  useEffect(() => {
    setScale(PHOTO_MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  }, [safeIndex]);

  useEffect(() => {
    if (scale === PHOTO_MIN_SCALE && (offset.x !== 0 || offset.y !== 0)) {
      setOffset({ x: 0, y: 0 });
    }
  }, [scale, offset]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(photos.length - 1, next));
      setIndex(clamped);
      onIndexChange?.(clamped);
    },
    [photos.length, onIndexChange],
  );

  const revealChrome = useCallback(() => {
    if (!autoHide) return;
    setShowChrome(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowChrome(false), AUTO_HIDE_MS);
  }, [autoHide]);

  const zoomTo = useCallback((value: number) => setScale(clampScale(value)), []);

  const resetZoom = useCallback(() => {
    setScale(PHOTO_MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setScale((s) => clampScale(e.deltaY < 0 ? s * WHEEL_STEP : s / WHEEL_STEP));
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (scale <= PHOTO_MIN_SCALE) return;
      dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    },
    [scale],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      swipedRef.current = false;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        swipeStartRef.current = { x: t.clientX, y: t.clientY };
      }
      if (e.touches.length === 2) {
        pinchedRef.current = true;
        const a = e.touches[0];
        const b = e.touches[1];
        pinchRef.current = {
          dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          scale,
        };
      }
    },
    [scale],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const a = e.touches[0];
    const b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinchRef.current.dist > 0) {
      setScale(clampScale(pinchRef.current.scale * (dist / pinchRef.current.dist)));
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) return;
      pinchRef.current = null;
      if (pinchedRef.current) {
        pinchedRef.current = false;
        lastTapRef.current = 0;
        return;
      }

      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      const t = e.changedTouches[0];
      if (start && t) {
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        const isTap = adx < 12 && ady < 12;

        if (!isTap && adx < SWIPE_THRESHOLD && ady < SWIPE_THRESHOLD) {
          // small drift: treat as nothing
        } else if (!isTap && ady >= SWIPE_THRESHOLD && ady > adx && scale <= PHOTO_MIN_SCALE) {
          swipedRef.current = true;
          if (dy < 0) {
            if (!sheetOpen) setSheetOpen(true);
          } else if (sheetOpen) {
            setSheetOpen(false);
          } else {
            onCollapse?.();
          }
          return;
        } else if (!isTap && adx >= SWIPE_THRESHOLD && adx > ady && scale <= PHOTO_MIN_SCALE) {
          swipedRef.current = true;
          if (!sheetOpen) {
            if (onSwipeSong) {
              onSwipeSong(dx < 0 ? 1 : -1);
            } else if (photos.length > 1) {
              goTo(dx < 0 ? safeIndex + 1 : safeIndex - 1);
            }
          }
          return;
        }
      }

      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        setScale((s) => (s > PHOTO_MIN_SCALE ? PHOTO_MIN_SCALE : PINCH_BASE_SCALE));
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    },
    [goTo, onCollapse, onSwipeSong, photos.length, safeIndex, scale, sheetOpen],
  );

  const handleClick = useCallback(() => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    if (autoHide) revealChrome();
  }, [autoHide, revealChrome]);

  if (photos.length === 0) return null;

  const rootClass = immersive
    ? 'fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden'
    : `relative flex-1 flex items-center justify-center overflow-hidden bg-stage ${className}`;

  const zoomControls = (
    <>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Zoom out"
        data-testid="photo-zoom-out"
        disabled={scale <= PHOTO_MIN_SCALE}
        className="text-textPrimary"
        onClick={() => zoomTo(scale / BUTTON_STEP)}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span
        data-testid="photo-zoom-level"
        className="text-xs font-mono text-muted-foreground w-10 text-center"
      >
        {Math.round(scale * 100)}%
      </span>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Zoom in"
        data-testid="photo-zoom-in"
        disabled={scale >= PHOTO_MAX_SCALE}
        className="text-textPrimary"
        onClick={() => zoomTo(scale * BUTTON_STEP)}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Fit to screen"
        data-testid="photo-zoom-reset"
        disabled={scale <= PHOTO_MIN_SCALE}
        className="text-textPrimary"
        onClick={resetZoom}
      >
        <Scan className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Fit</span>
      </Button>
    </>
  );

  return (
    <div
      ref={containerRef}
      data-testid="photo-viewer"
      data-immersive={immersive}
      className={rootClass}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      <img
        src={photos[safeIndex]?.url}
        alt="Song photo"
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          cursor: scale > PHOTO_MIN_SCALE ? 'grab' : 'default',
        }}
        draggable={false}
      />

      {!immersive && onExpand && (
        <Button
          size="icon"
          variant="secondary"
          data-testid="photo-expand"
          aria-label="Expand photo view"
          className="absolute top-2 right-2 z-10 bg-elevated/90 text-textPrimary border-stageBorder hover:bg-elevated h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}

      {immersive && (
        <>
          <div className="absolute left-3 top-[calc(env(safe-area-inset-top)+12px)] max-w-[45%] z-10">
            <Badge
              data-testid="photo-title-chip"
              variant="secondary"
              className="bg-black/55 text-white border-transparent backdrop-blur-sm truncate max-w-full block text-left"
            >
              {title}
              {subtitle && (
                <span className="block text-[10px] font-normal opacity-70 truncate">{subtitle}</span>
              )}
            </Badge>
          </div>

          <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+12px)] flex items-center gap-2 z-10">
            <Button
              size="sm"
              variant="secondary"
              data-testid="photo-controls"
              aria-label="Open photo controls"
              className="bg-black/55 text-white border-transparent backdrop-blur-sm hover:bg-black/70 h-8 px-2.5"
              onClick={(e) => {
                e.stopPropagation();
                setSheetOpen(true);
              }}
            >
              <span className="text-xs font-mono tabular-nums">{Math.round(scale * 100)}%</span>
              <Ellipsis className="h-4 w-4 ml-0.5" />
            </Button>
            {onCollapse && (
              <Button
                size="icon"
                variant="secondary"
                data-testid="photo-minimize"
                aria-label="Collapse photo view"
                className="bg-black/55 text-white border-transparent backdrop-blur-sm hover:bg-black/70 h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onCollapse();
                }}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {showChrome && photos.length > 1 && (
            <Button
              size="icon"
              variant="secondary"
              aria-label="Previous photo"
              data-testid="photo-chevron-left"
              disabled={safeIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white border-transparent hover:bg-black/70 h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                goTo(safeIndex - 1);
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          {showChrome && photos.length > 1 && (
            <Button
              size="icon"
              variant="secondary"
              aria-label="Next photo"
              data-testid="photo-chevron-right"
              disabled={safeIndex === photos.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white border-transparent hover:bg-black/70 h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                goTo(safeIndex + 1);
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </>
      )}

      {/* bottom cluster */}
      {(!immersive || photos.length > 1) && (
        <div
          className={`absolute bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-10 ${
            immersive
              ? 'bg-black/55 border border-white/15 backdrop-blur-sm rounded-lg px-2 py-1.5'
              : 'bg-elevated border border-stageBorder rounded-lg px-2 sm:px-3 py-1.5 sm:py-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {!immersive && (
            <>
              {zoomControls}
              {songNav && <div className="w-px h-5 bg-border mx-1" />}
              {songNav}
            </>
          )}

          {photos.length > 1 && (
            <>
              {(!immersive || showChrome) && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Previous photo"
                  data-testid="photo-prev"
                  disabled={safeIndex === 0}
                  className={immersive ? 'text-white' : 'text-textPrimary'}
                  onClick={() => goTo(safeIndex - 1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <span
                data-testid="photo-counter"
                className={`text-sm font-mono ${immersive ? 'text-white/80' : 'text-muted-foreground'}`}
              >
                {safeIndex + 1}/{photos.length}
              </span>
              {(!immersive || showChrome) && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Next photo"
                  data-testid="photo-next"
                  disabled={safeIndex === photos.length - 1}
                  className={immersive ? 'text-white' : 'text-textPrimary'}
                  onClick={() => goTo(safeIndex + 1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          data-testid="photo-sheet"
          className="border-t border-border bg-surface text-textPrimary"
        >
          <SheetHeader>
            <SheetTitle className="text-textPrimary truncate">{title}</SheetTitle>
            {subtitle && (
              <SheetDescription className="text-muted-foreground">{subtitle}</SheetDescription>
            )}
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-center gap-2">{zoomControls}</div>
            {songNav && <div className="flex items-center justify-center gap-2">{songNav}</div>}
            {sheetExtra}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
