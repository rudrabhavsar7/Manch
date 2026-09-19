import { createClient } from '../supabase/client';
import { SyncMessage, ConnectionStatus, TransportProvider } from './message-types';
import { RealtimeChannel } from '@supabase/supabase-js';

export class SupabaseRealtimeProvider implements TransportProvider {
  type = 'supabase' as const;
  
  private gigId: string | null = null;
  private userId: string | null = null;
  private isHost: boolean = false;
  
  private channel: RealtimeChannel | null = null;
  
  private onMessageHandler: ((msg: SyncMessage) => void) | null = null;
  private onStatusChangeHandler: ((status: ConnectionStatus) => void) | null = null;
  public status: ConnectionStatus = 'disconnected';
  
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  private setStatus(status: ConnectionStatus) {
    if (this.status !== status) {
      this.status = status;
      this.onStatusChangeHandler?.(status);
    }
  }

  async connect(gigId: string, userId: string, isHost: boolean): Promise<void> {
    this.gigId = gigId;
    this.userId = userId;
    this.isHost = isHost;
    
    this.setStatus('connecting');
    
    const supabase = createClient();
    this.channel = supabase.channel(`gig-sync-${gigId}`);
    
    this.channel.on('broadcast', { event: 'sync' }, (payload) => {
      const msg = payload.payload as SyncMessage;
      if (this.onMessageHandler) {
        if (msg.type === 'PING') {
           this.send({ type: 'PONG', from: this.userId!, timestamp: Date.now() });
        }
        this.onMessageHandler(msg);
      }
    });
    
    return new Promise((resolve, reject) => {
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected');
          this.startHeartbeat();
          resolve();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.setStatus('disconnected');
          this.stopHeartbeat();
          reject(new Error(`Supabase realtime error: ${status}`));
        }
      });
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    
    this.setStatus('disconnected');
    this.gigId = null;
    this.userId = null;
  }

  send(message: SyncMessage): void {
    if (!this.channel || this.status !== 'connected') return;
    
    this.channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: message,
    });
  }

  onMessage(handler: (message: SyncMessage) => void): void {
    this.onMessageHandler = handler;
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): void {
    this.onStatusChangeHandler = handler;
  }
  
  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.userId) {
        this.send({ type: 'PING', from: this.userId, timestamp: Date.now() });
      }
    }, 5000);
  }
  
  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
