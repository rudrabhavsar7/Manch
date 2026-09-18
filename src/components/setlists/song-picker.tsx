'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { useSupabase } from '@/hooks/use-supabase';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

export interface SongPickerProps {
  excludeSongIds?: string[];
  onSelect: (song: Song) => void;
}

export function SongPicker({ excludeSongIds = [], onSelect }: SongPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useSupabase();

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }

    let isMounted = true;

    async function loadSongs() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) return;

        const { data } = await supabase
          .from('songs')
          .select('*')
          .eq('owner_id', user.id)
          .order('title');

        if (data && isMounted) {
          setSongs(data);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSongs();

    return () => {
      isMounted = false;
    };
  }, [open, supabase]);

  const filteredSongs = songs
    .filter((s) => !excludeSongIds.includes(s.id))
    .filter((s) => {
      const term = search.toLowerCase().trim();
      if (!term) return true;
      const matchTitle = s.title.toLowerCase().includes(term);
      const matchArtist = (s.artist || '').toLowerCase().includes(term);
      return matchTitle || matchArtist;
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-stageBorder text-textPrimary hover:bg-elevated"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Song
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-stageBorder text-textPrimary max-h-[80vh] flex flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-textPrimary">
            Add Song to Setlist
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-textSecondary" />
          <Input
            placeholder="Search songs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary"
            aria-label="Search songs"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mt-4 pr-1">
          {loading ? (
            <p className="text-center text-textSecondary py-6">Loading songs...</p>
          ) : filteredSongs.length > 0 ? (
            filteredSongs.map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => {
                  onSelect(song);
                  setOpen(false);
                }}
                className="w-full text-left p-3 rounded-lg border border-stageBorder bg-surface hover:bg-elevated transition-colors cursor-pointer group"
              >
                <div className="font-medium text-textPrimary group-hover:text-stageAccent transition-colors">
                  {song.title}
                </div>
                <div className="text-sm text-textSecondary flex items-center gap-2 mt-1">
                  <span>{song.artist || 'Unknown Artist'}</span>
                  {song.key && (
                    <Badge
                      variant="secondary"
                      className="bg-elevated text-textSecondary border border-stageBorder font-mono text-xs"
                    >
                      {song.key}
                    </Badge>
                  )}
                  {song.bpm && (
                    <span className="text-xs font-mono text-textSecondary">
                      {song.bpm} BPM
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <p className="text-center text-textSecondary py-6">No songs found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
