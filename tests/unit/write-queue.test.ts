import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PendingWrite } from '@/lib/offline/db';

const mockPendingWrites = new Map<string, PendingWrite>();

vi.mock('@/lib/offline/db', async () => {
  const actual = await vi.importActual<typeof import('@/lib/offline/db')>('@/lib/offline/db');
  return {
    ...actual,
    manchDB: {
      pendingWrites: {
        add: vi.fn(async (item: PendingWrite) => {
          mockPendingWrites.set(item.id, item);
        }),
        toArray: vi.fn(async () => Array.from(mockPendingWrites.values())),
        orderBy: vi.fn((field: keyof PendingWrite) => ({
          toArray: vi.fn(async () =>
            Array.from(mockPendingWrites.values()).sort(
              (a, b) => (a[field] as number) - (b[field] as number),
            ),
          ),
        })),
        get: vi.fn(async (id: string) => mockPendingWrites.get(id)),
        delete: vi.fn(async (id: string) => {
          mockPendingWrites.delete(id);
        }),
        update: vi.fn(async (id: string, changes: Partial<PendingWrite>) => {
          const item = mockPendingWrites.get(id);
          if (item) {
            mockPendingWrites.set(id, { ...item, ...changes });
          }
        }),
      },
    },
  };
});

describe('WriteQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingWrites.clear();
  });

  it('enqueues a write with generated id, timestamp, and 0 retries', async () => {
    const { WriteQueue } = await import('@/lib/offline/write-queue');
    const { manchDB } = await import('@/lib/offline/db');

    await WriteQueue.enqueue('annotations', 'insert', { id: 'a1', content: 'test note' });

    expect(manchDB.pendingWrites.add).toHaveBeenCalledTimes(1);
    expect(mockPendingWrites.size).toBe(1);

    const queued = Array.from(mockPendingWrites.values())[0];
    expect(queued.table).toBe('annotations');
    expect(queued.operation).toBe('insert');
    expect(queued.payload).toEqual({ id: 'a1', content: 'test note' });
    expect(queued.retries).toBe(0);
    expect(queued.id).toMatch(/^pw-/);
    expect(queued.createdAt).toBeGreaterThan(0);
  });

  it('returns pending count correctly', async () => {
    const { WriteQueue } = await import('@/lib/offline/write-queue');

    expect(await WriteQueue.pendingCount()).toBe(0);

    mockPendingWrites.set('w1', {
      id: 'w1',
      table: 'annotations',
      operation: 'insert',
      payload: {},
      createdAt: 1,
      retries: 0,
    });
    mockPendingWrites.set('w2', {
      id: 'w2',
      table: 'annotations',
      operation: 'update',
      payload: {},
      createdAt: 2,
      retries: 0,
    });

    const count = await WriteQueue.pendingCount();
    expect(count).toBe(2);
  });

  it('returns all pending writes in FIFO order sorted by createdAt', async () => {
    const { WriteQueue } = await import('@/lib/offline/write-queue');

    const w2: PendingWrite = {
      id: 'w2',
      table: 'annotations',
      operation: 'insert',
      payload: { id: '2' },
      createdAt: 200,
      retries: 0,
    };
    const w1: PendingWrite = {
      id: 'w1',
      table: 'annotations',
      operation: 'insert',
      payload: { id: '1' },
      createdAt: 100,
      retries: 0,
    };
    mockPendingWrites.set('w2', w2);
    mockPendingWrites.set('w1', w1);

    const pending = await WriteQueue.getPending();
    expect(pending).toEqual([w1, w2]);
  });

  it('marks a write as completed by removing it from the queue', async () => {
    const { WriteQueue } = await import('@/lib/offline/write-queue');
    const { manchDB } = await import('@/lib/offline/db');

    mockPendingWrites.set('w1', {
      id: 'w1',
      table: 'annotations',
      operation: 'insert',
      payload: {},
      createdAt: 1,
      retries: 0,
    });

    await WriteQueue.markCompleted('w1');
    expect(manchDB.pendingWrites.delete).toHaveBeenCalledWith('w1');
    expect(mockPendingWrites.has('w1')).toBe(false);
  });

  it('increments retries counter when marking retry', async () => {
    const { WriteQueue } = await import('@/lib/offline/write-queue');
    const { manchDB } = await import('@/lib/offline/db');

    mockPendingWrites.set('w1', {
      id: 'w1',
      table: 'annotations',
      operation: 'insert',
      payload: {},
      createdAt: 1,
      retries: 0,
    });

    await WriteQueue.markRetry('w1');
    expect(manchDB.pendingWrites.update).toHaveBeenCalledWith('w1', { retries: 1 });
    expect(mockPendingWrites.get('w1')?.retries).toBe(1);

    await WriteQueue.markRetry('w1');
    expect(mockPendingWrites.get('w1')?.retries).toBe(2);
  });

  describe('flush', () => {
    it('returns 0 succeeded and 0 failed when queue is empty', async () => {
      const { WriteQueue } = await import('@/lib/offline/write-queue');
      const mockSupabase = {
        from: vi.fn(),
      };

      const result = await WriteQueue.flush(mockSupabase as any);
      expect(result).toEqual({ succeeded: 0, failed: 0 });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('flushes insert, update, and delete operations successfully', async () => {
      const { WriteQueue } = await import('@/lib/offline/write-queue');

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        }),
      };

      mockPendingWrites.set('w1', {
        id: 'w1',
        table: 'annotations',
        operation: 'insert',
        payload: { id: 'a1', content: 'note 1' },
        createdAt: 1,
        retries: 0,
      });
      mockPendingWrites.set('w2', {
        id: 'w2',
        table: 'annotations',
        operation: 'update',
        payload: { id: 'a2', content: 'note 2 updated' },
        createdAt: 2,
        retries: 0,
      });
      mockPendingWrites.set('w3', {
        id: 'w3',
        table: 'annotations',
        operation: 'delete',
        payload: { id: 'a3' },
        createdAt: 3,
        retries: 0,
      });

      const result = await WriteQueue.flush(mockSupabase as any);

      expect(result).toEqual({ succeeded: 3, failed: 0 });
      expect(mockPendingWrites.size).toBe(0);

      // Verify insert
      expect(mockInsert).toHaveBeenCalledWith({ id: 'a1', content: 'note 1' });
      // Verify update
      expect(mockUpdate).toHaveBeenCalledWith({ content: 'note 2 updated' });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'a2');
      // Verify delete
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'a3');
    });

    it('handles failures by marking retry and continuing with next writes', async () => {
      const { WriteQueue } = await import('@/lib/offline/write-queue');

      const mockSupabase = {
        from: vi.fn((_table: string) => ({
          insert: vi.fn(async (payload: any) => {
            if (payload.id === 'fail-item') {
              return { error: new Error('Network error') };
            }
            return { error: null };
          }),
        })),
      };

      mockPendingWrites.set('w-fail', {
        id: 'w-fail',
        table: 'annotations',
        operation: 'insert',
        payload: { id: 'fail-item' },
        createdAt: 1,
        retries: 0,
      });
      mockPendingWrites.set('w-ok', {
        id: 'w-ok',
        table: 'annotations',
        operation: 'insert',
        payload: { id: 'ok-item' },
        createdAt: 2,
        retries: 0,
      });

      const result = await WriteQueue.flush(mockSupabase as any);

      expect(result).toEqual({ succeeded: 1, failed: 1 });
      // Failed item retained with retries = 1
      expect(mockPendingWrites.has('w-fail')).toBe(true);
      expect(mockPendingWrites.get('w-fail')?.retries).toBe(1);
      // Succeeded item removed
      expect(mockPendingWrites.has('w-ok')).toBe(false);
    });

    it('fails and retries if update payload is missing id', async () => {
      const { WriteQueue } = await import('@/lib/offline/write-queue');
      const mockSupabase = {
        from: vi.fn(),
      };

      mockPendingWrites.set('w-noid', {
        id: 'w-noid',
        table: 'annotations',
        operation: 'update',
        payload: { content: 'no id here' },
        createdAt: 1,
        retries: 0,
      });

      const result = await WriteQueue.flush(mockSupabase as any);
      expect(result).toEqual({ succeeded: 0, failed: 1 });
      expect(mockPendingWrites.get('w-noid')?.retries).toBe(1);
    });

    it('fails and retries if delete payload is missing id', async () => {
      const { WriteQueue } = await import('@/lib/offline/write-queue');
      const mockSupabase = {
        from: vi.fn(),
      };

      mockPendingWrites.set('w-noid', {
        id: 'w-noid',
        table: 'annotations',
        operation: 'delete',
        payload: {},
        createdAt: 1,
        retries: 0,
      });

      const result = await WriteQueue.flush(mockSupabase as any);
      expect(result).toEqual({ succeeded: 0, failed: 1 });
      expect(mockPendingWrites.get('w-noid')?.retries).toBe(1);
    });
  });
});
