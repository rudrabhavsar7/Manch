import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListMusic, Lock, Globe } from 'lucide-react';
import type { Database } from '@/types/database';

type Setlist = Database['public']['Tables']['setlists']['Row'];

export interface SetlistCardProps {
  setlist: Setlist;
  songCount: number;
}

export function SetlistCard({ setlist, songCount }: SetlistCardProps) {
  const isPublic = setlist.privacy === 'public';

  return (
    <Link
      href={`/setlists/${setlist.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stageAccent rounded-lg"
    >
      <Card className="bg-surface border-stageBorder shadow-none rounded-lg hover:bg-elevated transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-textPrimary flex items-center gap-2">
            <ListMusic className="h-4 w-4 text-textSecondary shrink-0" />
            <span className="truncate">{setlist.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-stageBorder text-textSecondary font-mono text-xs"
            >
              {songCount} {songCount === 1 ? 'song' : 'songs'}
            </Badge>
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-elevated text-textSecondary border border-stageBorder text-xs capitalize"
            >
              {isPublic ? (
                <Globe className="h-3 w-3 shrink-0" data-testid="globe-icon" />
              ) : (
                <Lock className="h-3 w-3 shrink-0" data-testid="lock-icon" />
              )}
              {setlist.privacy}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
