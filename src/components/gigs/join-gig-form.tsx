'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRScanner } from './qr-scanner';
import { useSupabase } from '@/hooks/use-supabase';
import { CacheManager } from '@/lib/offline/cache-manager';
import type { Song, Setlist } from '@/lib/offline/db';
import { parseGigQrData } from '@/lib/utils/qr';

interface SetlistSongWithRelation {
  song_id: string;
  position: number;
  songs?: Song | null;
}

interface SetlistWithRelations extends Setlist {
  setlist_songs?: SetlistSongWithRelation[];
}

export function JoinGigForm() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useSupabase();
  const router = useRouter();

  async function joinGig({
    pinValue,
    gigIdValue,
  }: {
    pinValue?: string;
    gigIdValue?: string;
  }) {
    if (!pinValue && !gigIdValue) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Start gig lookup immediately — independent of auth check.
      let query = supabase.from('gigs').select('id, setlist_id, status').eq('status', 'live');
      if (pinValue) {
        query = query.eq('pin', pinValue.padStart(4, '0'));
      } else if (gigIdValue) {
        query = query.eq('id', gigIdValue);
      }
      const gigPromise = query.single();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure public.users profile exists (FK for gig_members).
      // Covers users created before the handle_new_user trigger existed.
      const { error: profileErr } = await supabase.from('users').upsert(
        {
          id: user.id,
          email: user.email ?? '',
          display_name:
            (user.user_metadata?.display_name as string | undefined) ||
            (user.user_metadata?.name as string | undefined) ||
            user.email?.split('@')[0] ||
            '',
        },
        { onConflict: 'id' },
      );
      if (profileErr) {
        console.error('Failed to ensure user profile:', profileErr);
      }

      const { data: gig, error: gigErr } = await gigPromise;
      if (gigErr || !gig) throw new Error('No active gig found with this PIN');

      // 3. Insert membership first with onConflict so user becomes a member for RLS
      const { error: memberErr } = await supabase.from('gig_members').upsert(
        {
          gig_id: gig.id,
          user_id: user.id,
          role: 'musician',
        },
        { onConflict: 'gig_id,user_id' },
      );

      if (memberErr) {
        console.error('Failed to join gig member:', memberErr);
        throw new Error('Failed to join gig. Please try again.');
      }

      // 4. Now query setlist & songs (user is now a member, satisfying is_gig_member() RLS)
      if (gig.setlist_id) {
        const { data: setlistData } = await supabase
          .from('setlists')
          .select('*, setlist_songs(*, songs(*))')
          .eq('id', gig.setlist_id)
          .single();

        if (setlistData) {
          const setlist = setlistData as unknown as SetlistWithRelations;
          const sortedSetlistSongs = setlist.setlist_songs
            ? [...setlist.setlist_songs].sort((a, b) => a.position - b.position)
            : [];

          const songs = sortedSetlistSongs
            .map((ss) => ss.songs)
            .filter((s): s is Song => Boolean(s));

          const songIds = sortedSetlistSongs.map((ss) => ss.song_id);

          await CacheManager.cacheSongs(songs);
          await CacheManager.cacheSetlist(setlist);
          await CacheManager.cacheGigState(gig.id, gig.setlist_id, songIds);
        }
      }

      // 5. Redirect to live gig page
      router.push(`/gigs/${gig.id}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to join gig';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleQRScan(data: string) {
    if (loading) return;

    const parsed = parseGigQrData(data);
    if (parsed.pin) {
      setPin(parsed.pin);
      joinGig({ pinValue: parsed.pin });
    } else if (parsed.gigId) {
      joinGig({ gigIdValue: parsed.gigId });
    } else {
      joinGig({ pinValue: data });
    }
  }

  return (
    <Card className="bg-surface border border-stageBorder shadow-none rounded-lg max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-textPrimary">Join Gig</CardTitle>
        <CardDescription className="text-textSecondary">
          Connect to a live performance using the 4-digit stage PIN or QR code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pin" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-elevated border border-stageBorder">
            <TabsTrigger
              value="pin"
              className="data-[state=active]:bg-surface data-[state=active]:text-textPrimary text-textSecondary"
            >
              Enter PIN
            </TabsTrigger>
            <TabsTrigger
              value="qr"
              className="data-[state=active]:bg-surface data-[state=active]:text-textPrimary text-textSecondary"
            >
              Scan QR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pin" className="space-y-5 mt-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                joinGig({ pinValue: pin });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-textPrimary">
                  4-Digit PIN
                </Label>
                <Input
                  id="pin"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                    if (error) setError(null);
                  }}
                  placeholder="0000"
                  maxLength={4}
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="bg-elevated border border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none text-textPrimary text-center text-2xl tracking-[0.5em] font-mono"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || pin.length < 4}
                className="w-full bg-stageAccent hover:bg-stageAccent/90 text-white font-medium"
              >
                {loading ? 'Joining...' : 'Join Gig'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="qr" className="mt-5">
            <QRScanner onScan={handleQRScan} />
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-stageDestructive mt-4" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
