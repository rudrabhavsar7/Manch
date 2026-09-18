import { manchDB, type CachedGigState, type Song, type Setlist, type Annotation } from './db';

export class CacheManager {
  static async cacheSongs(songs: Song[]): Promise<void> {
    await manchDB.songs.bulkPut(songs);
  }

  static async cacheSetlist(setlist: Setlist): Promise<void> {
    await manchDB.setlists.put(setlist);
  }

  static async cacheAnnotations(annotations: Annotation[]): Promise<void> {
    await manchDB.annotations.bulkPut(annotations);
  }

  static async cacheGigState(gigId: string, setlistId: string, songIds: string[]): Promise<void> {
    const state: CachedGigState = {
      gigId,
      setlistId,
      songIds,
      cachedAt: Date.now(),
    };
    await manchDB.gigState.put(state);
  }

  static async getCachedSong(id: string): Promise<Song | undefined> {
    return manchDB.songs.get(id);
  }

  static async getCachedSongs(ids: string[]): Promise<Song[]> {
    const songs = await Promise.all(ids.map((id) => manchDB.songs.get(id)));
    return songs.filter((s): s is Song => s !== undefined);
  }

  static async getAnnotationsForSong(userId: string, songId: string): Promise<Annotation[]> {
    return manchDB.annotations
      .where('[user_id+song_id]')
      .equals([userId, songId])
      .toArray();
  }

  static async getCachedGigState(gigId: string): Promise<CachedGigState | undefined> {
    return manchDB.gigState.get(gigId);
  }
}
