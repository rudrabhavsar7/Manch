import { ChevronLeft, ChevronRight, Square } from 'lucide-react';
import { useGigStore } from '@/stores/gig-store';
import { useSync } from '@/hooks/use-sync';
import { Button } from '@/components/ui/button';

interface AdminControlsProps {
  songIds: string[];
}

export function AdminControls({ songIds }: AdminControlsProps) {
  const activeSongId = useGigStore((state) => state.activeSongId);
  const setActiveSongId = useGigStore((state) => state.setActiveSongId);
  const setStatus = useGigStore((state) => state.setStatus);
  const { send } = useSync();

  const currentIndex = activeSongId ? songIds.indexOf(activeSongId) : -1;
  const total = songIds.length;
  
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  const handlePrev = () => {
    if (hasPrev) {
      const prevId = songIds[currentIndex - 1];
      setActiveSongId(prevId);
      send({ type: 'SONG_CHANGE', songId: prevId, timestamp: Date.now() });
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextId = songIds[currentIndex + 1];
      setActiveSongId(nextId);
      send({ type: 'SONG_CHANGE', songId: nextId, timestamp: Date.now() });
    }
  };

  const handleEndGig = () => {
    setStatus('ended');
    send({ type: 'GIG_STATUS', status: 'ended', timestamp: Date.now() });
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
