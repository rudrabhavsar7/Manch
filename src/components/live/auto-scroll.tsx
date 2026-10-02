import { useEffect, useRef, RefObject } from 'react';
import { Play, Pause } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AutoScrollProps {
  containerRef: RefObject<HTMLElement | null>;
}

export function AutoScroll({ containerRef }: AutoScrollProps) {
  const autoScroll = useUIStore((state) => state.autoScroll);
  const setAutoScroll = useUIStore((state) => state.setAutoScroll);
  const autoScrollSpeed = useUIStore((state) => state.autoScrollSpeed);
  const setAutoScrollSpeed = useUIStore((state) => state.setAutoScrollSpeed);
  
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const toggleAutoScroll = () => setAutoScroll(!autoScroll);

  useEffect(() => {
    const scroll = (time: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }
      
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      if (containerRef.current) {
        // speed is pixels per second, so pixels per millisecond is speed / 1000
        const pixelsToScroll = (autoScrollSpeed / 1000) * deltaTime;
        accumulatedRef.current += pixelsToScroll;
        
        if (accumulatedRef.current >= 1) {
          const intPixels = Math.floor(accumulatedRef.current);
          containerRef.current.scrollTop += intPixels;
          accumulatedRef.current -= intPixels;
        }
      }
      
      requestRef.current = requestAnimationFrame(scroll);
    };

    if (autoScroll) {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(scroll);
    } else if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [autoScroll, autoScrollSpeed, containerRef]);

  return (
    <div className="flex items-center space-x-2 sm:space-x-4 short:space-x-1.5">
      <Button 
        variant={autoScroll ? "default" : "outline"}
        size="icon" 
        className="h-8 w-8 short:h-7 short:w-7 shrink-0"
        onClick={toggleAutoScroll}
        data-testid="auto-scroll-toggle"
      >
        {autoScroll ? <Pause className="h-4 w-4 short:h-3.5 short:w-3.5" /> : <Play className="h-4 w-4 short:h-3.5 short:w-3.5" />}
      </Button>
      <div className="w-20 sm:w-[120px] short:w-16 flex items-center">
        <Slider
          min={10}
          max={150}
          step={5}
          value={[autoScrollSpeed]}
          onValueChange={(vals) => setAutoScrollSpeed(vals[0])}
          data-testid="auto-scroll-slider"
        />
      </div>
    </div>
  );
}
