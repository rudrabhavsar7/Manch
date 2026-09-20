'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Share2, X, UserPlus } from 'lucide-react';
import { useSupabase } from '@/hooks/use-supabase';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

export interface ShareSetlistDialogProps {
  setlistId: string;
  className?: string;
}

export interface SharedUser {
  id: string;
  email: string;
  permission: string;
}

interface SetlistShareRow {
  id: string;
  permission: string;
  users: { email: string } | { email: string }[] | null;
}

interface UpsertSelectResult {
  data: { id: string } | null;
  error: { message: string } | null;
}

interface UpsertSelectable {
  select: (columns: string) => {
    single: () => Promise<UpsertSelectResult>;
  };
}

interface UpsertStandardResult {
  error: { message: string } | null;
}

export function ShareSetlistDialog({ setlistId, className }: ShareSetlistDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = useSupabase();
  const authUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setError(null);
      return;
    }

    let active = true;

    async function load() {
      const { data, error: err } = await supabase
        .from('setlist_shares')
        .select('id, permission, users(email)')
        .eq('setlist_id', setlistId);

      if (!active) return;

      if (err) {
        setError(err.message);
        return;
      }

      if (data) {
        setSharedUsers(
          (data as unknown as SetlistShareRow[]).map((row) => {
            const userEmail = Array.isArray(row.users)
              ? row.users[0]?.email
              : row.users?.email;
            return {
              id: row.id,
              email: userEmail ?? 'Unknown',
              permission: row.permission,
            };
          })
        );
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [open, setlistId, supabase]);

  async function handleShare() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    const currentUser = authUser ?? (await supabase.auth.getUser()).data?.user;
    if (!currentUser) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    // Find user by email
    const { data: targetUser, error: userLookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', trimmedEmail)
      .single();

    if (!targetUser || userLookupErr) {
      setError('No user found with that email');
      setLoading(false);
      return;
    }

    const upsertQuery = supabase.from('setlist_shares').upsert({
      setlist_id: setlistId,
      user_id: targetUser.id,
      permission: 'view',
      shared_by: currentUser.id,
    });

    let err: { message?: string } | null = null;
    let shareId = targetUser.id;

    if (
      upsertQuery &&
      typeof upsertQuery === 'object' &&
      'select' in upsertQuery &&
      typeof (upsertQuery as unknown as UpsertSelectable).select === 'function'
    ) {
      const selectable = upsertQuery as unknown as UpsertSelectable;
      const res = await selectable.select('id').single();
      err = res.error;
      if (res.data?.id) {
        shareId = res.data.id;
      }
    } else {
      const res = (await upsertQuery) as unknown as UpsertStandardResult;
      err = res?.error;
    }

    if (err) {
      setError(err.message || 'Failed to share setlist');
    } else {
      setSharedUsers((prev) => {
        const existingIndex = prev.findIndex((u) => u.email === trimmedEmail);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { id: shareId, email: trimmedEmail, permission: 'view' };
          return updated;
        }
        return [...prev, { id: shareId, email: trimmedEmail, permission: 'view' }];
      });
      setEmail('');
    }

    setLoading(false);
  }

  async function handleRemove(shareId: string) {
    const { error: err } = await supabase
      .from('setlist_shares')
      .delete()
      .eq('id', shareId);

    if (err) {
      setError(err.message);
    } else {
      setSharedUsers((prev) => prev.filter((u) => u.id !== shareId));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'border-stageBorder text-textSecondary hover:bg-elevated hover:text-textPrimary',
            className
          )}
        >
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-stageBorder text-textPrimary shadow-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-textPrimary">Share Setlist</DialogTitle>
          <DialogDescription className="text-textSecondary text-sm">
            Share this private setlist with band members by email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleShare();
            }}
            className="space-y-2"
          >
            <Label htmlFor="share-email" className="text-textSecondary text-sm">
              Musician email
            </Label>
            <div className="flex gap-2">
              <Input
                id="share-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="musician@email.com"
                type="email"
                className="bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary placeholder:text-textSecondary/50"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium shrink-0"
                aria-label="Add user"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {error && (
            <p role="alert" className="text-sm text-stageDestructive font-medium">
              {error}
            </p>
          )}

          <div className="space-y-2 pt-2">
            <Label className="text-textSecondary text-sm">Shared with</Label>
            {sharedUsers.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1" data-testid="shared-users-list">
                {sharedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-stageBorder bg-elevated/40"
                    data-testid={`shared-user-${u.id}`}
                  >
                    <span className="text-sm text-textPrimary truncate mr-2">{u.email}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="border-stageBorder bg-elevated text-textSecondary font-mono text-xs capitalize"
                      >
                        {u.permission}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleRemove(u.id)}
                        aria-label={`Remove ${u.email}`}
                        className="p-1 rounded text-textSecondary hover:text-stageDestructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stageAccent"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-textSecondary italic py-2">
                Not shared with anyone yet
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
