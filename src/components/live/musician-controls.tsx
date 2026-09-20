import { Lock, Unlock } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { ConnectionBadge } from '@/components/gigs/connection-badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function MusicianControls() {
  const scrollLock = useUIStore((state) => state.scrollLock);
  const setScrollLock = useUIStore((state) => state.setScrollLock);

  return (
    <div className="flex items-center justify-between w-full p-2 h-[56px] bg-surface border-t border-border px-4">
      <div className="flex items-center space-x-3">
        <Switch 
          id="scroll-lock" 
          checked={scrollLock} 
          onCheckedChange={setScrollLock} 
          data-testid="scroll-lock-switch"
        />
        <Label htmlFor="scroll-lock" className="flex items-center cursor-pointer">
          {scrollLock ? <Lock className="w-4 h-4 mr-2 text-primary" /> : <Unlock className="w-4 h-4 mr-2 text-muted-foreground" />}
          <span className={scrollLock ? "text-primary" : "text-muted-foreground"}>
            Scroll Lock
          </span>
        </Label>
      </div>
      
      <ConnectionBadge />
    </div>
  );
}
