import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongDisplay } from '@/components/live/song-display';
import { Tables } from '@/types/database';

// Mock child components
vi.mock('@/components/live/transpose-control', () => ({
  TransposeControl: () => <div data-testid="mock-transpose" />
}));
vi.mock('@/components/live/font-size-control', () => ({
  FontSizeControl: () => <div data-testid="mock-font-size" />
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
  it('renders "No song selected" when song is null', () => {
    render(<SongDisplay song={null} isAdmin={false} />);
    expect(screen.getByText('No song selected')).toBeInTheDocument();
  });

  it('renders song details and controls', () => {
    render(<SongDisplay song={mockSong} isAdmin={true} />);
    expect(screen.getByText('Wonderwall')).toHaveClass('truncate');
    expect(screen.getByText('Oasis')).toBeInTheDocument();
    expect(screen.getByText('88 BPM')).toBeInTheDocument();
    expect(screen.getByText('Em')).toBeInTheDocument();
    
    expect(screen.queryByTestId('mock-transpose')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-font-size')).toBeInTheDocument();
    expect(screen.getByTestId('mock-auto-scroll')).toBeInTheDocument();
    expect(screen.getByTestId('mock-song-renderer')).toHaveTextContent('Today is gonna be the day');
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

  it('navigates multiple photos with prev/next and shows counter', async () => {
    const user = userEvent.setup();
    const photos = [
      { id: 'p1', url: 'https://example.com/1.jpg' },
      { id: 'p2', url: 'https://example.com/2.jpg' },
    ];
    render(<SongDisplay song={mockSong} isAdmin={true} photos={photos} />);

    await user.click(screen.getByTestId('view-toggle'));

    expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');

    await user.click(screen.getByTestId('photo-next'));
    expect(screen.getByTestId('photo-counter')).toHaveTextContent('2/2');
    expect(screen.getByAltText(/song photo/i)).toHaveAttribute('src', 'https://example.com/2.jpg');

    await user.click(screen.getByTestId('photo-prev'));
    expect(screen.getByTestId('photo-counter')).toHaveTextContent('1/2');
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

describe('SongDisplay photo zoom & fullscreen', () => {
  let fullscreenElementMock: Element | null = null;

  const photoOnlySong = { ...mockSong, content: '' };
  const photos = [
    { id: 'p1', url: 'https://example.com/1.jpg' },
    { id: 'p2', url: 'https://example.com/2.jpg' },
  ];

  beforeEach(() => {
    fullscreenElementMock = null;
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElementMock,
    });
  });

  it('shows zoom toolbar with level readout in photo mode', () => {
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);

    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
    expect(screen.getByTestId('photo-zoom-in')).toBeInTheDocument();
    expect(screen.getByTestId('photo-zoom-out')).toBeDisabled();
    expect(screen.getByTestId('photo-zoom-reset')).toBeDisabled();
    expect(screen.getByTestId('photo-fullscreen')).toBeInTheDocument();
  });

  it('wheel zooms in and out', () => {
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);
    const viewer = screen.getByTestId('photo-viewer');

    fireEvent.wheel(viewer, { deltaY: -100 });
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('110%');

    fireEvent.wheel(viewer, { deltaY: 100 });
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
  });

  it('zoom buttons adjust level and fit resets to 100%', () => {
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);

    fireEvent.click(screen.getByTestId('photo-zoom-in'));
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('125%');
    expect(screen.getByTestId('photo-zoom-out')).toBeEnabled();
    expect(screen.getByTestId('photo-zoom-reset')).toBeEnabled();

    fireEvent.click(screen.getByTestId('photo-zoom-out'));
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');

    fireEvent.wheel(screen.getByTestId('photo-viewer'), { deltaY: -100 });
    fireEvent.wheel(screen.getByTestId('photo-viewer'), { deltaY: -100 });
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('121%');
    fireEvent.click(screen.getByTestId('photo-zoom-reset'));
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
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

    fireEvent.wheel(viewer, { deltaY: -100 });
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('110%');

    fireEvent.click(screen.getByTestId('photo-next'));
    expect(screen.getByTestId('photo-zoom-level')).toHaveTextContent('100%');
  });

  it('enters and exits fullscreen', async () => {
    const user = userEvent.setup();
    render(<SongDisplay song={photoOnlySong} isAdmin={true} photos={photos} />);
    const viewer = screen.getByTestId('photo-viewer');

    await user.click(screen.getByTestId('photo-fullscreen'));
    expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalledTimes(1);

    fullscreenElementMock = viewer;
    act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
    expect(viewer).toHaveAttribute('data-fullscreen', 'true');

    await user.click(screen.getByTestId('photo-fullscreen'));
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);

    fullscreenElementMock = null;
    act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
    expect(viewer).toHaveAttribute('data-fullscreen', 'false');
  });

  it('hides font size and auto scroll controls in photo mode', async () => {
    const user = userEvent.setup();
    render(<SongDisplay song={mockSong} isAdmin={true} photos={[{ id: 'p1', url: 'https://example.com/1.jpg' }]} />);

    expect(screen.getByTestId('mock-font-size')).toBeInTheDocument();
    expect(screen.getByTestId('mock-auto-scroll')).toBeInTheDocument();

    await user.click(screen.getByTestId('view-toggle'));

    expect(screen.queryByTestId('mock-font-size')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-auto-scroll')).not.toBeInTheDocument();
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
  });

  it('fullscreen shows song navigation for admin and switches song', async () => {
    const user = userEvent.setup();
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
      />
    );

    await user.click(screen.getByTestId('view-toggle'));
    expect(screen.queryByTestId('photo-song-next')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('photo-fullscreen'));
    act(() => {
      fullscreenElementMock = screen.getByTestId('photo-viewer');
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(screen.getByTestId('photo-song-counter')).toHaveTextContent('2/3');
    await user.click(screen.getByTestId('photo-song-next'));
    expect(onSongSelect).toHaveBeenCalledWith('s3');
    await user.click(screen.getByTestId('photo-song-prev'));
    expect(onSongSelect).toHaveBeenCalledWith('s1');
  });

  it('fullscreen song navigation hidden for musicians', async () => {
    const user = userEvent.setup();
    const songs = [
      { ...mockSong, id: 's1', title: 'First' },
      { ...mockSong, id: 's2', title: 'Second' },
    ];
    render(
      <SongDisplay
        song={songs[0]}
        isAdmin={false}
        photos={[{ id: 'p1', url: 'https://example.com/1.jpg' }]}
        songs={songs}
        onSongSelect={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('view-toggle'));
    await user.click(screen.getByTestId('photo-fullscreen'));
    act(() => {
      fullscreenElementMock = screen.getByTestId('photo-viewer');
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(screen.queryByTestId('photo-song-next')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-song-prev')).not.toBeInTheDocument();
  });
});
