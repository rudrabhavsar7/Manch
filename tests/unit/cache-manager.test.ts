import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Song, Setlist, Annotation, CachedGigState } from '@/lib/offline/db';

const songsMap = new Map<string, Song>();
const setlistsMap = new Map<string, Setlist>();
const annotationsMap = new Map<string, Annotation>();
const gigStateMap = new Map<string, CachedGigState>();

vi.mock('@/lib/offline/db', async () => {
  const actual = await vi.importActual<typeof import('@/lib/offline/db')>('@/lib/offline/db');
  return {
    ...actual,
    manchDB: {
      songs: {
        bulkPut: vi.fn(async (items: Song[]) => {
          items.forEach((item) => songsMap.set(item.id, item));
        }),
        get: vi.fn(async (id: string) => songsMap.get(id)),
        toArray: vi.fn(async () => Array.from(songsMap.values())),
      },
      setlists: {
        put: vi.fn(async (item: Setlist) => {
          setlistsMap.set(item.id, item);
        }),
        get: vi.fn(async (id: string) => setlistsMap.get(id)),
      },
      annotations: {
        bulkPut: vi.fn(async (items: Annotation[]) => {
          items.forEach((item) => annotationsMap.set(item.id, item));
        }),
        where: vi.fn((_index: string) => ({
          equals: vi.fn(([userId, songId]: [string, string]) => ({
            toArray: vi.fn(async () =>
              Array.from(annotationsMap.values()).filter(
                (a) => a.user_id === userId && a.song_id === songId,
              ),
            ),
          })),
        })),
      },
      gigState: {
        put: vi.fn(async (item: CachedGigState) => {
          gigStateMap.set(item.gigId, item);
        }),
        get: vi.fn(async (gigId: string) => gigStateMap.get(gigId)),
      },
    },
  };
});

describe('CacheManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    songsMap.clear();
    setlistsMap.clear();
    annotationsMap.clear();
    gigStateMap.clear();
  });

  it('caches songs to IndexedDB via bulkPut', async () => {
    const { CacheManager } = await import('@/lib/offline/cache-manager');
    const { manchDB } = await import('@/lib/offline/db');

    const testSongs: Song[] = [
      {
        id: 's1',
        title: 'Song 1',
        artist: 'Artist 1',
        key: 'Am',
        bpm: 120,
        content: '[Am]Hello',
        structure: [],
        owner_id: 'u1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: 's2',
        title: 'Song 2',
        artist: 'Artist 2',
        key: 'G',
        bpm: 95,
        content: '[G]World',
        structure: [],
        owner_id: 'u1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    await CacheManager.cacheSongs(testSongs);
    expect(manchDB.songs.bulkPut).toHaveBeenCalledWith(testSongs);
    expect(songsMap.size).toBe(2);
  });

  it('retrieves cached song by id and returns undefined if missing', async () => {
    const { CacheManager } = await import('@/lib/offline/cache-manager');

    const song: Song = {
      id: 's1',
      title: 'Song 1',
      artist: 'Artist 1',
      key: 'C',
      bpm: 100,
      content: '[C]Chord',
      structure: [],
      owner_id: 'u1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    songsMap.set(song.id, song);

    const found = await CacheManager.getCachedSong('s1');
    expect(found).toEqual(song);

    const notFound = await CacheManager.getCachedSong('s-missing');
    expect(notFound).toBeUndefined();
  });

  it('retrieves multiple cached songs by ids, filtering out missing songs', async () => {
    const { CacheManager } = await import('@/lib/offline/cache-manager');

    const song1: Song = {
      id: 's1',
      title: 'Song 1',
      artist: 'Artist 1',
      key: 'C',
      bpm: 100,
      content: '[C]Chord',
      structure: [],
      owner_id: 'u1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    const song2: Song = {
      id: 's2',
      title: 'Song 2',
      artist: 'Artist 2',
      key: 'D',
      bpm: 110,
      content: '[D]Chord',
      structure: [],
      owner_id: 'u1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    songsMap.set(song1.id, song1);
    songsMap.set(song2.id, song2);

    const results = await CacheManager.getCachedSongs(['s1', 's-nonexistent', 's2']);
    expect(results).toEqual([song1, song2]);
  });

  it('caches a setlist to IndexedDB', async () => {
    const { CacheManager } = await import('@/lib/offline/cache-manager');
    const { manchDB } = await import('@/lib/offline/db');

    const setlist: Setlist = {
      id: 'set-1',
      name: 'Friday Gig',
      owner_id: 'u1',
      privacy: 'private',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    await CacheManager.cacheSetlist(setlist);
    expect(manchDB.setlists.put).toHaveBeenCalledWith(setlist);
    expect(setlistsMap.get('set-1')).toEqual(setlist);
  });

  it('caches annotations and retrieves them for a specific user and song', async () => {
    const { CacheManager } = await import('@/lib/offline/cache-manager');
    const { manchDB } = await import('@/lib/offline/db');

    const annotations: Annotation[] = [
      {
        id: 'a1',
        user_id: 'u1',
        song_id: 's1',
        type: 'inline',
        line_number: 1,
        content: 'Play louder',
        color: '#ff0000',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: 'a2',
        user_id: 'u2',
        song_id: 's1',
        type: 'general',
        line_number: null,
        content: 'Other user note',
        color: '#00ff00',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: 'a3',
        user_id: 'u1',
        song_id: 's2',
        type: 'general',
        line_number: null,
        content: 'Song 2 note',
        color: '#0000ff',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    await CacheManager.cacheAnnotations(annotations);
    expect(manchDB.annotations.bulkPut).toHaveBeenCalledWith(annotations);

    const userAnnotations = await CacheManager.getAnnotationsForSong('u1', 's1');
    expect(userAnnotations).toHaveLength(1);
    expect(userAnnotations[0].id).toBe('a1');
  });

  it('caches gig state and retrieves cached gig state', async () => {
    const { CacheManager } = await import('@/lib/offline/cache-manager');
    const { manchDB } = await import('@/lib/offline/db');

    await CacheManager.cacheGigState('gig-101', 'set-1', ['s1', 's2', 's3']);

    expect(manchDB.gigState.put).toHaveBeenCalledWith(
      expect.objectContaining({
        gigId: 'gig-101',
        setlistId: 'set-1',
        songIds: ['s1', 's2', 's3'],
        cachedAt: expect.any(Number),
      }),
    );

    const cached = await CacheManager.getCachedGigState('gig-101');
    expect(cached).toBeDefined();
    expect(cached?.gigId).toBe('gig-101');
    expect(cached?.setlistId).toBe('set-1');
    expect(cached?.songIds).toEqual(['s1', 's2', 's3']);

    const missing = await CacheManager.getCachedGigState('gig-none');
    expect(missing).toBeUndefined();
  });
});
