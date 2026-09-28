import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUploader, type PhotoItem } from '@/components/songs/photo-uploader';

describe('PhotoUploader', () => {
  const existingItem: PhotoItem = {
    kind: 'existing',
    id: 'photo-1',
    storagePath: 'user-1/song-1/a.jpg',
    url: 'https://example.com/a.jpg',
  };

  const pendingItem: PhotoItem = {
    kind: 'pending',
    file: new File(['x'], 'page2.jpg', { type: 'image/jpeg' }),
    url: 'blob:preview-2',
  };

  it('renders upload button and item thumbnails', () => {
    render(
      <PhotoUploader
        items={[existingItem, pendingItem]}
        onAddFiles={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /add photos/i })).toBeInTheDocument();
    expect(screen.getByAltText(/photo page 1/i)).toBeInTheDocument();
    expect(screen.getByAltText(/photo page 2/i)).toBeInTheDocument();
    expect(screen.getByText(/new/i)).toBeInTheDocument();
  });

  it('calls onAddFiles with selected files', async () => {
    const onAddFiles = vi.fn();
    render(
      <PhotoUploader items={[]} onAddFiles={onAddFiles} onRemove={vi.fn()} onMove={vi.fn()} />,
    );

    const file = new File(['data'], 'lyrics.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('photo-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    expect(onAddFiles).toHaveBeenCalledWith([file]);
  });

  it('calls onRemove with index when remove clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <PhotoUploader
        items={[existingItem, pendingItem]}
        onAddFiles={vi.fn()}
        onRemove={onRemove}
        onMove={vi.fn()}
      />,
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove photo/i });
    await user.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('calls onMove with index and direction', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <PhotoUploader
        items={[existingItem, pendingItem]}
        onAddFiles={vi.fn()}
        onRemove={vi.fn()}
        onMove={onMove}
      />,
    );

    const upButtons = screen.getAllByRole('button', { name: /move photo up/i });
    await user.click(upButtons[1]);
    expect(onMove).toHaveBeenCalledWith(1, -1);

    const downButtons = screen.getAllByRole('button', { name: /move photo down/i });
    await user.click(downButtons[0]);
    expect(onMove).toHaveBeenCalledWith(0, 1);
  });

  it('disables controls when disabled', () => {
    render(
      <PhotoUploader
        items={[existingItem]}
        disabled
        onAddFiles={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /add photos/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove photo/i })).toBeDisabled();
  });

  it('renders empty state prompt when no items', () => {
    render(
      <PhotoUploader items={[]} onAddFiles={vi.fn()} onRemove={vi.fn()} onMove={vi.fn()} />,
    );
    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
  });

  it('controls are visible on touch and hover-reveal only on hover-capable devices', () => {
    const { container } = render(
      <PhotoUploader
        items={[existingItem]}
        onAddFiles={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
      />,
    );

    const overlay = container.querySelector('div.absolute.inset-0');
    expect(overlay).toBeTruthy();
    expect(overlay).toHaveClass('opacity-100');
    expect(overlay).toHaveClass('[@media(hover:hover)]:opacity-0');
    expect(overlay).toHaveClass('[@media(hover:hover)]:group-hover:opacity-100');
    expect(overlay).toHaveClass('[@media(hover:none)]:top-auto');
    expect(overlay).toHaveClass('[@media(hover:none)]:bottom-0');
    expect(overlay).toHaveClass('[@media(hover:none)]:inset-x-0');
    expect(overlay).toHaveClass('[@media(hover:none)]:h-11');

    for (const name of [/move photo up/i, /move photo down/i, /remove photo/i]) {
      const btn = screen.getByRole('button', { name });
      expect(btn).toHaveClass('[@media(hover:none)]:h-9');
      expect(btn).toHaveClass('[@media(hover:none)]:w-9');
    }
  });
});
