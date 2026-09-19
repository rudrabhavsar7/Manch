import { useRef } from 'react';
import { Tables } from '@/types/database';
import { TransposeControl } from './transpose-control';
import { FontSizeControl } from './font-size-control';
import { AutoScroll } from './auto-scroll';
import { SongRenderer } from '@/components/songs/song-renderer';
import { useUIStore } from '@/stores/ui-store';
import { Badge } from '@/components/ui/badge';
import { useAnnotations } from '@/hooks/use-annotations';
import { GeneralNotes } from './general-notes';
import { AnnotationLayer } from './annotation-layer';

type Song = Tables<'songs'>;

interface SongDisplayProps {
  song: Song | null;
  isAdmin: boolean;
}

export function SongDisplay({ song, isAdmin }: SongDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fontSize = useUIStore((state) => state.fontSize);
  const transpose = useUIStore((state) => state.transposeMap[song?.id || ''] || 0);
  const scrollLock = useUIStore((state) => state.scrollLock);
  const { inlineAnnotations, generalAnnotations, addAnnotation, deleteAnnotation } = useAnnotations(song?.id || '');

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stage text-muted-foreground h-full">
        No song selected
      </div>
    );
  }

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
          {!isAdmin && (
            <>
              <GeneralNotes
                annotations={generalAnnotations}
                onAdd={(content, color) => addAnnotation('general', content, color)}
                onDelete={deleteAnnotation}
              />
              <div className="w-px h-6 bg-border mx-1" />
              <TransposeControl songId={song.id} originalKey={song.key || 'C'} />
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}
          <FontSizeControl />
          <div className="w-px h-6 bg-border mx-1" />
          <AutoScroll containerRef={scrollRef} />
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className={`flex-1 p-8 ${scrollLock ? 'overflow-hidden' : 'overflow-y-auto'}`}
        data-testid="song-scroll-container"
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
    </div>
  );
}
