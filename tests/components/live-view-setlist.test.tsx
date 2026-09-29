import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveView } from '@/components/live/live-view';
import { useGigStore } from '@/stores/gig-store';
import type { Tables } from '@/types/database';

const { pushMock, sendMock, cacheGigStateMock, dbState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  sendMock: vi.fn(),
  cacheGigStateMock: vi.fn().mockResolvedValue(undefined),
  dbState: {
    responses: {} as Record<string, unknown>,
    calls: [] as { table: string; method: string; args: unknown[] }[],
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/gigs/gig-1',
}));

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'update', 'insert', 'delete', 'eq', 'order', 'in', 'single']) {
        builder[method] = (...args: unknown[]) => {
          dbState.calls.push({ table, method, args });
          return builder;
        };
      }
      const payload = () =>
        Promise.resolve((dbState.responses[table] as Record<string, unknown>) ?? {});
      builder.then = (onFulfilled: unknown, onRejected: unknown) =>
        payload().then(onFulfilled as never, onRejected as never);
      builder.catch = (onRejected: unknown) => payload().catch(onRejected as never);
      return builder;
    },
  }),
}));

vi.mock('@/hooks/use-sync', () => ({
  useSync: () => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    send: sendMock,
  }),
}));

vi.mock('@/hooks/use-song-photos', () => ({
  useSongPhotos: () => [],
}));

vi.mock('@/lib/offline/cache-manager', () => ({
  CacheManager: { cacheGigState: cacheGigStateMock },
}));

vi.mock('@/components/live/song-display', () => ({
  SongDisplay: () => <div data-testid="mock-song-display" />,
}));
vi.mock('@/components/live/admin-controls', () => ({
  AdminControls: () => <div data-testid="mock-admin-controls" />,
}));
vi.mock('@/components/live/musician-controls', () => ({
  MusicianControls: () => <div data-testid="mock-musician-controls" />,
}));
vi.mock('@/components/live/member-list', () => ({
  MemberList: () => <div data-testid="mock-member-list" />,
}));
vi.mock('@/components/gigs/connection-badge', () => ({
  ConnectionBadge: () => <div data-testid="mock-connection-badge" />,
}));

type Gig = Tables<'gigs'>;
type Song = Tables<'songs'>;

const song = (id: string): Song => ({
  id,
  title: `Song ${id}`,
  artist: 'Test Artist',
  key: '',
  bpm: null,
  content: '',
  structure: [],
  owner_id: 'user-1',
  created_at: '',
  updated_at: '',
});

const mockGig: Gig = {
  id: 'gig-1',
  name: 'Queue Gig',
  admin_id: 'user-1',
  setlist_id: 'sl-1',
  pin: '5678',
  status: 'live',
  created_at: '',
  ended_at: null,
};

const queue = [
  { id: 'q1', setlistId: 'sl-1', name: 'Opening' },
  { id: 'q2', setlistId: 'sl-2', name: 'Timli Set' },
];

function renderLive(myRole: 'admin' | 'co-admin' | 'musician' = 'admin') {
  return render(
    <LiveView
      gig={mockGig}
      songs={[song('s1')]}
      songIds={['s1']}
      myRole={myRole}
      userId="user-1"
      queue={queue}
    />
  );
}

describe('LiveView setlist queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGigStore.setState(useGigStore.getInitialState());
    dbState.responses = {};
    dbState.calls = [];
  });

  it('switches active setlist: updates gig, store, broadcasts and caches', async () => {
    const user = userEvent.setup();
    dbState.responses['setlist_songs'] = {
      data: [{ song_id: 's3', songs: song('s3') }],
    };

    renderLive();

    await waitFor(() => {
      expect(useGigStore.getState().activeSetlistId).toBe('sl-1');
    });

    await user.click(screen.getByRole('button', { name: 'Timli Set' }));

    await waitFor(() => {
      const state = useGigStore.getState();
      expect(state.activeSetlistId).toBe('sl-2');
      expect(state.songIds).toEqual(['s3']);
      expect(state.songs.map((s) => s.id)).toEqual(['s3']);
      expect(state.activeSongId).toBe('s3');
    });

    const update = dbState.calls.find((c) => c.table === 'gigs' && c.method === 'update');
    expect(update).toBeDefined();
    expect(update!.args[0]).toEqual({ setlist_id: 'sl-2' });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SETLIST_UPDATE',
        setlistId: 'sl-2',
        songIds: ['s3'],
      })
    );
    expect(cacheGigStateMock).toHaveBeenCalledWith('gig-1', 'sl-2', ['s3']);
  });

  it('adds a setlist to the queue via dialog', async () => {
    const user = userEvent.setup();
    dbState.responses['setlists'] = {
      data: [
        {
          id: 'sl-9',
          name: 'Encore Set',
          owner_id: 'user-1',
          privacy: 'private',
          created_at: '',
          updated_at: '',
        },
      ],
    };
    dbState.responses['gig_setlists'] = {
      data: { id: 'q-new', gig_id: 'gig-1', setlist_id: 'sl-9', setlist_name: 'Encore Set', position: 2 },
    };

    renderLive();
    await waitFor(() => {
      expect(useGigStore.getState().queue).toHaveLength(2);
    });

    await user.click(screen.getByRole('button', { name: 'Add setlist' }));
    await user.click(await screen.findByRole('button', { name: 'Encore Set' }));

    await waitFor(() => {
      expect(useGigStore.getState().queue).toHaveLength(3);
    });

    const insert = dbState.calls.find((c) => c.table === 'gig_setlists' && c.method === 'insert');
    expect(insert).toBeDefined();
    expect(insert!.args[0]).toEqual(
      expect.objectContaining({
        gig_id: 'gig-1',
        setlist_id: 'sl-9',
        setlist_name: 'Encore Set',
        position: 2,
      })
    );
  });

  it('removes a non-active setlist from the queue', async () => {
    const user = userEvent.setup();

    renderLive();
    await waitFor(() => {
      expect(useGigStore.getState().queue).toHaveLength(2);
    });

    await user.click(screen.getByRole('button', { name: 'Remove Timli Set' }));

    await waitFor(() => {
      expect(useGigStore.getState().queue.map((q) => q.id)).toEqual(['q1']);
    });

    const del = dbState.calls.find((c) => c.table === 'gig_setlists' && c.method === 'delete');
    expect(del).toBeDefined();
    const eqCall = dbState.calls.find(
      (c) => c.table === 'gig_setlists' && c.method === 'eq' && c.args[0] === 'id' && c.args[1] === 'q2'
    );
    expect(eqCall).toBeDefined();
  });

  it('shows queue tabs only for admins', async () => {
    const { unmount } = renderLive('admin');
    expect(screen.getAllByTestId('queue-tabs').length).toBeGreaterThan(0);
    unmount();

    renderLive('musician');
    expect(screen.queryByTestId('queue-tabs')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('active-setlist-name')[0]).toHaveTextContent('Opening');
  });
});
