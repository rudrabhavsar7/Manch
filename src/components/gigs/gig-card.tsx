import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import type { Database } from '@/types/database';

export type Gig = Database['public']['Tables']['gigs']['Row'];

interface GigCardProps {
  gig: Gig;
}

export function GigCard({ gig }: GigCardProps) {
  const statusColor = {
    draft: 'secondary',
    live: 'default',
    ended: 'outline',
  } as const;

  return (
    <Link href={`/gigs/${gig.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-stageAccent rounded-lg">
      <Card className="bg-surface border border-stageBorder shadow-none rounded-lg hover:border-stageAccent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-textPrimary flex items-center gap-2">
            {gig.status === 'live' && (
              <Radio
                data-testid="live-pulse-icon"
                className="h-4 w-4 text-emerald-500 animate-pulse shrink-0"
              />
            )}
            <span className="truncate">{gig.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={statusColor[gig.status]}
              className={
                gig.status === 'live'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : gig.status === 'draft'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'border-stageBorder text-textSecondary'
              }
            >
              {gig.status}
            </Badge>
            {gig.status === 'live' && (
              <span className="text-sm font-mono text-textSecondary">
                PIN: {gig.pin}
              </span>
            )}
          </div>
          <p className="text-xs text-textSecondary mt-3">
            {new Date(gig.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
