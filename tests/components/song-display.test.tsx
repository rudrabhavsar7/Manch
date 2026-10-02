import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongDisplay } from '@/components/live/song-display';
import { Tables } from '@/types/database';
import { useUIStore } from '@/stores/ui-store';

// Mock child components
vi.mock('@/components/live/transpose-control', () => ({
  TransposeControl: () => <div data-testid="mock-transpose" />
}));
vi.mock('@/components/live/auto-scroll', () => ({
  AutoScroll: () => <div data-testid="mock-auto-scroll" />
}));
vi.mock('@/components/songs/song-renderer', () => ({
  SongRenderer: ({ content }: { content: string }) => <div data-testid="mock-song-renderer">{content}</div>
}));

type Song = Tables<'songs'>;

const mockSong: Song = {
  id: '1',
  title: 'Wonderwall',
  artist: 'Oasis',
  key: 'Em',
  bpm: 88,
  content: 'Today is gonna be the day',
  structure: [],
  owner_id: 'user-1',
  created_at: '',
  updated_at: ''
};

describe('SongDisplay', () => {
  beforeEach(() => {
    useUIStore.setState({
      photoScale: 1,
      photoIndex: 0,
      photoCount: 0,
      isViewingPhoto: false,
    });
  });

  it('renders "No song selected" when song is null', () => {
    render(<SongDisplay song={null} isAdmin={false} />);
    expect(screen.getByText('No song selected')).toBeInTheDocument();
    expect(useUIStore.getState().isViewingPhoto).toBe(false);
  });

  it('handles transition from null song to selected song without hook order errors', () => {
    const { rerender } = render(<SongDisplay song={null} isAdmin={true} />);
    expect(screen.getByText('No song selected')).toBeInTheDocument();
    expect(useUIStore.getState().isViewingPhoto).toBe(false);

    rerender(<SongDisplay song={mockSong} isAdmin={true} />);
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toBeInTheDocument();
  });

  it('renders song details and controls without font-size in header', () => {
    render(<SongDisplay song={mockSong} isAdmin={true} />);
    expect(screen.getByText('Wonderwall')).toHaveClass('truncate');
    expect(screen.getByText('Oasis')).toBeInTheDocument();
    expect(screen.getByText('88 BPM')).toBeInTheDocument();
    expect(screen.getByText('Em')).toBeInTheDocument();
    
    expect(screen.queryByTestId('mock-transpose')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-font-size')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-auto-scroll')).toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toHaveTextContent('Today is gonna be the day');
    expect(useUIStore.getState().isViewingPhoto).toBe(false);
  });

  it('renders transpose control for musician', () => {
    render(<SongDisplay song={mockSong} isAdmin={false} />);
    expect(screen.getByTestId('mock-transpose')).toBeInTheDocument();
  });

  it('does not render view toggle when song has no photos', () => {
    render(<SongDisplay song={mockSong} isAdmin={true} photos={[]} />);
    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toBeInTheDocument();
  });

  it('shows toggle when both lyrics and photos exist, and switches views', async () => {
    const user = userEvent.setup();
    const photos = [
      { id: 'p1', url: 'https://example.com/1.jpg' },
      { id: 'p2', url: 'https://example.com/2.jpg' },
    ];
    render(<SongDisplay song={mockSong} isAdmin={true} photos={photos} />);

    const toggle = screen.getByTestId('view-toggle');
    expect(toggle).toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByTestId('photo-viewer')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-song-renderer')).not.toBeInTheDocument();
    expect(screen.getByAltText(/song photo/i)).toHaveAttribute('src', 'https://example.com/1.jpg');
  });

  it('synchronizes photo viewing and pagination with uiStore', async () => {
    const user = userEvent.setup();
    const photos = [
      { id: 'p1', url: 'https://example.com/1.jpg' },
      { id: 'p2', url: 'https://example.com/2.jpg' },
    ];
    render(<SongDisplay song={mockSong} isAdmin={true} photos={photos} />);

    expect(useUIStore.getState().isViewingPhoto).toBe(false);

    await user.click(screen.getByTestId('view-toggle'));

    expect(useUIStore.getState().isViewingPhoto).toBe(true);
    expect(useUIStore.getState().photoCount).toBe(2);
    expect(useUIStore.getState().photoIndex).toBe(0);
    expect(screen.getByAltText(/song photo/i)).toHaveAttribute('src', 'https://example.com/1.jpg');

    act(() => {
      useUIStore.getState().setPhotoIndex(1);
    });
    expect(screen.getByAltText(/song photo/i)).toHaveAttribute('src', 'https://example.com/2.jpg');

    act(() => {
      useUIStore.getState().setPhotoIndex(0);
    });
    expect(screen.getByAltText(/song photo/i)).toHaveAttribute('src', 'https://example.com/1.jpg');
  });

  it('shows photo directly for photo-only song (no lyrics) without toggle', () => {
    const photoOnlySong = { ...mockSong, content: '' };
    const photos = [{ id: 'p1', url: 'https://example.com/1.jpg' }];
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);

    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-viewer')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-song-renderer')).not.toBeInTheDocument();
  });

  it('shows lyrics directly when song has lyrics but no photos', () => {
    render(<SongDisplay song={mockSong} isAdmin={true} photos={[]} />);
    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer')).not.toBeInTheDocument();
  });
});

describe('SongDisplay photo zoom & immersive', () => {
  const photoOnlySong = { ...mockSong, content: '' };
  const photos = [
    { id: 'p1', url: 'https://example.com/1.jpg' },
    { id: 'p2', url: 'https://example.com/2.jpg' },
  ];

  function mockViewport(matchesPhone: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((q: string) => ({
        matches: matchesPhone,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  }

  afterEach(() => {
    // @ts-expect-error cleanup optional global
    delete window.matchMedia;
  });

  it('hides bottom cluster on desktop leaving sheet music clean and unobstructed', () => {
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);

    expect(screen.getByTestId('photo-viewer')).toHaveAttribute('data-immersive', 'false');
    expect(screen.queryByTestId('photo-zoom-level')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-zoom-in')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-prev')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-counter')).not.toBeInTheDocument();
    expect(useUIStore.getState().isViewingPhoto).toBe(true);
    expect(useUIStore.getState().photoScale).toBe(1);
  });

  it('wheel zooms in and out and syncs with uiStore', () => {
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);
    const viewer = screen.getByTestId('photo-viewer');
    const img = screen.getByAltText(/song photo/i);

    fireEvent.wheel(viewer, { deltaY: -100 });
    expect(useUIStore.getState().photoScale).toBeCloseTo(1.1);
    expect(img.style.transform).toContain('scale(1.1)');

    fireEvent.wheel(viewer, { deltaY: 100 });
    expect(useUIStore.getState().photoScale).toBe(1);
    expect(img.style.transform).toContain('scale(1)');
  });

  it('responds to store zoom changes and reset', () => {
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);
    const img = screen.getByAltText(/song photo/i);

    act(() => useUIStore.getState().setPhotoScale(1.25));
    expect(img.style.transform).toContain('scale(1.25)');

    act(() => useUIStore.getState().resetPhotoScale());
    expect(img.style.transform).toContain('scale(1)');

    const viewer = screen.getByTestId('photo-viewer');
    fireEvent.wheel(viewer, { deltaY: -100 });
    expect(img.style.transform).toContain('scale(1.1)');
    act(() => useUIStore.getState().resetPhotoScale());
    expect(img.style.transform).toContain('scale(1)');
  });

  it('pans image only when zoomed', () => {
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);
    const viewer = screen.getByTestId('photo-viewer');
    const img = screen.getByAltText(/song photo/i);

    fireEvent.pointerDown(viewer, { clientX: 100, clientY: 100, pointerId: 1, isPrimary: true });
    fireEvent.pointerMove(viewer, { clientX: 150, clientY: 120, pointerId: 1, isPrimary: true });
    fireEvent.pointerUp(viewer, { pointerId: 1, isPrimary: true });
    expect(img.style.transform).toBe('translate(0px, 0px) scale(1)');

    fireEvent.wheel(viewer, { deltaY: -100 });
    fireEvent.pointerDown(viewer, { clientX: 100, clientY: 100, pointerId: 1, isPrimary: true });
    fireEvent.pointerMove(viewer, { clientX: 150, clientY: 120, pointerId: 1, isPrimary: true });
    fireEvent.pointerUp(viewer, { pointerId: 1, isPrimary: true });
    expect(img.style.transform).toContain('translate(50px, 20px)');
    expect(img.style.transform).toContain('scale(1.1)');
  });

  it('resets zoom when switching photos', () => {
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);
    const viewer = screen.getByTestId('photo-viewer');
    const img = screen.getByAltText(/song photo/i);

    fireEvent.wheel(viewer, { deltaY: -100 });
    expect(useUIStore.getState().photoScale).toBeCloseTo(1.1);

    act(() => useUIStore.getState().setPhotoIndex(1));
    expect(useUIStore.getState().photoScale).toBe(1);
    expect(img.style.transform).toContain('scale(1)');
  });

  it('hides auto scroll controls in photo mode', async () => {
    const user = userEvent.setup();
    render(<SongDisplay song={mockSong} isAdmin={true} photos={[{ id: 'p1', url: 'https://example.com/1.jpg' }]} />);

    expect(screen.getByTestId('mock-auto-scroll')).toBeInTheDocument();

    await user.click(screen.getByTestId('view-toggle'));

    expect(screen.queryByTestId('mock-auto-scroll')).not.toBeInTheDocument();
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
  });

  it('renders immersive overlay on phone with title chip and controls', () => {
    mockViewport(true);
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);

    const viewer = screen.getByTestId('photo-viewer');
    expect(viewer).toHaveAttribute('data-immersive', 'true');
    expect(screen.getByTestId('photo-title-chip')).toHaveTextContent(photoOnlySong.title);
    // zoom lives in the sheet on phone, not the idle surface
    expect(screen.queryByTestId('photo-zoom-level')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-controls')).toBeInTheDocument();
  });

  it('minimize chip collapses phone immersive back to inline', () => {
    mockViewport(true);
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);

    expect(screen.getByTestId('photo-viewer')).toHaveAttribute('data-immersive', 'true');
    fireEvent.click(screen.getByTestId('photo-minimize'));
    expect(screen.getByTestId('photo-viewer')).toHaveAttribute('data-immersive', 'false');
    expect(screen.queryByTestId('photo-zoom-level')).not.toBeInTheDocument();
  });

  it('does not render song navigation in photo viewer (delegated to footer)', () => {
    const onSongSelect = vi.fn();
    const songs = [
      { ...mockSong, id: 's1', title: 'First' },
      { ...mockSong, id: 's2', title: 'Second' },
      { ...mockSong, id: 's3', title: 'Third' },
    ];
    render(
      <SongDisplay
        song={songs[1]}
        isAdmin={true}
        photos={[{ id: 'p1', url: 'https://example.com/1.jpg' }]}
        songs={songs}
        onSongSelect={onSongSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('view-toggle'));
    expect(screen.queryByTestId('photo-song-counter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-song-next')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-song-prev')).not.toBeInTheDocument();
  });

  it('horizontal swipe changes song for admin in photo mode', () => {
    mockViewport(true);
    const onSongSelect = vi.fn();
    const songs = [
      { ...mockSong, id: 's1', title: 'First' },
      { ...mockSong, id: 's2', title: 'Second' },
      { ...mockSong, id: 's3', title: 'Third' },
    ];
    render(
      <SongDisplay
        song={songs[1]}
        isAdmin={true}
        photos={[
          { id: 'p1', url: 'https://example.com/1.jpg' },
          { id: 'p2', url: 'https://example.com/2.jpg' },
        ]}
        songs={songs}
        onSongSelect={onSongSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('view-toggle'));
    const viewer = screen.getByTestId('photo-viewer');
    fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 400 }], changedTouches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 160, clientY: 404 }] });

    expect(onSongSelect).toHaveBeenCalledWith('s3');
    // photo stays put - swipe moves songs, not photos
    expect(useUIStore.getState().photoIndex).toBe(0);
  });

  it('horizontal swipe at the edge of the setlist does nothing', () => {
    mockViewport(true);
    const onSongSelect = vi.fn();
    const songs = [
      { ...mockSong, id: 's1', title: 'First' },
      { ...mockSong, id: 's2', title: 'Second' },
      { ...mockSong, id: 's3', title: 'Third' },
    ];
    render(
      <SongDisplay
        song={songs[2]}
        isAdmin={true}
        photos={[{ id: 'p1', url: 'https://example.com/1.jpg' }]}
        songs={songs}
        onSongSelect={onSongSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('view-toggle'));
    const viewer = screen.getByTestId('photo-viewer');
    fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 400 }], changedTouches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 160, clientY: 404 }] });

    expect(onSongSelect).not.toHaveBeenCalled();
  });

  it('musician horizontal swipe steps photos instead of songs', () => {
    mockViewport(true);
    const onSongSelect = vi.fn();
    const songs = [
      { ...mockSong, id: 's1', title: 'First' },
      { ...mockSong, id: 's2', title: 'Second' },
    ];
    render(
      <SongDisplay
        song={songs[0]}
        isAdmin={false}
        photos={[
          { id: 'p1', url: 'https://example.com/1.jpg' },
          { id: 'p2', url: 'https://example.com/2.jpg' },
        ]}
        songs={songs}
        onSongSelect={onSongSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('view-toggle'));
    const viewer = screen.getByTestId('photo-viewer');
    fireEvent.touchStart(viewer, { touches: [{ clientX: 300, clientY: 400 }], changedTouches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 160, clientY: 404 }] });

    expect(onSongSelect).not.toHaveBeenCalled();
    expect(useUIStore.getState().photoIndex).toBe(1);
    expect(screen.getByAltText(/song photo/i)).toHaveAttribute('src', 'https://example.com/2.jpg');
  });

  it('keeps photo mode when the song changes', () => {
    mockViewport(true);
    const songs = [
      { ...mockSong, id: 's1', title: 'First' },
      { ...mockSong, id: 's2', title: 'Second' },
    ];
    const photos = [
      { id: 'p1', url: 'https://example.com/1.jpg' },
      { id: 'p2', url: 'https://example.com/2.jpg' },
    ];
    const props = { isAdmin: true, photos, songs, onSongSelect: vi.fn() };
    const { rerender } = render(<SongDisplay song={songs[0]} {...props} />);

    fireEvent.click(screen.getByTestId('view-toggle'));
    expect(screen.getByTestId('photo-viewer')).toBeInTheDocument();

    rerender(<SongDisplay song={songs[1]} {...props} />);
    expect(screen.getByTestId('photo-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('photo-title-chip')).toHaveTextContent('Second');
  });

  it('resets collapsed photo state when the song changes', () => {
    mockViewport(true);
    const songs = [
      { ...mockSong, id: 's1', title: 'First' },
      { ...mockSong, id: 's2', title: 'Second' },
    ];
    const photos = [{ id: 'p1', url: 'https://example.com/1.jpg' }];
    const props = { isAdmin: true, photos, songs, onSongSelect: vi.fn() };
    const { rerender } = render(<SongDisplay song={songs[0]} {...props} />);

    fireEvent.click(screen.getByTestId('view-toggle'));
    fireEvent.click(screen.getByTestId('photo-minimize'));
    expect(screen.getByTestId('photo-viewer')).toHaveAttribute('data-immersive', 'false');

    rerender(<SongDisplay song={songs[1]} {...props} />);
    expect(screen.getByTestId('photo-viewer')).toHaveAttribute('data-immersive', 'true');
  });

  it('resets zoom and photo index on song change and view toggle', async () => {
    const user = userEvent.setup();
    const songs = [
      { ...mockSong, id: 's1', title: 'First' },
      { ...mockSong, id: 's2', title: 'Second' },
    ];
    const photos = [
      { id: 'p1', url: 'https://example.com/1.jpg' },
      { id: 'p2', url: 'https://example.com/2.jpg' },
    ];
    const props = { isAdmin: true, photos, songs, onSongSelect: vi.fn() };
    const { rerender } = render(<SongDisplay song={songs[0]} {...props} />);

    await user.click(screen.getByTestId('view-toggle'));
    expect(useUIStore.getState().isViewingPhoto).toBe(true);

    act(() => {
      useUIStore.getState().setPhotoScale(2);
    });
    expect(useUIStore.getState().photoScale).toBe(2);

    act(() => {
      useUIStore.getState().setPhotoIndex(1);
    });
    expect(useUIStore.getState().photoIndex).toBe(1);
    expect(useUIStore.getState().photoScale).toBe(1);

    // Zoom again on photo 1
    act(() => {
      useUIStore.getState().setPhotoScale(2);
    });
    expect(useUIStore.getState().photoScale).toBe(2);

    // Toggle view back to lyrics
    await user.click(screen.getByTestId('view-toggle'));
    expect(useUIStore.getState().photoScale).toBe(1);
    expect(useUIStore.getState().photoIndex).toBe(0);

    // Toggle back to photo and change song
    await user.click(screen.getByTestId('view-toggle'));
    act(() => {
      useUIStore.getState().setPhotoScale(2.5);
      useUIStore.getState().setPhotoIndex(1);
    });

    rerender(<SongDisplay song={songs[1]} {...props} />);
    expect(useUIStore.getState().photoScale).toBe(1);
    expect(useUIStore.getState().photoIndex).toBe(0);
  });
});
