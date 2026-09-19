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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch gig
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('*')
    .eq('id', gigId)
    .single();

  if (gigError || !gig) {
    notFound();
  }

  // Fetch membership
  const { data: member, error: memberError } = await supabase
    .from('gig_members')
    .select('role')
    .eq('gig_id', gigId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !member) {
    notFound();
  }

  // Fetch setlist songs
  const { data: setlistSongs, error: songsError } = await supabase
    .from('setlist_songs')
    .select('song_id, position, songs(*)')
    .eq('setlist_id', gig.setlist_id)
    .order('position');

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
