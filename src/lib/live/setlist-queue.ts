import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database';

type Song = Tables<'songs'>;
type Client = SupabaseClient<Database>;

export function resolveActiveSong(activeSongId: string | null, songIds: string[]): string | null {
  if (activeSongId && songIds.includes(activeSongId)) return activeSongId;
  return songIds[0] ?? null;
}

export function orderSongsByIds(songs: Song[], songIds: string[]): Song[] {
  const byId = new Map(songs.map((s) => [s.id, s]));
  return songIds
    .map((id) => byId.get(id))
    .filter((s): s is Song => s !== undefined);
}

export async function fetchSongsByIds(supabase: Client, songIds: string[]): Promise<Song[]> {
  if (songIds.length === 0) return [];
  const query = async () => {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .in('id', songIds);
    if (error || !data) throw new Error(error?.message ?? 'fetch songs failed');
    return data as Song[];
  };

  let songs: Song[];
  try {
    songs = await query();
  } catch (err) {
    console.error('fetchSongsByIds retrying:', err);
    songs = await query();
  }
  return orderSongsByIds(songs, songIds);
}

export async function fetchSetlistSongs(
  supabase: Client,
  setlistId: string,
): Promise<{ songs: Song[]; songIds: string[] }> {
  const { data, error } = await supabase
    .from('setlist_songs')
    .select('song_id, position, songs(*)')
    .eq('setlist_id', setlistId)
    .order('position');
  if (error || !data) throw new Error(error?.message ?? 'fetch setlist songs failed');

  const rows = data as unknown as { song_id: string; songs: Song | null }[];
  const songIds = rows.map((r) => r.song_id);
  const songs = rows.map((r) => r.songs).filter((s): s is Song => s !== null);
  return { songs, songIds };
}

