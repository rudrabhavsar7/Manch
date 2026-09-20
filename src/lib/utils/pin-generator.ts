import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function generatePin(): string {
  const pin = Math.floor(Math.random() * 10000);
  return formatPin(pin.toString());
}

export function formatPin(pin: string): string {
  return pin.padStart(4, '0');
}

export type GigPinClient = Pick<SupabaseClient<Database>, 'from'>;

export async function generateUniquePin(supabase: GigPinClient): Promise<string> {
  const MAX_ATTEMPTS = 10;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const pin = generatePin();
    const { data } = await supabase
      .from('gigs')
      .select('id')
      .eq('pin', pin)
      .eq('status', 'live')
      .maybeSingle();

    if (!data) return pin;
  }

  throw new Error('Could not generate unique PIN after max attempts');
}
