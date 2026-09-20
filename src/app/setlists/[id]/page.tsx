import { createClient } from '@/lib/supabase/server';
import { SetlistEditor } from '@/components/setlists/setlist-editor';
import { notFound, redirect } from 'next/navigation';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];
type SetlistSongRow = Database['public']['Tables']['setlist_songs']['Row'];

interface SetlistSongWithDetails extends SetlistSongRow {
  songs: Song | null;
}

export default async function EditSetlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
    return null;
  }

  const { data: setlist } = await supabase
    .from('setlists')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!setlist) {
    notFound();
    return null;
  }

  const { data: setlistSongs } = await supabase
    .from('setlist_songs')
    .select('*, songs(*)')
    .eq('setlist_id', id)
    .order('position');

  const typedSongs = (setlistSongs ?? []) as unknown as SetlistSongWithDetails[];

  const initialSongs = typedSongs
    .filter((ss): ss is SetlistSongWithDetails & { songs: Song } => ss.songs !== null)
    .map((ss) => ({
      id: ss.id,
      song: ss.songs,
      position: ss.position,
    }));

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <SetlistEditor setlist={setlist} initialSongs={initialSongs} />
    </div>
  );
}
