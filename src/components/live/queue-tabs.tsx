import { Plus, X } from 'lucide-react';
import type { QueueItem } from '@/stores/gig-store';
import { cn } from '@/lib/utils';

interface QueueTabsProps {
  isAdmin: boolean;
  activeSetlistId: string | null;
  items: QueueItem[];
  onSwitch?: (item: QueueItem) => void;
  onRemove?: (item: QueueItem) => void;
  onAdd?: () => void;
}

export function QueueTabs({
  isAdmin,
  activeSetlistId,
  items,
  onSwitch,
  onRemove,
  onAdd,
}: QueueTabsProps) {
  if (!isAdmin) return null;

  return (
    <div
      className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto"
      data-testid="queue-tabs"
      aria-label="Setlist queue"
    >
      {items.map((item) => {
        const active = item.setlistId === activeSetlistId;
        return (
          <div key={item.id} className="flex items-center shrink-0 rounded-md border border-border">
            <button
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => {
                if (!active) onSwitch?.(item);
              }}
              className={cn(
                'h-8 max-w-[7rem] px-2.5 text-xs font-medium truncate transition-colors rounded-l-md',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-foreground hover:bg-muted'
              )}
              data-testid={`queue-tab-${item.id}`}
            >
              {item.name}
            </button>
            {!active && (
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={() => onRemove?.(item)}
                className="h-8 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted rounded-r-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        aria-label="Add setlist"
        onClick={onAdd}
        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
