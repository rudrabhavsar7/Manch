import { Type } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { Slider } from '@/components/ui/slider';

export function FontSizeControl() {
  const fontSize = useUIStore((state) => state.fontSize);
  const setFontSize = useUIStore((state) => state.setFontSize);

  return (
    <div className="flex items-center space-x-2 sm:space-x-4 short:space-x-1.5 w-28 sm:w-[200px] short:w-28">
      <Type className="w-4 h-4 short:w-3.5 short:h-3.5 text-muted-foreground" />
      <Slider
        min={12}
        max={32}
        step={2}
        value={[fontSize]}
        onValueChange={(vals) => setFontSize(vals[0])}
        className="flex-1"
        data-testid="font-size-slider"
      />
      <span className="w-8 short:w-7 text-right text-sm short:text-xs text-muted-foreground">{fontSize}px</span>
    </div>
  );
}
