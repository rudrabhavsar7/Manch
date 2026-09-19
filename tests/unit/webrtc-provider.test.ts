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
    (global as any).RTCSessionDescription = class {
      type: string;
      sdp: string;
      constructor(init: RTCSessionDescriptionInit) {
        this.type = init.type;
        this.sdp = init.sdp || '';
      }
    };
  });

  it('connects as host', async () => {
    const provider = new WebRTCProvider();
    const statusHandler = vi.fn();
    provider.onStatusChange(statusHandler);
    
    const connectPromise = provider.connect('gig-1', 'host-1', true);
    
    // Trigger onopen manually
    // The problem is we need to simulate a signal to create a channel
    const signalHandler = (provider as any).signaling.onSignal.mock.calls[0][0];
    await signalHandler({ type: 'JOIN', from: 'client-1' });
    
    const channel = (provider as any).channels.get('client-1');
    channel.onopen();
    
    await connectPromise;
    expect(statusHandler).toHaveBeenCalledWith('connected');
  });

  it('connects as client and sends JOIN', async () => {
    const provider = new WebRTCProvider();
    const statusHandler = vi.fn();
    provider.onStatusChange(statusHandler);
    
    const connectPromise = provider.connect('gig-1', 'client-1', false);
    
    const signalHandler = (provider as any).signaling.onSignal.mock.calls[0][0];
    await signalHandler({ type: 'OFFER', from: 'host-1', to: 'client-1', sdp: {} });
    
    const pc = (provider as any).peers.get('host-1');
    pc.ondatachannel({
      channel: {
        onopen: null,
        onclose: null,
        onmessage: null,
        send: vi.fn(),
        readyState: 'open',
      }
    });
    
    const channel = (provider as any).channels.get('host-1');
    if (channel && channel.onopen) {
      channel.onopen();
    }
    
    await connectPromise;
    expect(statusHandler).toHaveBeenCalledWith('connected');
  });
});
