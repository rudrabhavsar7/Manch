'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSupabase } from '@/hooks/use-supabase';
import { generateUniquePin } from '@/lib/utils/pin-generator';
import type { Database } from '@/types/database';
import { cn } from '@/lib/utils';

type Setlist = Database['public']['Tables']['setlists']['Row'];

export function CreateGigForm() {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loadingSetlists, setLoadingSetlists] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useSupabase();
  const router = useRouter();

  useEffect(() => {
    async function loadSetlists() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoadingSetlists(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('setlists')
          .select('*')
          .eq('owner_id', user.id)
          .order('name');

        if (!fetchError && data) {
          setSetlists(data);
        }
      } catch (err: unknown) {
        console.error('Failed to load setlists:', err);
      } finally {
        setLoadingSetlists(false);
      }
    }

    loadSetlists();
  }, [supabase]);

  function toggleSetlist(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    if (error) setError(null);
  }

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (selected.length === 0) {
      setError('Select a setlist');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const pin = await generateUniquePin(supabase);

      const { data: gig, error: gigErr } = await supabase
        .from('gigs')
        .insert({
          name: name.trim(),
          admin_id: user.id,
          setlist_id: selected[0],
          pin,
          status: 'live',
        })
        .select()
        .single();

      if (gigErr || !gig) {
        throw new Error(gigErr?.message ?? 'Failed to create gig');
      }

      // Add admin as gig member
      const { error: memberErr } = await supabase.from('gig_members').insert({
        gig_id: gig.id,
        user_id: user.id,
        role: 'admin',
      });

      if (memberErr) {
        console.error('Failed to add admin member:', memberErr);
      }

      // Queue every selected setlist; first one is the active setlist
      for (let i = 0; i < selected.length; i++) {
        const setlist = setlists.find((s) => s.id === selected[i]);
        if (!setlist) continue;
        const { error: queueErr } = await supabase.from('gig_setlists').insert({
          gig_id: gig.id,
          setlist_id: setlist.id,
          setlist_name: setlist.name,
          position: i,
        });
        if (queueErr) {
          console.error('Failed to queue setlist:', queueErr);
        }
      }

      router.push(`/gigs/${gig.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create gig';
      setError(message);
      setSaving(false);
    }
  }

  return (
    <Card className="bg-surface border border-stageBorder shadow-none rounded-lg max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-textPrimary">Create Gig</CardTitle>
        <CardDescription className="text-textSecondary">
          Launch a live gig session with real-time sync and PIN/QR access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-textPrimary">
              Gig Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Friday Night at Blue Frog"
              className="bg-elevated border border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-textPrimary">Setlists</Label>
            <p className="text-xs text-textSecondary">
              Pick one or more — first pick becomes the active setlist. You can switch during the gig.
            </p>
            {loadingSetlists ? (
              <p className="text-sm text-textSecondary">Loading setlists...</p>
            ) : setlists.length > 0 ? (
              <div className="space-y-1 max-h-56 overflow-y-auto" data-testid="setlist-picker">
                {setlists.map((s) => {
                  const checked = selected.includes(s.id);
                  const pickOrder = checked ? selected.indexOf(s.id) + 1 : null;
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors',
                        checked
                          ? 'border-primary bg-primary/10'
                          : 'border-stageBorder bg-elevated/50 hover:bg-elevated'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSetlist(s.id)}
                        disabled={saving}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-textPrimary flex-1 truncate">{s.name}</span>
                      {pickOrder !== null && (
                        <span className="text-[10px] font-medium text-primary">
                          {pickOrder === 1 ? 'active' : `#${pickOrder}`}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 border border-stageBorder rounded-md bg-elevated/50 text-sm space-y-2">
                <p className="text-textSecondary">No setlists found. You need a setlist to create a gig.</p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-stageBorder text-textPrimary hover:bg-elevated"
                >
                  <Link href="/setlists/new">Create a Setlist</Link>
                </Button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-stageDestructive">{error}</p>}

          <Button
            type="submit"
            disabled={saving || (setlists.length === 0 && !loadingSetlists)}
            className="w-full bg-stageAccent hover:bg-stageAccent/90 text-white font-medium"
          >
            {saving ? 'Creating...' : 'Create & Go Live'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
