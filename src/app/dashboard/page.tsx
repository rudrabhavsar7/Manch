import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Music, ListMusic, Radio, Plus, LogIn } from 'lucide-react';
import { redirect } from 'next/navigation';

interface GigData {
  name: string;
  status: string;
  pin: string | null;
}

interface GigMemberWithGig {
  gig_id: string;
  gigs: GigData | GigData[] | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect('/auth/login');
    return null;
  }
  const userId = data.claims.sub;

  const [songCountResult, setlistCountResult, activeGigsResult] = await Promise.all([
    supabase
      .from('songs')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    supabase
      .from('setlists')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    supabase
      .from('gig_members')
      .select('gig_id, gigs(name, status, pin)')
      .eq('user_id', userId),
  ]);

  const songCount = songCountResult.count ?? 0;
  const setlistCount = setlistCountResult.count ?? 0;
  const liveGigs = (
    (activeGigsResult.data as unknown as GigMemberWithGig[]) ?? []
  ).filter((g) => {
    const gigData = Array.isArray(g.gigs) ? g.gigs[0] : g.gigs;
    return gigData?.status === 'live';
  });

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Dashboard</h1>
        <p className="text-sm text-textSecondary mt-1">Overview of your repertoire, setlists, and gigs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-textSecondary">Songs</CardTitle>
            <Music className="h-4 w-4 text-textSecondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-textPrimary">{songCount}</div>
            <Link
              href="/songs/new"
              className="text-xs text-stageAccent hover:underline mt-1 inline-block"
            >
              + Add song
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-textSecondary">Setlists</CardTitle>
            <ListMusic className="h-4 w-4 text-textSecondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-textPrimary">{setlistCount}</div>
            <Link
              href="/setlists/new"
              className="text-xs text-stageAccent hover:underline mt-1 inline-block"
            >
              + Create setlist
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-textSecondary">Live Gigs</CardTitle>
            <Radio className="h-4 w-4 text-textSecondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-textPrimary">{liveGigs.length}</div>
            <span className="text-xs text-textSecondary mt-1 inline-block">
              {liveGigs.length === 1 ? '1 active session' : `${liveGigs.length} active sessions`}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium">
          <Link href="/gigs/new">
            <Plus className="mr-2 h-4 w-4" /> New Gig
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-stageBorder hover:bg-elevated text-textPrimary font-medium">
          <Link href="/gigs/join">
            <LogIn className="mr-2 h-4 w-4" /> Join Gig
          </Link>
        </Button>
      </div>

      {liveGigs.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold text-textPrimary">Active Live Gigs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveGigs.map((g) => {
              const gigData = Array.isArray(g.gigs) ? g.gigs[0] : g.gigs;
              return (
                <Card
                  key={g.gig_id}
                  className="bg-surface border-stageBorder shadow-none rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-textPrimary">{gigData?.name ?? 'Live Gig'}</span>
                    </div>
                    {gigData?.pin && (
                      <p className="text-xs text-textSecondary font-mono">PIN: {gigData.pin}</p>
                    )}
                  </div>
                  <Button asChild size="sm" className="bg-stageAccent hover:bg-stageAccent/90 text-white">
                    <Link href={`/gigs/${g.gig_id}`}>Enter Gig</Link>
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
