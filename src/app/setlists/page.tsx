import { createClient } from '@/lib/supabase/server';
import { SetlistCard } from '@/components/setlists/setlist-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';

import type { Database } from '@/types/database';

type Setlist = Database['public']['Tables']['setlists']['Row'];

interface SetlistWithCount extends Setlist {
  setlist_songs?: { count: number }[];
}

export default async function SetlistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
    return null;
  }

  const { data: setlists } = await supabase
    .from('setlists')
    .select('*, setlist_songs(count)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  const typedSetlists = (setlists ?? []) as unknown as SetlistWithCount[];

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-textPrimary">
            Setlists
          </h1>
          <p className="text-sm text-textSecondary mt-1">
            Organize songs and prepare for live performances
          </p>
        </div>
        <Button
          asChild
          className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium"
        >
          <Link href="/setlists/new">
            <Plus className="mr-2 h-4 w-4" /> New Setlist
          </Link>
        </Button>
      </div>

      {typedSetlists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {typedSetlists.map((setlist) => (
            <SetlistCard
              key={setlist.id}
              setlist={setlist}
              songCount={setlist.setlist_songs?.[0]?.count ?? 0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-stageBorder rounded-lg bg-surface/50">
          <p className="text-textSecondary text-base">
            No setlists yet. Create your first setlist!
          </p>
          <div className="mt-4">
            <Button
              asChild
              variant="outline"
              className="border-stageBorder text-textPrimary hover:bg-elevated"
            >
              <Link href="/setlists/new">
                <Plus className="mr-2 h-4 w-4" /> New Setlist
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
