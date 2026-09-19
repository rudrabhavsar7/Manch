export type SyncMessage =
  | { type: 'SONG_CHANGE'; songId: string; timestamp: number }
  | { type: 'SCROLL_SYNC'; position: number; percentage: number }
  | { type: 'SETLIST_UPDATE'; songIds: string[] }
  | { type: 'MEMBER_ROLE'; userId: string; role: 'co-admin' | 'musician' }
  | { type: 'GIG_STATUS'; status: 'live' | 'paused' | 'ended' }
  | { type: 'GIG_STATE_REQUEST'; from: string }
  | { type: 'GIG_STATE_RESPONSE'; activeSongId: string | null; songIds: string[]; status: 'live' | 'paused' | 'ended' }
  | { type: 'PING'; from: string }
  | { type: 'PONG'; from: string };

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface TransportProvider {
  type: 'webrtc' | 'supabase';
  connect(gigId: string, userId: string, isHost: boolean): Promise<void>;
  disconnect(): void;
  send(message: SyncMessage): void;
  onMessage(handler: (message: SyncMessage) => void): void;
  onStatusChange(handler: (status: ConnectionStatus) => void): void;
}
