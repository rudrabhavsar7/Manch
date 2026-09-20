import { createClient } from '../supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type SignalMessage = 
  | { type: 'OFFER'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ANSWER'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ICE_CANDIDATE'; from: string; to: string; candidate: RTCIceCandidateInit }
  | { type: 'JOIN'; from: string };

export class WebRTCSignaling {
  private channel: RealtimeChannel | null = null;
  private onSignalHandler: ((msg: SignalMessage) => void) | null = null;

  async connect(gigId: string, userId: string): Promise<void> {
    const supabase = createClient();
    this.channel = supabase.channel(`gig-signaling-${gigId}`);
    
    this.channel.on('broadcast', { event: 'signal' }, (payload) => {
      const msg = payload.payload as SignalMessage;
      if (('to' in msg && msg.to === userId) || msg.type === 'JOIN') {
        if (msg.type === 'JOIN' && msg.from === userId) return;
        this.onSignalHandler?.(msg);
      }
    });
    
    return new Promise((resolve, reject) => {
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          reject(new Error(`Signaling error: ${status}`));
        }
      });
    });
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  send(message: SignalMessage): void {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: message,
    });
  }

  onSignal(handler: (msg: SignalMessage) => void): void {
    this.onSignalHandler = handler;
  }

  // Generate a QR payload (mock for zero internet)
  generateQrPayload(gigId: string, sessionKey: string, localIps: string[]): string {
    return JSON.stringify({ gigId, sessionKey, localIps });
  }
}
