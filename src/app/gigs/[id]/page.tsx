import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Tables } from '@/types/database';
import { LiveView } from '@/components/live/live-view';

interface GigPageProps {
  params: Promise<{ id: string }>;
}

export default async function GigPage({ params }: GigPageProps) {
  const resolvedParams = await params;
  const gigId = resolvedParams.id;
  const supabase = await createClient();

  // Wave 1: auth check and gig fetch are independent — run in parallel.
  const [gigResult, userResult] = await Promise.all([
    supabase.from('gigs').select('*').eq('id', gigId).single(),
    supabase.auth.getUser(),
  ]);

  const {
    data: { user },
  } = userResult;

  if (!user) {
    redirect('/auth/login');
  }

  const { data: gig, error: gigError } = gigResult;

  if (gigError || !gig) {
    notFound();
  }

  // Wave 2: membership and setlist songs only depend on wave 1 results.
  const [memberResult, songsResult] = await Promise.all([
    supabase
      .from('gig_members')
      .select('role')
      .eq('gig_id', gigId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('setlist_songs')
      .select('song_id, position, songs(*)')
      .eq('setlist_id', gig.setlist_id)
      .order('position'),
  ]);

  const { data: member, error: memberError } = memberResult;

  if (memberError || !member) {
    notFound();
  }

  const { data: setlistSongs, error: songsError } = songsResult;

  if (songsError || !setlistSongs) {
    notFound();
  }

  const songs = setlistSongs
    .map(ss => ss.songs)
    .filter(s => s !== null) as unknown as Tables<'songs'>[];
    
  const songIds = setlistSongs.map(ss => ss.song_id);

  return (
    <LiveView 
      gig={gig} 
      songs={songs} 
      songIds={songIds} 
      myRole={member.role} 
      userId={user.id} 
    />
  );
}
