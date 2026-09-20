import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseRealtimeProvider } from '../../src/lib/sync/supabase-provider';
import { createClient } from '../../src/lib/supabase/client';

vi.mock('../../src/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('SupabaseRealtimeProvider', () => {
  let mockChannel: any;
  let mockSupabase: any;

  beforeEach(() => {
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
      }),
      unsubscribe: vi.fn(),
      send: vi.fn(),
    };
    mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
    };
    (createClient as any).mockReturnValue(mockSupabase);
    vi.useFakeTimers();
  });

  it('connects to supabase sync channel', async () => {
    const provider = new SupabaseRealtimeProvider();
    await provider.connect('gig-1', 'user-1', true);
    
    expect(mockSupabase.channel).toHaveBeenCalledWith('gig-sync-gig-1');
  });

  it('sends messages', async () => {
    const provider = new SupabaseRealtimeProvider();
    await provider.connect('gig-1', 'user-1', true);
    
    provider.send({ type: 'SONG_CHANGE', songId: 'song-1', timestamp: 123 });
    
    expect(mockChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'sync',
      payload: { type: 'SONG_CHANGE', songId: 'song-1', timestamp: 123 }
    });
  });

  it('handles incoming messages', async () => {
    const provider = new SupabaseRealtimeProvider();
    const handler = vi.fn();
    provider.onMessage(handler);
    
    await provider.connect('gig-1', 'user-1', true);
    
    const onCallback = mockChannel.on.mock.calls[0][2];
    onCallback({ payload: { type: 'SONG_CHANGE', songId: 'song-1', timestamp: 123 } });
    
    expect(handler).toHaveBeenCalledWith({ type: 'SONG_CHANGE', songId: 'song-1', timestamp: 123 });
  });

  it('sends pong on ping', async () => {
    const provider = new SupabaseRealtimeProvider();
    const handler = vi.fn();
    provider.onMessage(handler);
    
    await provider.connect('gig-1', 'user-1', true);
    
    const onCallback = mockChannel.on.mock.calls[0][2];
    onCallback({ payload: { type: 'PING', from: 'user-2' } });
    
    expect(mockChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'sync',
      payload: { type: 'PONG', from: 'user-1', timestamp: expect.any(Number) }
    });
  });
});
