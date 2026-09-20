import { createClient } from '@/lib/supabase/server';
import { GigCard } from '@/components/gigs/gig-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, LogIn } from 'lucide-react';
import { redirect } from 'next/navigation';
import type { Database } from '@/types/database';

type Gig = Database['public']['Tables']['gigs']['Row'];

export default async function GigsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
    return null;
  }

  const { data: memberships } = await supabase
    .from('gig_members')
    .select('gig_id')
    .eq('user_id', user.id);

  const memberGigIds = (memberships ?? []).map((m) => m.gig_id);
  const filter =
    memberGigIds.length > 0
      ? `admin_id.eq.${user.id},id.in.(${memberGigIds.join(',')})`
      : `admin_id.eq.${user.id}`;

  const { data: gigs } = await supabase
    .from('gigs')
    .select('*')
    .or(filter)
    .order('created_at', { ascending: false });

  const typedGigs = (gigs ?? []) as Gig[];

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Gigs</h1>
          <p className="text-sm text-textSecondary mt-1">
            Live stage sessions, synchronized chord charts, and setlists
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            className="border-stageBorder text-textPrimary hover:bg-elevated"
          >
            <Link href="/gigs/join">
              <LogIn className="mr-2 h-4 w-4" /> Join Gig
            </Link>
          </Button>
          <Button
            asChild
            className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium"
          >
            <Link href="/gigs/new">
              <Plus className="mr-2 h-4 w-4" /> New Gig
            </Link>
          </Button>
        </div>
      </div>

      {typedGigs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {typedGigs.map((gig) => (
            <GigCard key={gig.id} gig={gig} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-stageBorder rounded-lg bg-surface/50">
          <p className="text-textSecondary text-base">No gigs yet. Create or join one!</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              asChild
              variant="outline"
              className="border-stageBorder text-textPrimary hover:bg-elevated"
            >
              <Link href="/gigs/join">
                <LogIn className="mr-2 h-4 w-4" /> Join Gig
              </Link>
            </Button>
            <Button
              asChild
              className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium"
            >
              <Link href="/gigs/new">
                <Plus className="mr-2 h-4 w-4" /> New Gig
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
