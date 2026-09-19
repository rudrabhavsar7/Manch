import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine } from '../../src/lib/sync/sync-engine';
import { WebRTCProvider } from '../../src/lib/sync/webrtc-provider';
import { SupabaseRealtimeProvider } from '../../src/lib/sync/supabase-provider';

vi.mock('../../src/lib/sync/webrtc-provider', () => ({
  WebRTCProvider: class {
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn();
    send = vi.fn();
    onMessage = vi.fn();
    onStatusChange = vi.fn();
  }
}));

vi.mock('../../src/lib/sync/supabase-provider', () => ({
  SupabaseRealtimeProvider: class {
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn();
    send = vi.fn();
    onMessage = vi.fn();
    onStatusChange = vi.fn();
    type = 'supabase';
  }
}));

describe('SyncEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects webrtc by default', async () => {
    const engine = new SyncEngine();
    await engine.connect('gig-1', 'user-1', true);
    expect(engine.activeTransport).toBeDefined();
  });
});
