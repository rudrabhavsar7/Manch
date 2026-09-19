import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCSignaling } from '../../src/lib/sync/signaling';
import { createClient } from '../../src/lib/supabase/client';

vi.mock('../../src/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('WebRTCSignaling', () => {
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
  });

  it('connects to supabase channel', async () => {
    const signaling = new WebRTCSignaling();
    await signaling.connect('gig-1', 'user-1');
    expect(mockSupabase.channel).toHaveBeenCalledWith('gig-signaling-gig-1');
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('receives messages meant for it', async () => {
    const signaling = new WebRTCSignaling();
    const handler = vi.fn();
    signaling.onSignal(handler);
    
    await signaling.connect('gig-1', 'user-1');
    
    const onCallback = mockChannel.on.mock.calls[0][2];
    onCallback({ payload: { type: 'OFFER', to: 'user-1', from: 'user-2' } });
    
    expect(handler).toHaveBeenCalled();
  });

  it('ignores messages meant for others', async () => {
    const signaling = new WebRTCSignaling();
    const handler = vi.fn();
    signaling.onSignal(handler);
    
    await signaling.connect('gig-1', 'user-1');
    
    const onCallback = mockChannel.on.mock.calls[0][2];
    onCallback({ payload: { type: 'OFFER', to: 'user-3', from: 'user-2' } });
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('disconnects', async () => {
    const signaling = new WebRTCSignaling();
    await signaling.connect('gig-1', 'user-1');
    signaling.disconnect();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });
});
