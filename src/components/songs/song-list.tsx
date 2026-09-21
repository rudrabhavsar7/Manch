'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SongCard } from './song-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  X,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
  Music,
} from 'lucide-react';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

export interface SongListProps {
  initialSongs: Song[];
  initialQuery?: string;
}

type SortOption = 'updated_desc' | 'title_asc' | 'title_desc' | 'bpm_desc' | 'key_asc';

export function SongList({ initialSongs, initialQuery = '' }: SongListProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedKey, setSelectedKey] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: pressing '/' focuses search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute available unique keys for quick filters
  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const song of initialSongs) {
      if (song.key && song.key.trim()) {
        keys.add(song.key.trim());
      }
    }
    return Array.from(keys).sort();
  }, [initialSongs]);

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    const matches = initialSongs.filter((song) => {
      // Key filter
      if (selectedKey !== 'ALL') {
        if (!song.key || song.key.trim().toLowerCase() !== selectedKey.toLowerCase()) {
          return false;
        }
      }

      // Query filter
      if (!normalizedQuery) return true;

      const titleMatch = song.title.toLowerCase().includes(normalizedQuery);
      const artistMatch = (song.artist || '').toLowerCase().includes(normalizedQuery);
      const keyMatch = (song.key || '').toLowerCase().includes(normalizedQuery);
      const contentMatch = (song.content || '').toLowerCase().includes(normalizedQuery);

      return titleMatch || artistMatch || keyMatch || contentMatch;
    });

    // Sorting
    return matches.sort((a, b) => {
      switch (sortBy) {
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'bpm_desc':
          return (b.bpm || 0) - (a.bpm || 0);
        case 'key_asc':
          return (a.key || '').localeCompare(b.key || '');
        case 'updated_desc':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [initialSongs, query, selectedKey, sortBy]);

  // If user has zero songs in their library entirely
  if (initialSongs.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-stageBorder rounded-lg bg-surface/50">
        <p className="text-textSecondary text-base">No songs yet. Create your first song!</p>
        <div className="mt-4">
          <Button asChild variant="outline" className="border-stageBorder text-textPrimary hover:bg-elevated">
            <Link href="/songs/new">
              <Plus className="mr-2 h-4 w-4" /> New Song
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isFiltered = query.trim().length > 0 || selectedKey !== 'ALL';

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textSecondary pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs by title, artist, key, or lyrics... (Press '/' to focus)"
            className="pl-9 pr-9 bg-surface border-stageBorder text-textPrimary placeholder:text-textSecondary/60 focus-visible:ring-1 focus-visible:ring-stageAccent h-10 w-full"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search input"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary p-1 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-2.5 h-3.5 w-3.5 text-textSecondary pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort songs"
              className="pl-8 pr-6 py-2 text-xs font-medium rounded-md bg-surface border border-stageBorder text-textPrimary hover:bg-elevated focus:outline-none focus:ring-1 focus:ring-stageAccent cursor-pointer appearance-none h-10"
            >
              <option value="updated_desc">Recently Updated</option>
              <option value="title_asc">Title (A – Z)</option>
              <option value="title_desc">Title (Z – A)</option>
              <option value="bpm_desc">Tempo (Fastest)</option>
              <option value="key_asc">Key</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Quick Filter Chips */}
      {availableKeys.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none text-xs">
          <span className="text-textSecondary/70 font-medium text-xs mr-1 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" /> Key:
          </span>
          <button
            type="button"
            onClick={() => setSelectedKey('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors shrink-0 ${
              selectedKey === 'ALL'
                ? 'bg-stageAccent text-white font-semibold'
                : 'bg-surface border border-stageBorder text-textSecondary hover:text-textPrimary hover:bg-elevated'
            }`}
          >
            All
          </button>
          {availableKeys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSelectedKey(selectedKey === k ? 'ALL' : k)}
              className={`px-2 py-1 rounded-md text-xs font-mono transition-colors shrink-0 ${
                selectedKey === k
                  ? 'bg-stageAccent text-white font-semibold'
                  : 'bg-surface border border-stageBorder text-textSecondary hover:text-textPrimary hover:bg-elevated'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Stats Counter & Active Filters Bar */}
      <div className="flex items-center justify-between text-xs text-textSecondary px-0.5">
        <div>
          {isFiltered ? (
            <span>
              Showing <span className="font-semibold text-textPrimary">{filteredSongs.length}</span> of {initialSongs.length} songs
            </span>
          ) : (
            <span>
              Total <span className="font-semibold text-textPrimary">{initialSongs.length}</span> songs in repertoire
            </span>
          )}
        </div>
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedKey('ALL');
            }}
            className="text-stageAccent hover:underline font-medium"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid of Results */}
      {filteredSongs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        /* Empty Search Results State */
        <div className="text-center py-16 border border-dashed border-stageBorder rounded-lg bg-surface/50 space-y-3">
          <div className="inline-flex p-3 rounded-full bg-elevated text-textSecondary">
            <Music className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-textPrimary">No songs found</h3>
          <p className="text-sm text-textSecondary max-w-sm mx-auto">
            {query
              ? `No songs matched "${query}". Try searching by another keyword, artist, or chord.`
              : `No songs found for key ${selectedKey}.`}
          </p>
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery('');
                setSelectedKey('ALL');
              }}
              className="border-stageBorder text-textPrimary hover:bg-elevated"
            >
              Clear search & filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
