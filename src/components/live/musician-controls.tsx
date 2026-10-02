import { Lock, Unlock } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { ConnectionBadge } from '@/components/gigs/connection-badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FooterCenterControls } from './footer-center-controls';

export function MusicianControls() {
  const scrollLock = useUIStore((state) => state.scrollLock);
  const setScrollLock = useUIStore((state) => state.setScrollLock);

  return (
    <div className="flex items-center justify-between w-full p-2 short:py-1 short:px-2 min-h-[56px] short:min-h-[38px] flex-wrap gap-y-1 bg-surface border-t border-border px-2 sm:px-4">
      <div className="flex items-center space-x-2 sm:space-x-3 short:space-x-1.5 shrink-0">
        <Switch 
          id="scroll-lock" 
          checked={scrollLock} 
          onCheckedChange={setScrollLock} 
          data-testid="scroll-lock-switch"
        />
        <Label htmlFor="scroll-lock" className="flex items-center cursor-pointer text-xs sm:text-sm short:text-[11px]">
          {scrollLock ? <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 short:w-3 short:h-3 mr-1 sm:mr-2 short:mr-1 text-primary shrink-0" /> : <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4 short:w-3 short:h-3 mr-1 sm:mr-2 short:mr-1 text-muted-foreground shrink-0" />}
          <span className={scrollLock ? "text-primary" : "text-muted-foreground"}>
            Scroll Lock
          </span>
        </Label>
      </div>

      <FooterCenterControls className="flex-1 min-w-0" />
      
      <div className="shrink-0">
        <ConnectionBadge />
      </div>
    </div>
  );
}
