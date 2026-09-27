import { useState } from 'react';
import { Tables } from '@/types/database';
import { useGigStore } from '@/stores/gig-store';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Song = Tables<'songs'>;

interface SetlistSidebarProps {
  songs: Song[];
  onSongSelect?: (songId: string) => void;
  isAdmin: boolean;
}

export function SetlistSidebar({ songs, onSongSelect, isAdmin }: SetlistSidebarProps) {
  const activeSongId = useGigStore((state) => state.activeSongId);
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();
  const indexed = songs.map((song, index) => ({ song, index }));
  const filtered = normalizedQuery
    ? indexed.filter(({ song }) =>
        song.title.toLowerCase().includes(normalizedQuery) ||
        (song.artist || '').toLowerCase().includes(normalizedQuery)
      )
    : indexed;

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">Setlist</h2>
      </div>
      {isAdmin && (
        <div className="p-3 border-b border-border">
          <Input
            data-testid="setlist-search"
            type="search"
            aria-label="Search setlist"
            placeholder="Search setlist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center p-4">No songs match</p>
          )}
          {filtered.map(({ song, index }) => {
            const isActive = activeSongId === song.id;
            return (
              <button
                key={song.id}
                onClick={() => {
                  if (isAdmin && onSongSelect) {
                    onSongSelect(song.id);
                  }
                }}
                disabled={!isAdmin}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-md text-left transition-colors',
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted text-foreground',
                  !isAdmin && !isActive && 'cursor-default hover:bg-transparent'
                )}
                data-testid={`setlist-item-${song.id}`}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <span className="text-sm opacity-70 w-4">{index + 1}.</span>
                  <div className="truncate">
                    <div className="font-medium truncate">{song.title}</div>
                    <div className="text-xs opacity-70 truncate">{song.artist}</div>
                  </div>
                </div>
                {song.key && (
                  <Badge 
                    variant={isActive ? "secondary" : "outline"}
                    className={cn('ml-2', isActive ? 'bg-primary-foreground/20' : '')}
                  >
                    {song.key}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
