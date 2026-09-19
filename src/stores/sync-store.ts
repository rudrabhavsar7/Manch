import { create } from 'zustand';
import { ConnectionStatus } from '../lib/sync/message-types';

interface SyncState {
  transport: 'webrtc' | 'supabase' | 'none';
  connectionStatus: ConnectionStatus;
  
  setTransport: (transport: 'webrtc' | 'supabase' | 'none') => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  transport: 'none',
  connectionStatus: 'disconnected',
  
  setTransport: (transport) => set({ transport }),
  setConnectionStatus: (status) => set({ connectionStatus: status })
}));
