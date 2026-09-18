import { createClient } from '@/lib/supabase/server';
import { SongCard } from '@/components/songs/song-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function SongsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
    return null;
  }

  const { data: songs } = await supabase
    .from('songs')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Song Library</h1>
          <p className="text-sm text-textSecondary mt-1">Manage your repertoire and chord charts</p>
        </div>
        <Link href="/songs/new">
          <Button className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium">
            <Plus className="mr-2 h-4 w-4" /> New Song
          </Button>
        </Link>
      </div>

      {songs && songs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-stageBorder rounded-lg bg-surface/50">
          <p className="text-textSecondary text-base">No songs yet. Create your first song!</p>
          <div className="mt-4">
            <Link href="/songs/new">
              <Button variant="outline" className="border-stageBorder text-textPrimary hover:bg-elevated">
                <Plus className="mr-2 h-4 w-4" /> New Song
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
