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
import { ChevronLeft, ChevronRight, FileText, Image as ImageIcon } from 'lucide-react';

type Song = Tables<'songs'>;

export interface SongPhoto {
  id: string;
  url: string;
}

interface SongDisplayProps {
  song: Song | null;
  isAdmin: boolean;
  send?: (msg: import('@/lib/sync/message-types').SyncMessage) => void;
  photos?: SongPhoto[];
}

export function SongDisplay({ song, isAdmin, send, photos = [] }: SongDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fontSize = useUIStore((state) => state.fontSize);
  const transpose = useUIStore((state) => state.transposeMap[song?.id || ''] || 0);
  const scrollLock = useUIStore((state) => state.scrollLock);
  const scrollPosition = useGigStore((state) => state.scrollPosition);
  const { inlineAnnotations, generalAnnotations, addAnnotation, deleteAnnotation } = useAnnotations(song?.id || '');

  const [viewMode, setViewMode] = useState<'lyrics' | 'photo'>('lyrics');
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    setViewMode('lyrics');
    setPhotoIndex(0);
  }, [song?.id]);

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
          <div className="w-px h-6 bg-border mx-1" />
          {!isAdmin && (
            <>
              <TransposeControl songId={song.id} originalKey={song.key || 'C'} />
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}
          <FontSizeControl />
          <div className="w-px h-6 bg-border mx-1" />
          <AutoScroll containerRef={scrollRef} />
        </div>
      </div>
      
      {showPhoto ? (
        <div
          data-testid="photo-viewer"
          className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden bg-stage"
        >
          <img
            src={photos[safeIndex]?.url}
            alt="Song photo"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
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
