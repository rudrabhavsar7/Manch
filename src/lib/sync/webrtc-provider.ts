import { SyncMessage, ConnectionStatus, TransportProvider } from './message-types';
import { WebRTCSignaling, SignalMessage } from './signaling';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ]
};

export class WebRTCProvider implements TransportProvider {
  type = 'webrtc' as const;
  
  private gigId: string | null = null;
  private userId: string | null = null;
  private isHost: boolean = false;
  
  private peers: Map<string, RTCPeerConnection> = new Map();
  private channels: Map<string, RTCDataChannel> = new Map();
  
  private onMessageHandler: ((msg: SyncMessage) => void) | null = null;
  private onStatusChangeHandler: ((status: ConnectionStatus) => void) | null = null;
  
  private signaling: WebRTCSignaling;
  public status: ConnectionStatus = 'disconnected';
  
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    this.signaling = new WebRTCSignaling();
    this.signaling.onSignal(this.handleSignal.bind(this));
  }
  
  private setStatus(status: ConnectionStatus) {
    if (this.status !== status) {
      this.status = status;
      this.onStatusChangeHandler?.(status);
    }
  }

  private connectPromiseResolve: (() => void) | null = null;
  private connectPromiseReject: ((err: Error) => void) | null = null;

  async connect(gigId: string, userId: string, isHost: boolean): Promise<void> {
    this.gigId = gigId;
    this.userId = userId;
    this.isHost = isHost;
    
    this.setStatus('connecting');
    
    return new Promise((resolve, reject) => {
      let isResolved = false;
      this.connectPromiseResolve = () => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeout);
        resolve();
      };
      this.connectPromiseReject = (err: Error) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeout);
        this.setStatus('disconnected');
        reject(err);
      };

      const timeout = setTimeout(() => {
        if (!isResolved) {
          this.connectPromiseReject?.(new Error('WebRTC connection timeout'));
        }
      }, 7000);

      this.signaling.connect(gigId, userId).then(() => {
        if (!isHost) {
          this.signaling.send({ type: 'JOIN', from: userId });
        }
        // Wait for DataChannel to open to resolve
      }).catch(e => {
        this.connectPromiseReject?.(e);
      });
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.signaling.disconnect();
    
    this.peers.forEach(peer => peer.close());
    this.peers.clear();
    this.channels.clear();
    
    this.setStatus('disconnected');
    this.gigId = null;
    this.userId = null;
  }

  send(message: SyncMessage): void {
    const data = JSON.stringify(message);
    this.channels.forEach(channel => {
      if (channel.readyState === 'open') {
        channel.send(data);
      }
    });
  }

  onMessage(handler: (message: SyncMessage) => void): void {
    this.onMessageHandler = handler;
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): void {
    this.onStatusChangeHandler = handler;
  }
  
  private async handleSignal(msg: SignalMessage) {
    if (!this.userId) return;
    
    if (msg.type === 'JOIN' && this.isHost) {
      const peerId = msg.from;
      const pc = this.createPeerConnection(peerId);
      
      const channel = pc.createDataChannel('sync');
      this.setupDataChannel(peerId, channel);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.signaling.send({
        type: 'OFFER',
        from: this.userId,
        to: peerId,
        sdp: offer
      });
    }
    else if (msg.type === 'OFFER' && msg.to === this.userId) {
      const peerId = msg.from;
      const pc = this.createPeerConnection(peerId);
      
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
      
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.signaling.send({
        type: 'ANSWER',
        from: this.userId,
        to: peerId,
        sdp: answer
      });
    }
    else if (msg.type === 'ANSWER' && msg.to === this.userId) {
      const pc = this.peers.get(msg.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      }
    }
    else if (msg.type === 'ICE_CANDIDATE' && msg.to === this.userId) {
      const pc = this.peers.get(msg.from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
    }
  }
  
  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(peerId, pc);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && this.userId) {
        this.signaling.send({
          type: 'ICE_CANDIDATE',
          from: this.userId,
          to: peerId,
          candidate: event.candidate.toJSON()
        });
      }
    };
    
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.peers.delete(peerId);
        this.channels.delete(peerId);
        this.updateOverallStatus();
      }
    };
    
    return pc;
  }
  
  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    this.channels.set(peerId, channel);
    
    channel.onopen = () => {
      this.updateOverallStatus();
    };
    
    channel.onclose = () => {
      this.channels.delete(peerId);
      this.updateOverallStatus();
    };
    
    channel.onmessage = (event) => {
      if (this.onMessageHandler) {
        try {
          const msg = JSON.parse(event.data) as SyncMessage;
          if (msg.type === 'PING') {
            channel.send(JSON.stringify({ type: 'PONG', from: this.userId, timestamp: Date.now() }));
            return;
          }
          
          if (this.isHost) {
            // Rebroadcast to all other peers
            this.channels.forEach((otherChannel, otherPeerId) => {
              if (otherPeerId !== peerId && otherChannel.readyState === 'open') {
                otherChannel.send(event.data);
              }
            });
          }
          
          this.onMessageHandler(msg);
        } catch (e) {
          console.error('Failed to parse WebRTC message', e);
        }
      }
    };
  }
  
  private updateOverallStatus() {
    let hasOpen = false;
    this.channels.forEach(channel => {
      if (channel.readyState === 'open') hasOpen = true;
    });
    
    if (hasOpen) {
      if (this.status !== 'connected') {
        this.setStatus('connected');
        this.startHeartbeat();
        this.connectPromiseResolve?.();
      }
    } else {
      if (this.status === 'connected') {
        this.setStatus('reconnecting');
        if (this.userId && !this.isHost) {
          this.signaling.send({ type: 'JOIN', from: this.userId });
        }
      }
    }
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
