"use client";

import { useEffect, useState } from 'react';
import { Menu, Users } from 'lucide-react';
import { Tables } from '@/types/database';
import { useGigStore } from '@/stores/gig-store';
import { useSync } from '@/hooks/use-sync';
import { SetlistSidebar } from './setlist-sidebar';
import { SongDisplay } from './song-display';
import { AdminControls } from './admin-controls';
import { MusicianControls } from './musician-controls';
import { MemberList } from './member-list';
import { ConnectionBadge } from '@/components/gigs/connection-badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Gig = Tables<'gigs'>;
type Song = Tables<'songs'>;

interface LiveViewProps {
  gig: Gig;
  songs: Song[];
  songIds: string[];
  myRole: 'admin' | 'co-admin' | 'musician';
  userId: string;
}

export function LiveView({ gig, songs, songIds, myRole, userId }: LiveViewProps) {
  const { connect, disconnect, send } = useSync();
  const setGig = useGigStore((state) => state.setGig);
  const setSongIds = useGigStore((state) => state.setSongIds);
  const setStatus = useGigStore((state) => state.setStatus);
  const setActiveSongId = useGigStore((state) => state.setActiveSongId);
  const activeSongId = useGigStore((state) => state.activeSongId);
  
  const [showMembers, setShowMembers] = useState(false);
  const isAdmin = myRole === 'admin' || myRole === 'co-admin';
  const isHost = myRole === 'admin';

  useEffect(() => {
    // Initialize store
    setGig(gig.id, myRole);
    setSongIds(songIds);
    setStatus(gig.status as 'draft' | 'live' | 'ended');
    if (songIds.length > 0 && !activeSongId) {
      setActiveSongId(songIds[0]);
    }
  }, [gig.id, myRole, songIds, gig.status, setGig, setSongIds, setStatus, setActiveSongId, activeSongId]);

  useEffect(() => {
    // Connect to sync
    connect(gig.id, userId, isHost).catch(console.error);

    return () => {
      disconnect();
    };
  }, [gig.id, userId, isHost, connect, disconnect]);

  const activeSong = songs.find(s => s.id === activeSongId) || null;

  const handleSongSelect = (songId: string) => {
    if (isAdmin) {
      setActiveSongId(songId);
      send({ type: 'SONG_CHANGE', songId, timestamp: Date.now() });
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-stage text-foreground overflow-hidden">
      {/* Top Header */}
      <header className="h-[48px] flex items-center justify-between px-4 bg-surface border-b border-border shrink-0">
        <div className="flex items-center space-x-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 border-r border-border">
              <SetlistSidebar songs={songs} onSongSelect={handleSongSelect} isAdmin={isAdmin} />
            </SheetContent>
          </Sheet>
          
          <div className="font-semibold text-lg truncate max-w-[150px] sm:max-w-xs">
            {gig.name}
          </div>
          
          {isAdmin && (
            <Badge variant="outline" className="hidden sm:inline-flex bg-background font-mono">
              PIN: {gig.pin}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:block">
            <ConnectionBadge />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Toggle band members"
            onClick={() => setShowMembers(!showMembers)}
            className={showMembers ? 'bg-muted' : ''}
          >
            <Users className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-80 shrink-0">
          <SetlistSidebar songs={songs} onSongSelect={handleSongSelect} isAdmin={isAdmin} />
        </div>

        {/* Song Display */}
        <SongDisplay song={activeSong} isAdmin={isAdmin} send={send} />

        {/* Members Panel */}
        {showMembers && (
          <div className="fixed inset-y-0 right-0 z-40 lg:static lg:z-auto shrink-0 shadow-lg lg:shadow-none bg-surface">
            <MemberList gigId={gig.id} isAdmin={myRole === 'admin'} onSend={send} />
          </div>
        )}
      </main>

      {/* Bottom Controls */}
      <footer className="shrink-0 border-t border-border bg-surface">
        {isAdmin ? (
          <AdminControls songIds={songIds} onSend={send} />
        ) : (
          <MusicianControls />
        )}
      </footer>
    </div>
  );
}
