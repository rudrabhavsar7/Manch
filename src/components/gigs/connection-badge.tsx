import { Radio, Wifi, WifiOff } from 'lucide-react';
import { useSyncStore } from '@/stores/sync-store';
import { Badge } from '@/components/ui/badge';

export function ConnectionBadge() {
  const { transport, connectionStatus } = useSyncStore();

  const isConnecting = connectionStatus === 'connecting' || connectionStatus === 'reconnecting';

  if (transport === 'webrtc') {
    return (
      <Badge variant="outline" className={`border-green-500 text-green-500 bg-green-500/10 ${isConnecting ? 'animate-pulse' : ''}`}>
        <Radio className="w-3 h-3 mr-1" />
        LAN
      </Badge>
    );
  }

  if (transport === 'supabase') {
    return (
      <Badge variant="outline" className={`border-blue-500 text-blue-500 bg-blue-500/10 ${isConnecting ? 'animate-pulse' : ''}`}>
        <Wifi className="w-3 h-3 mr-1" />
        Cloud
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={isConnecting ? 'animate-pulse' : ''}>
      <WifiOff className="w-3 h-3 mr-1" />
      Offline
    </Badge>
  );
}
