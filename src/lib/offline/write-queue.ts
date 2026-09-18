import { manchDB, type PendingWrite } from './db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type FlushSupabaseClient =
  | SupabaseClient<Database>
  | {
      from: (table: string) => {
        insert: (data: unknown) => Promise<{ error: unknown }>;
        update: (data: unknown) => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> };
        delete: () => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> };
      };
    };

export class WriteQueue {
  static async enqueue(
    table: PendingWrite['table'],
    operation: PendingWrite['operation'],
    payload: Record<string, unknown>,
  ): Promise<void> {
    const write: PendingWrite = {
      id: `pw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      table,
      operation,
      payload,
      createdAt: Date.now(),
      retries: 0,
    };
    await manchDB.pendingWrites.add(write);
  }

  static async pendingCount(): Promise<number> {
    const all = await manchDB.pendingWrites.toArray();
    return all.length;
  }

  static async getPending(): Promise<PendingWrite[]> {
    return manchDB.pendingWrites.toArray();
  }

  static async markCompleted(id: string): Promise<void> {
    await manchDB.pendingWrites.delete(id);
  }

  static async markRetry(id: string): Promise<void> {
    const existing = await manchDB.pendingWrites.get(id);
    await manchDB.pendingWrites.update(id, {
      retries: (existing?.retries ?? 0) + 1,
    });
  }

  static async flush(
    supabase: FlushSupabaseClient,
  ): Promise<{ succeeded: number; failed: number }> {
    const pending = await this.getPending();
    let succeeded = 0;
    let failed = 0;

    for (const write of pending) {
      try {
        if (write.operation === 'insert') {
          const { error } = await (supabase.from(write.table) as unknown as {
            insert: (data: unknown) => Promise<{ error: unknown }>;
          }).insert(write.payload);
          if (error) throw error;
        } else if (write.operation === 'update') {
          const { id: payloadId, ...rest } = write.payload;
          const { error } = await (supabase.from(write.table) as unknown as {
            update: (data: unknown) => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> };
          }).update(rest).eq('id', payloadId);
          if (error) throw error;
        } else if (write.operation === 'delete') {
          const { error } = await (supabase.from(write.table) as unknown as {
            delete: () => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> };
          }).delete().eq('id', write.payload.id);
          if (error) throw error;
        }

        await this.markCompleted(write.id);
        succeeded++;
      } catch {
        await this.markRetry(write.id);
        failed++;
      }
    }

    return { succeeded, failed };
  }
}
