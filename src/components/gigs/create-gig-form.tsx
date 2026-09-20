'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSupabase } from '@/hooks/use-supabase';
import { generateUniquePin } from '@/lib/utils/pin-generator';
import type { Database } from '@/types/database';

type Setlist = Database['public']['Tables']['setlists']['Row'];

export function CreateGigForm() {
  const [name, setName] = useState('');
  const [setlistId, setSetlistId] = useState('');
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

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!setlistId) {
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
          setlist_id: setlistId,
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
            <Label htmlFor="setlist" className="text-textPrimary">
              Setlist
            </Label>
            {loadingSetlists ? (
              <p className="text-sm text-textSecondary">Loading setlists...</p>
            ) : setlists.length > 0 ? (
              <Select
                value={setlistId}
                onValueChange={(val) => {
                  setSetlistId(val);
                  if (error) setError(null);
                }}
                disabled={saving}
              >
                <SelectTrigger
                  id="setlist"
                  className="bg-elevated border border-stageBorder focus:ring-2 focus:ring-stageAccent text-textPrimary"
                >
                  <SelectValue placeholder="Choose a setlist" />
                </SelectTrigger>
                <SelectContent className="bg-surface border border-stageBorder text-textPrimary">
                  {setlists.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
