import { ChevronLeft, ChevronRight, Square } from 'lucide-react';
import { useGigStore } from '@/stores/gig-store';
import { useGigActions } from '@/hooks/use-gig';
import { usePathname } from 'next/navigation';

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
  const { endGig } = useGigActions();

  // Fallback: extract gigId from URL if not in store
  const gigId = gigIdFromStore || (pathname?.match(/\/gigs\/([^/]+)/)?.[1] || null);

  const currentIndex = activeSongId ? songIds.indexOf(activeSongId) : -1;
  const total = songIds.length;
  
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  const handlePrev = () => {
    if (hasPrev) {
      const prevId = songIds[currentIndex - 1];
      setActiveSongId(prevId);
      onSend({ type: 'SONG_CHANGE', songId: prevId, timestamp: Date.now() });
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextId = songIds[currentIndex + 1];
      setActiveSongId(nextId);
      onSend({ type: 'SONG_CHANGE', songId: nextId, timestamp: Date.now() });
    }
  };

  const handleEndGig = async () => {
    console.log('handleEndGig called, gigId:', gigId);
    if (gigId) {
      try {
        const result = await endGig(gigId);
        console.log('endGig result:', result);
        if (result.error) {
          console.error('Failed to end gig in database:', result.error);
        }
      } catch (err) {
        console.error('endGig threw:', err);
      }
    } else {
      console.warn('No gigId available');
    }
    setStatus('ended');
    onSend({ type: 'GIG_STATUS', status: 'ended', timestamp: Date.now() });
  };

  return (
    <div className="flex items-center justify-between w-full p-2 h-[56px] bg-surface border-t border-border">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={handlePrev} 
          disabled={!hasPrev}
          className="w-24"
          data-testid="admin-prev"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Prev
        </Button>
        <div className="text-sm font-medium w-16 text-center">
          {currentIndex >= 0 ? currentIndex + 1 : 0} / {total}
        </div>
        <Button 
          variant="outline" 
          onClick={handleNext} 
          disabled={!hasNext}
          className="w-24"
          data-testid="admin-next"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      
      <Button 
        variant="destructive" 
        onClick={handleEndGig}
        data-testid="admin-end-gig"
      >
        <Square className="w-4 h-4 mr-2 fill-current" />
        End Gig
      </Button>
    </div>
  );
}
