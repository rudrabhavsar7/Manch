export type TransportType = 'webrtc' | 'supabase' | 'none';

export type SyncMessage =
  | { type: 'SONG_CHANGE'; songId: string; timestamp: number }
  | { type: 'SCROLL_SYNC'; position: number; percentage: number; timestamp: number }
  | { type: 'SETLIST_UPDATE'; songIds: string[]; timestamp: number }
  | { type: 'MEMBER_ROLE'; userId: string; role: 'co-admin' | 'musician'; timestamp: number }
  | { type: 'GIG_STATUS'; status: 'live' | 'paused' | 'ended'; timestamp: number }
  | { type: 'GIG_STATE_REQUEST'; from: string; timestamp: number }
  | { type: 'GIG_STATE_RESPONSE'; activeSongId: string | null; songIds: string[]; status: 'live' | 'paused' | 'ended'; timestamp: number }
  | { type: 'PING'; from: string; timestamp: number }
  | { type: 'PONG'; from: string; timestamp: number };

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface TransportProvider {
  type: 'webrtc' | 'supabase';
  status: ConnectionStatus;
  connect(gigId: string, userId: string, isHost: boolean): Promise<void>;
  disconnect(): void;
  send(message: SyncMessage): void;
  onMessage(handler: (message: SyncMessage) => void): void;
  onStatusChange(handler: (status: ConnectionStatus) => void): void;
}
