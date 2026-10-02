import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Tables } from '@/types/database';
import { TransposeControl } from './transpose-control';
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
import { useMediaQuery } from '@/hooks/use-media-query';
import { ImmersivePhotoViewer } from '@/components/photos/immersive-photo-viewer';
import { FileText, Image as ImageIcon } from 'lucide-react';

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

  const setIsViewingPhoto = useUIStore((state) => state.setIsViewingPhoto);
  const setPhotoCount = useUIStore((state) => state.setPhotoCount);
  const resetPhotoScale = useUIStore((state) => state.resetPhotoScale);
  const setPhotoIndex = useUIStore((state) => state.setPhotoIndex);

  const [viewMode, setViewMode] = useState<'lyrics' | 'photo'>('lyrics');
  const [photoCollapsed, setPhotoCollapsed] = useState(false);
  const isPhone = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    setPhotoCollapsed(false);
    resetPhotoScale();
    setPhotoIndex(0);
  }, [song?.id, resetPhotoScale, setPhotoIndex]);

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

  const hasContent = Boolean(song?.content && song.content.trim());
  const hasPhotos = photos.length > 0;
  const showPhoto = Boolean(song && hasPhotos && (!hasContent || viewMode === 'photo'));

  useEffect(() => {
    setIsViewingPhoto(showPhoto);
    setPhotoCount(photos.length);
    return () => {
      setIsViewingPhoto(false);
      setPhotoCount(0);
    };
  }, [showPhoto, photos.length, setIsViewingPhoto, setPhotoCount]);

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stage text-muted-foreground h-full">
        No song selected
      </div>
    );
  }

  const showToggle = hasContent && hasPhotos;
  const songIndex = songs.findIndex((s) => s.id === song.id);
  const showSongNav = isAdmin && songs.length > 1 && songIndex >= 0;
  const immersive = showPhoto && isPhone && !photoCollapsed;

  const handleToggleView = (mode?: 'lyrics' | 'photo') => {
    resetPhotoScale();
    setPhotoIndex(0);
    setViewMode((m) => mode ?? (m === 'lyrics' ? 'photo' : 'lyrics'));
  };

  const swipeSong = showSongNav
    ? (dir: -1 | 1) => {
        const target = songs[songIndex + dir];
        if (target) onSongSelect?.(target.id);
      }
    : undefined;

  const sheetExtra = immersive ? (
    <>
      {showToggle && (
        <div className="flex bg-muted rounded-lg p-1" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'photo'}
            data-testid="sheet-view-photo"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              viewMode === 'photo' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
            }`}
            onClick={() => handleToggleView('photo')}
          >
            <ImageIcon className="h-4 w-4 inline mr-1" />
            Photo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'lyrics'}
            data-testid="sheet-view-lyrics"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              viewMode === 'lyrics' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
            }`}
            onClick={() => handleToggleView('lyrics')}
          >
            <FileText className="h-4 w-4 inline mr-1" />
            Lyrics
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <GeneralNotes
          annotations={generalAnnotations}
          onAdd={(content, color) => addAnnotation('general', content, color)}
          onDelete={deleteAnnotation}
        />
        {!isAdmin && <TransposeControl songId={song.id} originalKey={song.key || 'C'} />}
      </div>
    </>
  ) : undefined;

  return (
    <div className="flex-1 flex flex-col h-full bg-stage overflow-hidden relative">
      <div className="p-3 sm:p-4 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3 sm:gap-4 z-10">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold truncate">{song.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-muted-foreground text-xs sm:text-sm">
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-elevated p-1.5 sm:p-2 rounded-lg">
          {showToggle && (
            <Button
              size="sm"
              variant="outline"
              data-testid="view-toggle"
              aria-label={viewMode === 'lyrics' ? 'Show photo' : 'Show lyrics'}
              className="border-stageBorder text-textPrimary hover:bg-elevated"
              onClick={() => handleToggleView()}
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
          {!isAdmin && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <TransposeControl songId={song.id} originalKey={song.key || 'C'} />
            </>
          )}
          {!showPhoto && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <AutoScroll containerRef={scrollRef} />
            </>
          )}
        </div>
      </div>

      {showPhoto ? (
        <ImmersivePhotoViewer
          key={song.id}
          photos={photos}
          immersive={immersive}
          title={song.title}
          subtitle={song.artist}
          onCollapse={isPhone ? () => setPhotoCollapsed(true) : undefined}
          onExpand={isPhone && photoCollapsed ? () => setPhotoCollapsed(false) : undefined}
          onSwipeSong={swipeSong}
          sheetExtra={sheetExtra}
          hideBottomCluster={true}
        />
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
