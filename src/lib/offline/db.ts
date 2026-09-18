import Dexie, { type Table } from 'dexie';
import type { Database } from '@/types/database';

export type Song = Database['public']['Tables']['songs']['Row'];
export type Setlist = Database['public']['Tables']['setlists']['Row'];
export type Annotation = Database['public']['Tables']['annotations']['Row'];

export interface PendingWrite {
  id: string;
  table: 'annotations' | 'users';
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

export interface CachedGigState {
  gigId: string;
  setlistId: string;
  songIds: string[];
  cachedAt: number;
}

export class ManchDatabase extends Dexie {
  songs!: Table<Song, string>;
  setlists!: Table<Setlist, string>;
  annotations!: Table<Annotation, string>;
  pendingWrites!: Table<PendingWrite, string>;
  gigState!: Table<CachedGigState, string>;

  constructor() {
    super('manch');
    this.version(1).stores({
      songs: 'id, owner_id, title',
      setlists: 'id, owner_id',
      annotations: 'id, [user_id+song_id], song_id',
      pendingWrites: 'id, table, createdAt',
      gigState: 'gigId',
    });
  }
}

export const manchDB = new ManchDatabase();
