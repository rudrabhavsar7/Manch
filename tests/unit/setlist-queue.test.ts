import { describe, it, expect } from 'vitest';
import { resolveActiveSong, orderSongsByIds } from '@/lib/live/setlist-queue';
import type { Tables } from '@/types/database';

type Song = Tables<'songs'>;

const song = (id: string): Song => ({
  id,
  title: `Song ${id}`,
  artist: '',
  key: '',
  bpm: null,
  content: '',
  structure: [],
  owner_id: 'u1',
  created_at: '',
  updated_at: '',
});

describe('resolveActiveSong', () => {
  it('keeps current song when it exists in the new setlist', () => {
    expect(resolveActiveSong('b', ['a', 'b', 'c'])).toBe('b');
  });

  it('falls back to first song when current is missing', () => {
    expect(resolveActiveSong('z', ['a', 'b'])).toBe('a');
  });

  it('returns null when new setlist is empty', () => {
    expect(resolveActiveSong('a', [])).toBeNull();
  });

  it('returns null when there is no current song', () => {
    expect(resolveActiveSong(null, ['a', 'b'])).toBe('a');
  });
});

describe('orderSongsByIds', () => {
  it('orders songs to match songIds order', () => {
    const songs = [song('c'), song('a'), song('b')];
    expect(orderSongsByIds(songs, ['a', 'b', 'c']).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops songs not referenced in songIds', () => {
    const songs = [song('a'), song('x')];
    expect(orderSongsByIds(songs, ['a']).map((s) => s.id)).toEqual(['a']);
  });
});
