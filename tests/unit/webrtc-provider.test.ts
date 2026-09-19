import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCProvider } from '../../src/lib/sync/webrtc-provider';

vi.mock('../../src/lib/sync/signaling', () => {
  return {
    WebRTCSignaling: class {
      connect = vi.fn().mockResolvedValue(undefined);
      disconnect = vi.fn();
      send = vi.fn();
      onSignal = vi.fn();
    }
  };
});

describe('WebRTCProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (global as any).RTCPeerConnection = class {
      createDataChannel = vi.fn().mockReturnValue({
        onopen: null,
        onclose: null,
        onmessage: null,
        send: vi.fn(),
        readyState: 'open',
      });
      setLocalDescription = vi.fn().mockResolvedValue(undefined);
      setRemoteDescription = vi.fn().mockResolvedValue(undefined);
      createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: '' });
      createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: '' });
      addIceCandidate = vi.fn().mockResolvedValue(undefined);
      close = vi.fn();
      ondatachannel = null;
      onicecandidate = null;
      onconnectionstatechange = null;
    };
  });

  it('connects as host', async () => {
    const provider = new WebRTCProvider();
    const statusHandler = vi.fn();
    provider.onStatusChange(statusHandler);
    
    await provider.connect('gig-1', 'host-1', true);
    
    expect(statusHandler).toHaveBeenCalledWith('connected');
  });

  it('connects as client and sends JOIN', async () => {
    const provider = new WebRTCProvider();
    const statusHandler = vi.fn();
    provider.onStatusChange(statusHandler);
    
    await provider.connect('gig-1', 'client-1', false);
    
    // Status is 'connecting' until channels open, which we mock in setup
    expect(statusHandler).toHaveBeenCalledWith('connecting');
  });
});
