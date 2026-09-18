import { createClient } from '@/lib/supabase/server';
import { SongEditor } from '@/components/songs/song-editor';
import { notFound, redirect } from 'next/navigation';

export default async function EditSongPage({
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

  const { data: song } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single();

  if (!song) {
    notFound();
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <SongEditor song={song} />
    </div>
  );
}
