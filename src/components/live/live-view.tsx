"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Users, ArrowLeft } from 'lucide-react';
import { Tables } from '@/types/database';
import { useGigStore, type QueueItem } from '@/stores/gig-store';
import { useSync } from '@/hooks/use-sync';
import { useSupabase } from '@/hooks/use-supabase';
import { fetchSetlistSongs } from '@/lib/live/setlist-queue';
import { CacheManager } from '@/lib/offline/cache-manager';
import { SetlistSidebar } from './setlist-sidebar';
import { SongDisplay } from './song-display';
import { AdminControls } from './admin-controls';
import { MusicianControls } from './musician-controls';
import { MemberList } from './member-list';
import { AddSetlistDialog } from './add-setlist-dialog';
import { useSongPhotos } from '@/hooks/use-song-photos';
import { ConnectionBadge } from '@/components/gigs/connection-badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Gig = Tables<'gigs'>;
type Song = Tables<'songs'>;
type Setlist = Tables<'setlists'>;

interface LiveViewProps {
  gig: Gig;
  songs: Song[];
  songIds: string[];
  queue: QueueItem[];
  myRole: 'admin' | 'co-admin' | 'musician';
  userId: string;
}

export function LiveView({ gig, songs, songIds, queue, myRole, userId }: LiveViewProps) {
  const { connect, disconnect, send } = useSync();
  const supabase = useSupabase();
  const setGig = useGigStore((state) => state.setGig);
  const setSongIds = useGigStore((state) => state.setSongIds);
  const setSongs = useGigStore((state) => state.setSongs);
  const setQueue = useGigStore((state) => state.setQueue);
  const setActiveSetlistId = useGigStore((state) => state.setActiveSetlistId);
  const setStatus = useGigStore((state) => state.setStatus);
  const setActiveSongId = useGigStore((state) => state.setActiveSongId);
  const activeSongId = useGigStore((state) => state.activeSongId);
  const status = useGigStore((state) => state.status);
  const storeSongs = useGigStore((state) => state.songs);
  const storeSongIds = useGigStore((state) => state.songIds);
  const storeQueue = useGigStore((state) => state.queue);
  const activeSetlistId = useGigStore((state) => state.activeSetlistId);
  const router = useRouter();

  const [showMembers, setShowMembers] = useState(false);
  const [setlistOpen, setSetlistOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [availableSetlists, setAvailableSetlists] = useState<Setlist[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const isAdmin = myRole === 'admin' || myRole === 'co-admin';
  const isHost = myRole === 'admin';

  useEffect(() => {
    // Initialize store once per gig mount; client-side switches update the
    // store directly and must not be reset from stale props.
    setGig(gig.id, myRole);
    setSongIds(songIds);
    setSongs(songs);
    setQueue(queue);
    setActiveSetlistId(gig.setlist_id);
    setStatus(gig.status as 'draft' | 'live' | 'ended');
    if (songIds.length > 0 && !useGigStore.getState().activeSongId) {
      setActiveSongId(songIds[0]);
    }
    useGigStore.getState().updateMemberRole(userId, myRole);
  }, [gig.id, gig.setlist_id, gig.status, myRole, songIds, songs, queue, userId, setGig, setSongIds, setSongs, setQueue, setActiveSetlistId, setStatus, setActiveSongId]);

  useEffect(() => {
    // Connect to sync
    connect(gig.id, userId, isHost).catch(console.error);

    return () => {
      disconnect();
    };
  }, [gig.id, userId, isHost, connect, disconnect]);

  useEffect(() => {
    // Musicians leave automatically when the gig ends; admin navigates from the End Gig button
    if (status === 'ended' && !isAdmin) {
      router.push('/dashboard');
    }
  }, [status, isAdmin, router]);

  const activeSong = storeSongs.find(s => s.id === activeSongId) || null;
  const activePhotos = useSongPhotos(activeSong?.id);
  const activeSetName = storeQueue.find((q) => q.setlistId === activeSetlistId)?.name;

  const handleSongSelect = (songId: string) => {
    if (isAdmin) {
      setActiveSongId(songId);
      send({ type: 'SONG_CHANGE', songId, timestamp: Date.now() });
      setSetlistOpen(false);
    }
  };

  const handleSwitchSetlist = async (item: QueueItem) => {
    if (!isAdmin || item.setlistId === activeSetlistId) return;
    const { error } = await supabase
      .from('gigs')
      .update({ setlist_id: item.setlistId })
      .eq('id', gig.id);
    if (error) {
      console.error('Failed to switch setlist:', error);
      return;
    }
    try {
      const { songs: newSongs, songIds: newIds } = await fetchSetlistSongs(supabase, item.setlistId);
      useGigStore.getState().applySetlistUpdate({
        songIds: newIds,
        songs: newSongs,
        setlistId: item.setlistId,
      });
      send({
        type: 'SETLIST_UPDATE',
        songIds: newIds,
        setlistId: item.setlistId,
        timestamp: Date.now(),
      });
      CacheManager.cacheGigState(gig.id, item.setlistId, newIds).catch((err) =>
        console.error('Failed to cache gig state:', err),
      );
    } catch (err) {
      console.error('Failed to load setlist songs:', err);
    }
  };

  const openAddDialog = async () => {
    setAddOpen(true);
    setAddLoading(true);
    setAddError(null);
    const { data, error } = await supabase
      .from('setlists')
      .select('*')
      .eq('owner_id', userId)
      .order('name');
    if (error || !data) {
      setAddError('Could not load your setlists. Try again.');
    } else {
      const queued = new Set(useGigStore.getState().queue.map((q) => q.setlistId));
      setAvailableSetlists((data as Setlist[]).filter((s) => !queued.has(s.id)));
    }
    setAddLoading(false);
  };

  const handleAddSetlist = async (setlist: Setlist) => {
    const position = useGigStore.getState().queue.length;
    const { data: row, error } = await supabase
      .from('gig_setlists')
      .insert({
        gig_id: gig.id,
        setlist_id: setlist.id,
        setlist_name: setlist.name,
        position,
      })
      .select()
      .single();
    if (error || !row) {
      setAddError('Could not add that setlist. Try again.');
      return;
    }
    useGigStore.getState().addToQueue({
      id: row.id as string,
      setlistId: setlist.id,
      name: setlist.name,
    });
    setAddOpen(false);
  };

  const handleRemoveSetlist = async (item: QueueItem) => {
    if (item.setlistId === activeSetlistId) return;
    const { error } = await supabase.from('gig_setlists').delete().eq('id', item.id);
    if (error) {
      console.error('Failed to remove setlist from queue:', error);
      return;
    }
    useGigStore.getState().removeFromQueue(item.id);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-stage text-foreground overflow-hidden">
      {/* Top Header */}
      <header className="h-[48px] short:h-9 flex items-center justify-between px-4 short:px-2.5 bg-surface border-b border-border shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-4 short:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 short:h-7 short:w-7 text-textSecondary hover:text-textPrimary hover:bg-elevated shrink-0"
            aria-label="Back to dashboard"
            data-testid="live-back-button"
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5 short:h-4 short:w-4" />
            </Link>
          </Button>

          <Sheet open={setlistOpen} onOpenChange={setSetlistOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden short:!inline-flex short:h-7 short:w-7" aria-label="Open setlist">
                <Menu className="h-5 w-5 short:h-4 short:w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 border-r border-border">
              <SetlistSidebar
                songs={storeSongs}
                onSongSelect={handleSongSelect}
                isAdmin={isAdmin}
                queue={storeQueue}
                activeSetlistId={activeSetlistId}
                activeSetName={activeSetName}
                onSwitchSetlist={handleSwitchSetlist}
                onRemoveSetlist={handleRemoveSetlist}
                onAddSetlist={openAddDialog}
              />
            </SheetContent>
          </Sheet>
          
          <div className="font-semibold text-lg short:text-sm truncate max-w-[150px] sm:max-w-xs">
            {gig.name}
          </div>
          
          {isAdmin && (
            <Badge variant="outline" className="inline-flex bg-background font-mono text-[10px] sm:text-xs short:text-[9px] short:px-1.5 short:py-0">
              PIN: {gig.pin}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-4 short:space-x-2">
          <div className="hidden sm:block short:block">
            <ConnectionBadge />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Toggle band members"
            onClick={() => setShowMembers(!showMembers)}
            className={`short:h-7 short:w-7 ${showMembers ? 'bg-muted' : ''}`}
          >
            <Users className="h-5 w-5 short:h-4 short:w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (hidden on mobile landscape short screens) */}
        <div className="hidden md:block short:!hidden w-80 shrink-0">
          <SetlistSidebar
            songs={storeSongs}
            onSongSelect={handleSongSelect}
            isAdmin={isAdmin}
            queue={storeQueue}
            activeSetlistId={activeSetlistId}
            activeSetName={activeSetName}
            onSwitchSetlist={handleSwitchSetlist}
            onRemoveSetlist={handleRemoveSetlist}
            onAddSetlist={openAddDialog}
          />
        </div>

        {/* Song Display */}
        <SongDisplay
          song={activeSong}
          isAdmin={isAdmin}
          send={send}
          photos={activePhotos}
          songs={storeSongs}
          onSongSelect={handleSongSelect}
        />

        {/* Members Panel */}
        {showMembers && (
          <div className="fixed inset-y-0 right-0 z-40 lg:static lg:z-auto shrink-0 shadow-lg lg:shadow-none bg-surface">
            <MemberList gigId={gig.id} isAdmin={myRole === 'admin'} onSend={send} onClose={() => setShowMembers(false)} />
          </div>
        )}
      </main>

      {/* Bottom Controls */}
      <footer className="shrink-0 border-t border-border bg-surface">
        {isAdmin ? (
          <AdminControls songIds={storeSongIds} onSend={send} />
        ) : (
          <MusicianControls />
        )}
      </footer>

      <AddSetlistDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        setlists={availableSetlists}
        loading={addLoading}
        error={addError}
        onSelect={handleAddSetlist}
      />
    </div>
  );
}

