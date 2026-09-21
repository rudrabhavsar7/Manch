import { createClient } from '@/lib/supabase/server';
import { SongList } from '@/components/songs/song-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';

interface SongsPageProps {
  searchParams?: Promise<{ q?: string }>;
}

export default async function SongsPage(props: SongsPageProps) {
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

  const resolvedParams = props?.searchParams ? await props.searchParams : undefined;
  const initialQuery = resolvedParams?.q || '';



  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Song Library</h1>
          <p className="text-sm text-textSecondary mt-1">Manage your repertoire and chord charts</p>
        </div>
        <Button asChild className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium">
          <Link href="/songs/new">
            <Plus className="mr-2 h-4 w-4" /> New Song
          </Link>
        </Button>
      </div>

      <SongList initialSongs={songs || []} initialQuery={initialQuery} />
    </div>
  );
}

