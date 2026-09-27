import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Tables } from '@/types/database';
import { TransposeControl } from './transpose-control';
import { FontSizeControl } from './font-size-control';
import { AutoScroll } from './auto-scroll';
import { SongRenderer } from '@/components/songs/song-renderer';
import { useUIStore } from '@/stores/ui-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAnnotations } from '@/hooks/use-annotations';
import { GeneralNotes } from './general-notes';
import { AnnotationLayer } from './annotation-layer';
import { useGigStore } from '@/stores/gig-store';
import { throttle } from '@/lib/utils/throttle';
import { ChevronLeft, ChevronRight, FileText, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, Minimize2, Scan, SkipBack, SkipForward } from 'lucide-react';

type Song = Tables<'songs'>;

const PHOTO_MIN_SCALE = 1;
const PHOTO_MAX_SCALE = 8;
const WHEEL_STEP = 1.1;
const BUTTON_STEP = 1.25;
const PINCH_BASE_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

const clampScale = (value: number) =>
  Math.min(PHOTO_MAX_SCALE, Math.max(PHOTO_MIN_SCALE, value));

export interface SongPhoto {
  id: string;
  url: string;
}

interface SongDisplayProps {
  song: Song | null;
  isAdmin: boolean;
  send?: (msg: import('@/lib/sync/message-types').SyncMessage) => void;
  photos?: SongPhoto[];
  songs?: Song[];
  onSongSelect?: (songId: string) => void;
}

export function SongDisplay({ song, isAdmin, send, photos = [], songs = [], onSongSelect }: SongDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fontSize = useUIStore((state) => state.fontSize);
  const transpose = useUIStore((state) => state.transposeMap[song?.id || ''] || 0);
  const scrollLock = useUIStore((state) => state.scrollLock);
  const scrollPosition = useGigStore((state) => state.scrollPosition);
  const { inlineAnnotations, generalAnnotations, addAnnotation, deleteAnnotation } = useAnnotations(song?.id || '');

  const [viewMode, setViewMode] = useState<'lyrics' | 'photo'>('lyrics');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [scale, setScale] = useState(PHOTO_MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const photoContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const pinchedRef = useRef(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    setViewMode('lyrics');
    setPhotoIndex(0);
    setScale(PHOTO_MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  }, [song?.id]);

  useEffect(() => {
    setScale(PHOTO_MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  }, [photoIndex]);

  useEffect(() => {
    if (scale === PHOTO_MIN_SCALE && (offset.x !== 0 || offset.y !== 0)) {
      setOffset({ x: 0, y: 0 });
    }
  }, [scale, offset]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(document.fullscreenElement === photoContainerRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => clampScale(e.deltaY < 0 ? s * WHEEL_STEP : s / WHEEL_STEP));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= PHOTO_MIN_SCALE) return;
    dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
  }, [scale]);

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchedRef.current = true;
      const a = e.touches[0];
      const b = e.touches[1];
      pinchRef.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        scale,
      };
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const a = e.touches[0];
    const b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinchRef.current.dist > 0) {
      setScale(clampScale(pinchRef.current.scale * (dist / pinchRef.current.dist)));
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) return;
    pinchRef.current = null;
    if (pinchedRef.current) {
      pinchedRef.current = false;
      lastTapRef.current = 0;
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      setScale((s) => (s > PHOTO_MIN_SCALE ? PHOTO_MIN_SCALE : PINCH_BASE_SCALE));
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await photoContainerRef.current?.requestFullscreen();
    }
  }, []);

  const throttledSend = React.useMemo(() => throttle((el: HTMLDivElement) => {
    if (!isAdmin || !send) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    const percentage = el.scrollTop / maxScroll;
    send({
      type: 'SCROLL_SYNC',
      position: el.scrollTop,
      percentage,
      timestamp: Date.now(),
    });
  }, 100), [isAdmin, send]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      throttledSend(scrollRef.current);
    }
  }, [throttledSend]);

  useEffect(() => {
    if (isAdmin || !scrollLock || !scrollPosition || !scrollRef.current) return;
    const el = scrollRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    
    // Smooth scroll to the synced percentage
    el.scrollTo({
      top: scrollPosition.percentage * maxScroll,
      behavior: 'smooth',
    });
  }, [scrollPosition, scrollLock, isAdmin]);

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stage text-muted-foreground h-full">
        No song selected
      </div>
    );
  }

  const hasContent = Boolean(song.content && song.content.trim());
  const hasPhotos = photos.length > 0;
  const showToggle = hasContent && hasPhotos;
  const showPhoto = hasPhotos && (!hasContent || viewMode === 'photo');
  const safeIndex = Math.min(photoIndex, photos.length - 1);
  const songIndex = songs.findIndex((s) => s.id === song.id);
  const showSongNav = isFullscreen && isAdmin && songs.length > 1 && songIndex >= 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-stage overflow-hidden relative">
      <div className="p-4 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-4 z-10">
        <div>
          <h1 className="text-2xl font-bold">{song.title}</h1>
          <div className="flex items-center space-x-3 mt-1 text-muted-foreground">
            <span>{song.artist}</span>
            {song.bpm && (
              <>
                <span>&bull;</span>
                <span>{song.bpm} BPM</span>
              </>
            )}
            {song.key && (
              <>
                <span>&bull;</span>
                <Badge variant="outline">{song.key}</Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 bg-elevated p-2 rounded-lg">
          {showToggle && (
            <Button
              size="sm"
              variant="outline"
              data-testid="view-toggle"
              aria-label={viewMode === 'lyrics' ? 'Show photo' : 'Show lyrics'}
              className="border-stageBorder text-textPrimary hover:bg-elevated"
              onClick={() => setViewMode((m) => (m === 'lyrics' ? 'photo' : 'lyrics'))}
            >
              {viewMode === 'lyrics' ? (
                <>
                  <ImageIcon className="h-4 w-4 mr-1" /> Photo
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" /> Lyrics
                </>
              )}
            </Button>
          )}
          {showToggle && <div className="w-px h-6 bg-border mx-1" />}
          <GeneralNotes
            annotations={generalAnnotations}
            onAdd={(content, color) => addAnnotation('general', content, color)}
            onDelete={deleteAnnotation}
          />
          {(!showPhoto || !isAdmin) && <div className="w-px h-6 bg-border mx-1" />}
          {!isAdmin && (
            <>
              <TransposeControl songId={song.id} originalKey={song.key || 'C'} />
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}
          {!showPhoto && (
            <>
              <FontSizeControl />
              <div className="w-px h-6 bg-border mx-1" />
              <AutoScroll containerRef={scrollRef} />
            </>
          )}
        </div>
      </div>
      
      {showPhoto ? (
        <div
          ref={photoContainerRef}
          data-testid="photo-viewer"
          data-fullscreen={isFullscreen}
          className="relative flex-1 flex flex-col items-center justify-center p-4 overflow-hidden bg-stage"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={photos[safeIndex]?.url}
            alt="Song photo"
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              cursor: scale > PHOTO_MIN_SCALE ? 'grab' : 'default',
            }}
            draggable={false}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-elevated border border-stageBorder rounded-lg px-3 py-2 z-10">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Zoom out"
              data-testid="photo-zoom-out"
              disabled={scale <= PHOTO_MIN_SCALE}
              className="text-textPrimary"
              onClick={() => setScale((s) => clampScale(s / BUTTON_STEP))}
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
              onClick={() => setScale((s) => clampScale(s * BUTTON_STEP))}
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
              onClick={() => {
                setScale(PHOTO_MIN_SCALE);
                setOffset({ x: 0, y: 0 });
              }}
            >
              <Scan className="h-4 w-4 mr-1" /> Fit
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            {showSongNav && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Previous song"
                  data-testid="photo-song-prev"
                  disabled={songIndex === 0}
                  className="text-textPrimary"
                  onClick={() => onSongSelect?.(songs[songIndex - 1].id)}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <span
                  data-testid="photo-song-counter"
                  className="text-xs font-mono text-muted-foreground w-10 text-center"
                >
                  {songIndex + 1}/{songs.length}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Next song"
                  data-testid="photo-song-next"
                  disabled={songIndex === songs.length - 1}
                  className="text-textPrimary"
                  onClick={() => onSongSelect?.(songs[songIndex + 1].id)}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              data-testid="photo-fullscreen"
              className="text-textPrimary"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
          {photos.length > 1 && (
            <div className="flex items-center gap-4 mt-4">
              <Button
                size="icon"
                variant="outline"
                aria-label="Previous photo"
                data-testid="photo-prev"
                disabled={safeIndex === 0}
                className="border-stageBorder text-textPrimary"
                onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span data-testid="photo-counter" className="text-sm text-muted-foreground font-mono">
                {safeIndex + 1}/{photos.length}
              </span>
              <Button
                size="icon"
                variant="outline"
                aria-label="Next photo"
                data-testid="photo-next"
                disabled={safeIndex === photos.length - 1}
                className="border-stageBorder text-textPrimary"
                onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className={`flex-1 p-8 ${scrollLock ? 'overflow-hidden' : 'overflow-y-auto'}`}
          data-testid="song-scroll-container"
          onScroll={isAdmin ? handleScroll : undefined}
        >
          <div className="max-w-4xl mx-auto pb-64">
            <SongRenderer
              content={song.content}
              transpose={transpose}
              fontSize={fontSize}
              renderAnnotation={(lineNumber) => (
                <AnnotationLayer
                  lineNumber={lineNumber}
                  annotations={inlineAnnotations}
                  onAdd={(content, color) => addAnnotation('inline', content, color, lineNumber)}
                  onDelete={deleteAnnotation}
                />
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
