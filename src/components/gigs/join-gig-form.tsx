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

export function JoinGigForm() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useSupabase();
  const router = useRouter();

  async function joinByPin(pinValue: string) {
    if (!pinValue || pinValue.trim().length === 0) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const formattedPin = pinValue.padStart(4, '0');

      // Find active gig by PIN
      const { data: gig, error: gigErr } = await supabase
        .from('gigs')
        .select('*, setlists(*, setlist_songs(*, songs(*)))')
        .eq('pin', formattedPin)
        .eq('status', 'live')
        .single();

      if (gigErr || !gig) throw new Error('No active gig found with this PIN');

      // Join as musician
      const { error: memberErr } = await supabase.from('gig_members').upsert({
        gig_id: gig.id,
        user_id: user.id,
        role: 'musician',
      });

      if (memberErr) {
        console.error('Failed to join gig member:', memberErr);
      }

      // Cache gig data for offline
      const joinedGig = gig as unknown as {
        setlists?: (Setlist & {
          setlist_songs?: Array<{ song_id: string; songs?: Song | null }>;
        }) | null;
      };
      const setlist = joinedGig?.setlists;
      if (setlist) {
        const songs =
          setlist.setlist_songs
            ?.map((ss) => ss.songs)
            .filter((s): s is Song => Boolean(s)) ?? [];
        await CacheManager.cacheSongs(songs);
        await CacheManager.cacheSetlist(setlist);
        await CacheManager.cacheGigState(
          gig.id,
          setlist.id,
          setlist.setlist_songs?.map((ss) => ss.song_id) ?? [],
        );
      }

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
      joinByPin(parsed.pin);
    } else if (parsed.gigId) {
      router.push(`/gigs/${parsed.gigId}`);
    } else {
      joinByPin(data);
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
                joinByPin(pin);
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
                onClick={() => joinByPin(pin)}
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
