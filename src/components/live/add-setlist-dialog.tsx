import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ManchLoader } from '@/components/ui/manch-loader';
import type { Tables } from '@/types/database';

type Setlist = Tables<'setlists'>;

interface AddSetlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setlists: Setlist[];
  loading: boolean;
  error: string | null;
  onSelect: (setlist: Setlist) => void;
}

export function AddSetlistDialog({
  open,
  onOpenChange,
  setlists,
  loading,
  error,
  onSelect,
}: AddSetlistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add setlist</DialogTitle>
          <DialogDescription>Queue another setlist for this gig.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-6">
            <ManchLoader size="sm" text="Loading setlists..." />
          </div>
        )}

        {!loading && error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && setlists.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            All your setlists are already in this gig.
          </p>
        )}

        {!loading && !error && setlists.length > 0 && (
          <div className="space-y-1 max-h-64 overflow-y-auto" data-testid="add-setlist-options">
            {setlists.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-left hover:bg-muted transition-colors"
              >
                <span className="truncate">{s.name}</span>
                <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
