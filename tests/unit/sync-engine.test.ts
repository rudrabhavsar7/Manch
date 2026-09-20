import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine } from '../../src/lib/sync/sync-engine';
import { WebRTCProvider } from '../../src/lib/sync/webrtc-provider';
import { SupabaseRealtimeProvider } from '../../src/lib/sync/supabase-provider';

describe('SyncEngine', () => {
  let mockWebRTC: any;
  let mockSupabase: any;

  beforeEach(() => {
    mockWebRTC = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      send: vi.fn(),
      onMessage: vi.fn(),
      onStatusChange: vi.fn(),
      status: 'disconnected',
      type: 'webrtc'
    };

    mockSupabase = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      send: vi.fn(),
      onMessage: vi.fn(),
      onStatusChange: vi.fn(),
      status: 'disconnected',
      type: 'supabase'
    };
  });

  it('connects webrtc by default', async () => {
    const engine = new SyncEngine(mockWebRTC, mockSupabase);
    await engine.connect('gig-1', 'user-1', true);
    expect(mockWebRTC.connect).toHaveBeenCalled();
    expect(engine.activeTransport).toBe(mockWebRTC);
  });

  it('falls back to supabase if webrtc fails to connect', async () => {
    mockWebRTC.connect.mockRejectedValue(new Error('timeout'));
    const engine = new SyncEngine(mockWebRTC, mockSupabase);
    await engine.connect('gig-1', 'user-1', true);
    
    expect(mockSupabase.connect).toHaveBeenCalled();
    expect(engine.activeTransport).toBe(mockSupabase);
  });

  it('falls back to supabase if webrtc disconnects after connecting', async () => {
    const engine = new SyncEngine(mockWebRTC, mockSupabase);
    await engine.connect('gig-1', 'user-1', true);
    expect(engine.activeTransport).toBe(mockWebRTC);
    
    const triggerWebRTCStatus = mockWebRTC.onStatusChange.mock.calls[0][0];
    triggerWebRTCStatus('disconnected');
    expect(engine.activeTransport).toBe(mockSupabase);
  });

  it('dispatches messages correctly to the active transport', async () => {
    const engine = new SyncEngine(mockWebRTC, mockSupabase);
    await engine.connect('gig-1', 'user-1', true);
    
    engine.send({ type: 'PING', from: 'user-1', timestamp: 123 });
    expect(mockWebRTC.send).toHaveBeenCalled();
  });
});
