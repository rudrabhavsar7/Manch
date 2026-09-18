import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music } from 'lucide-react';
import type { Database } from '@/types/database';

type Song = Database['public']['Tables']['songs']['Row'];

interface SongCardProps {
  song: Song;
}

export function SongCard({ song }: SongCardProps) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stageAccent rounded-lg"
    >
      <Card className="bg-surface border-stageBorder shadow-none rounded-lg hover:bg-elevated transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-textPrimary flex items-center gap-2">
            <Music className="h-4 w-4 text-textSecondary shrink-0" />
            <span className="truncate">{song.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-textSecondary truncate">
            {song.artist || 'Unknown Artist'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {song.key && (
              <Badge
                variant="secondary"
                className="bg-elevated text-textSecondary border border-stageBorder font-mono text-xs"
              >
                {song.key}
              </Badge>
            )}
            {song.bpm && (
              <Badge
                variant="outline"
                className="text-textSecondary border-stageBorder font-mono text-xs"
              >
                {song.bpm} BPM
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
