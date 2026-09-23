'use client';

import { useSupabase } from './use-supabase';
import type { Database } from '@/types/database';

type GigStatus = Database['public']['Tables']['gigs']['Row']['status'];

export function useGigActions() {
  const supabase = useSupabase();

  async function endGig(gigId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('gigs')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', gigId);

    if (error) return { error };
    return { error: null };
  }

  async function setGigStatus(gigId: string, status: 'draft' | 'live' | 'ended'): Promise<{ error: Error | null }> {
    const updates: { status: 'draft' | 'live' | 'ended'; ended_at?: string } = { status };
    if (status === 'ended') {
      updates.ended_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('gigs')
      .update(updates)
      .eq('id', gigId);

    if (error) return { error };
    return { error: null };
  }

  return { endGig, setGigStatus };
}