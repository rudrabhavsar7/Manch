import { ChevronLeft, ChevronRight, Square } from 'lucide-react';
import { useGigStore } from '@/stores/gig-store';
import { useGigActions } from '@/hooks/use-gig';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { SyncMessage } from '@/lib/sync/message-types';

interface AdminControlsProps {
  songIds: string[];
  onSend: (msg: SyncMessage) => void;
}

export function AdminControls({ songIds, onSend }: AdminControlsProps) {
  const activeSongId = useGigStore((state) => state.activeSongId);
  const setActiveSongId = useGigStore((state) => state.setActiveSongId);
  const setStatus = useGigStore((state) => state.setStatus);
  const gigIdFromStore = useGigStore((state) => state.gigId);
  const pathname = usePathname();
  const router = useRouter();
  const { endGig } = useGigActions();

  // Fallback: extract gigId from URL if not in store
  const gigId = gigIdFromStore || (pathname?.match(/\/gigs\/([^/]+)/)?.[1] || null);

  const currentIndex = activeSongId ? songIds.indexOf(activeSongId) : -1;
  const total = songIds.length;
  
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      const prevId = songIds[currentIndex - 1];
      setActiveSongId(prevId);
      onSend({ type: 'SONG_CHANGE', songId: prevId, timestamp: Date.now() });
    }
  }, [hasPrev, songIds, currentIndex, setActiveSongId, onSend]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      const nextId = songIds[currentIndex + 1];
      setActiveSongId(nextId);
      onSend({ type: 'SONG_CHANGE', songId: nextId, timestamp: Date.now() });
    }
  }, [hasNext, songIds, currentIndex, setActiveSongId, onSend]);

  const handleEndGig = useCallback(async () => {
    console.log('handleEndGig called, gigId:', gigId);
    try {
      if (gigId) {
        const result = await endGig(gigId);
        console.log('endGig result:', result);
        if (result.error) {
          console.error('Failed to end gig in database:', result.error);
        }
      } else {
        console.warn('No gigId available');
      }
    } catch (err) {
      console.error('endGig threw:', err);
      alert('Error: ' + (err as Error).message);
    }
    setStatus('ended');
    onSend({ type: 'GIG_STATUS', status: 'ended', timestamp: Date.now() });
    router.push('/dashboard');
  }, [gigId, endGig, setStatus, onSend, router]);

  return (
    <div className="flex items-center justify-between w-full p-2 min-h-[56px] flex-wrap gap-y-1 bg-surface border-t border-border" suppressHydrationWarning>
      <div className="flex items-center flex-wrap gap-x-2 sm:gap-x-4">
        <Button 
          variant="outline" 
          onClick={handlePrev} 
          disabled={!hasPrev}
          className="w-auto px-2 sm:w-24 sm:px-4 shrink-0"
          aria-label="Previous song"
          data-testid="admin-prev"
        >
          <ChevronLeft className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Prev</span>
        </Button>
        <div className="text-sm font-medium w-12 sm:w-16 text-center shrink-0">
          {currentIndex >= 0 ? currentIndex + 1 : 0} / {total}
        </div>
        <Button 
          variant="outline" 
          onClick={handleNext} 
          disabled={!hasNext}
          className="w-auto px-2 sm:w-24 sm:px-4 shrink-0"
          aria-label="Next song"
          data-testid="admin-next"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4 sm:ml-2" />
        </Button>
      </div>
      
      <Button 
        variant="destructive" 
        onClick={handleEndGig}
        className="shrink-0 px-2 sm:px-4"
        aria-label="End gig"
        data-testid="admin-end-gig"
      >
        <Square className="w-4 h-4 mr-2 fill-current" />
        End Gig
      </Button>
    </div>
  );
}
