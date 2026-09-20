'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, Music, ScrollText, Edit3, WifiOff, Moon, ArrowRight, LogIn } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export default function Home() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl flex flex-col items-center text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-stageAccent/10 text-stageAccent border border-stageAccent/20">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          <span>Real-time stage sync engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-textPrimary">
          Manch
        </h1>
        <p className="text-xl sm:text-2xl font-medium text-textSecondary max-w-2xl">
          Live Gig Companion for Musicians
        </p>
        <p className="text-sm sm:text-base text-textSecondary/80 max-w-xl">
          Keep your entire band locked in sync on stage. Instant chords, synchronized lyrics,
          personal private annotations, and sub-100ms LAN sync that never drops.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-4">
          {user ? (
            <Button asChild size="lg" className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium">
              <Link href="/dashboard">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="bg-stageAccent hover:bg-stageAccent/90 text-white font-medium">
                <Link href="/auth/signup">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-stageBorder text-textPrimary hover:bg-elevated">
                <Link href="/auth/login">
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </Link>
              </Button>
            </>
          )}
          <Button asChild size="lg" variant="outline" className="border-stageBorder text-textPrimary hover:bg-elevated">
            <Link href="/gigs/join">
              <Radio className="mr-2 h-4 w-4 text-emerald-400" /> Join Gig with PIN
            </Link>
          </Button>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="container mx-auto px-4 pb-20 max-w-5xl">
        <h2 className="text-2xl font-bold text-center text-textPrimary mb-8">
          Engineered for Live Performance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
            <CardHeader className="pb-2">
              <div className="h-10 w-10 rounded-lg bg-stageAccent/10 text-stageAccent flex items-center justify-center mb-2">
                <Radio className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold text-textPrimary">
                Sub-100ms Stage Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-textSecondary">
              WebRTC star topology syncs active songs and chords across the band over local Wi-Fi without needing an internet connection.
            </CardContent>
          </Card>

          <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
            <CardHeader className="pb-2">
              <div className="h-10 w-10 rounded-lg bg-stageAccent/10 text-stageAccent flex items-center justify-center mb-2">
                <Music className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold text-textPrimary">
                Chords & Transposition
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-textSecondary">
              Monospaced chord alignments above lyrics. Non-destructive transposition allows each musician to customize keys for their instrument.
            </CardContent>
          </Card>

          <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
            <CardHeader className="pb-2">
              <div className="h-10 w-10 rounded-lg bg-stageAccent/10 text-stageAccent flex items-center justify-center mb-2">
                <ScrollText className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold text-textPrimary">
                Auto-Scroll Teleprompter
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-textSecondary">
              Hands-free stage teleprompter mode with adjustable speeds, or follow the band leader&apos;s scroll position in real time.
            </CardContent>
          </Card>

          <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
            <CardHeader className="pb-2">
              <div className="h-10 w-10 rounded-lg bg-stageAccent/10 text-stageAccent flex items-center justify-center mb-2">
                <Edit3 className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold text-textPrimary">
                Private Annotations
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-textSecondary">
              Add cues, fills, structural reminders, or color-coded markers directly to any line. Kept completely private to you.
            </CardContent>
          </Card>

          <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
            <CardHeader className="pb-2">
              <div className="h-10 w-10 rounded-lg bg-stageAccent/10 text-stageAccent flex items-center justify-center mb-2">
                <WifiOff className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold text-textPrimary">
                100% Offline-First
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-textSecondary">
              Powered by IndexedDB and Service Workers. Joining a gig caches all charts instantly, so sudden venue disconnects won&apos;t disrupt your set.
            </CardContent>
          </Card>

          <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
            <CardHeader className="pb-2">
              <div className="h-10 w-10 rounded-lg bg-stageAccent/10 text-stageAccent flex items-center justify-center mb-2">
                <Moon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold text-textPrimary">
                Stage-Ready Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-textSecondary">
              Dark stage mode with high-contrast amber chord highlights and generous touch targets prevents glare and mistakes during live shows.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
