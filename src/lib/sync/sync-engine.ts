import { SyncMessage, ConnectionStatus, TransportProvider } from './message-types';
import { WebRTCProvider } from './webrtc-provider';
import { SupabaseRealtimeProvider } from './supabase-provider';

export class SyncEngine {
  private webrtc: WebRTCProvider;
  private supabase: SupabaseRealtimeProvider;
  public activeTransport: TransportProvider | null = null;
  
  private onMessageHandler: ((msg: SyncMessage) => void) | null = null;
  private onStatusChangeHandler: ((status: ConnectionStatus, transport: 'webrtc' | 'supabase' | 'none') => void) | null = null;
  
  constructor(webrtc?: TransportProvider, supabase?: TransportProvider) {
    this.webrtc = (webrtc as WebRTCProvider) || new WebRTCProvider();
    this.supabase = (supabase as SupabaseRealtimeProvider) || new SupabaseRealtimeProvider();
    
    this.webrtc.onMessage(this.handleMessage.bind(this));
    this.supabase.onMessage(this.handleMessage.bind(this));
    
    this.webrtc.onStatusChange((status) => this.handleTransportStatusChange('webrtc', status));
    this.supabase.onStatusChange((status) => this.handleTransportStatusChange('supabase', status));
  }
  
  async connect(gigId: string, userId: string, isHost: boolean): Promise<void> {
    try {
      this.onStatusChangeHandler?.('connecting', 'webrtc');
      await this.webrtc.connect(gigId, userId, isHost);
      this.activeTransport = this.webrtc;
      
      this.supabase.connect(gigId, userId, isHost).catch(e => {
        console.warn('Fallback Supabase failed to connect', e);
      });
    } catch (e) {
      console.warn('WebRTC connection failed, falling back to Supabase', e);
      this.activeTransport = this.supabase;
      this.onStatusChangeHandler?.('connecting', 'supabase');
      await this.supabase.connect(gigId, userId, isHost);
      this.activeTransport = this.supabase;
      this.onStatusChangeHandler?.('connected', 'supabase');
    }
  }

  disconnect(): void {
    this.webrtc.disconnect();
    this.supabase.disconnect();
    this.activeTransport = null;
    this.onStatusChangeHandler?.('disconnected', 'none');
  }
  
  send(message: SyncMessage): void {
    if (this.activeTransport) {
      this.activeTransport.send(message);
    }
  }

  onMessage(handler: (message: SyncMessage) => void): void {
    this.onMessageHandler = handler;
  }

  onStatusChange(handler: (status: ConnectionStatus, transport: 'webrtc' | 'supabase' | 'none') => void): void {
    this.onStatusChangeHandler = handler;
  }
  
  private handleMessage(msg: SyncMessage) {
    if (this.onMessageHandler) {
      this.onMessageHandler(msg);
    }
  }
  
  private handleTransportStatusChange(transportType: 'webrtc' | 'supabase', status: ConnectionStatus) {
    if (transportType === 'webrtc') {
      if (status === 'connected') {
        this.activeTransport = this.webrtc;
        this.onStatusChangeHandler?.('connected', 'webrtc');
      } else if (status === 'disconnected' || status === 'reconnecting') {
        this.activeTransport = this.supabase;
        this.onStatusChangeHandler?.(this.supabase.status, 'supabase');
      } else {
        if (this.activeTransport === this.webrtc) {
          this.onStatusChangeHandler?.(status, 'webrtc');
        }
      }
    } else if (transportType === 'supabase') {
      if (this.activeTransport === this.supabase) {
        this.onStatusChangeHandler?.(status, 'supabase');
      }
    }
  }
}
