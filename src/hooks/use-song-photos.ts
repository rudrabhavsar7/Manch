import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SongPhoto } from '@/components/live/song-display';

export function useSongPhotos(songId: string | undefined): SongPhoto[] {
  const [photos, setPhotos] = useState<SongPhoto[]>([]);

  useEffect(() => {
    if (!songId) {
      setPhotos([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('song_photos')
        .select('*')
        .eq('song_id', songId)
        .order('position');
      if (error || !data || cancelled) return;

      const signed = await Promise.all(
        data.map(async (p) => {
          const { data: urlData } = await supabase.storage
            .from('song-photos')
            .createSignedUrl(p.storage_path, 3600);
          return urlData?.signedUrl ? { id: p.id, url: urlData.signedUrl } : null;
        }),
      );

      if (!cancelled) {
        setPhotos(signed.filter((p): p is SongPhoto => p !== null));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  return photos;
}
