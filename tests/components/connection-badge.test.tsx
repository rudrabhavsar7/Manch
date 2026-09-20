import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionBadge } from '@/components/gigs/connection-badge';
import { useSyncStore } from '@/stores/sync-store';

describe('ConnectionBadge', () => {
  beforeEach(() => {
    useSyncStore.setState({ transport: 'none', connectionStatus: 'disconnected' });
  });

  it('renders Offline by default', () => {
    render(<ConnectionBadge />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders LAN when transport is webrtc', () => {
    useSyncStore.setState({ transport: 'webrtc', connectionStatus: 'connected' });
    render(<ConnectionBadge />);
    expect(screen.getByText('LAN')).toBeInTheDocument();
  });

  it('renders Cloud when transport is supabase', () => {
    useSyncStore.setState({ transport: 'supabase', connectionStatus: 'connected' });
    render(<ConnectionBadge />);
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });

  it('has pulse animation when connecting', () => {
    useSyncStore.setState({ transport: 'webrtc', connectionStatus: 'connecting' });
    render(<ConnectionBadge />);
    expect(screen.getByText('LAN')).toHaveClass('animate-pulse');
  });
});
