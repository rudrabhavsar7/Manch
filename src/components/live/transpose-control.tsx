import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';

interface TransposeControlProps {
  songId: string;
  originalKey: string;
}

export function TransposeControl({ songId, originalKey }: TransposeControlProps) {
  const currentTranspose = useUIStore((state) => state.transposeMap[songId] || 0);
  const setTranspose = useUIStore((state) => state.setTranspose);

  const increment = () => setTranspose(songId, currentTranspose + 1);
  const decrement = () => setTranspose(songId, currentTranspose - 1);
  const reset = () => setTranspose(songId, 0);

  return (
    <div className="flex items-center space-x-1.5 sm:space-x-2">
      <span className="text-sm short:text-xs text-muted-foreground mr-1.5 sm:mr-2">Key: {originalKey}</span>
      <Button variant="outline" size="icon" className="h-8 w-8 short:h-7 short:w-7" onClick={decrement} data-testid="transpose-decrement">
        <Minus className="h-4 w-4 short:h-3.5 short:w-3.5" />
      </Button>
      <div className="w-8 short:w-6 text-center font-mono text-sm short:text-xs">
        {currentTranspose > 0 ? `+${currentTranspose}` : currentTranspose}
      </div>
      <Button variant="outline" size="icon" className="h-8 w-8 short:h-7 short:w-7" onClick={increment} data-testid="transpose-increment">
        <Plus className="h-4 w-4 short:h-3.5 short:w-3.5" />
      </Button>
      {currentTranspose !== 0 && (
        <Button variant="ghost" size="icon" className="h-8 w-8 short:h-7 short:w-7 ml-1 text-muted-foreground hover:text-foreground" onClick={reset} data-testid="transpose-reset">
          <RotateCcw className="h-4 w-4 short:h-3.5 short:w-3.5" />
        </Button>
      )}
    </div>
  );
}
