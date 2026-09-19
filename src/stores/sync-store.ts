import { create } from 'zustand';
import { ConnectionStatus, TransportType } from '../lib/sync/message-types';

interface SyncState {
  transport: TransportType;
  connectionStatus: ConnectionStatus;
  
  setTransport: (transport: TransportType) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  transport: 'none',
  connectionStatus: 'disconnected',
  
  setTransport: (transport) => set({ transport }),
  setConnectionStatus: (status) => set({ connectionStatus: status })
}));
