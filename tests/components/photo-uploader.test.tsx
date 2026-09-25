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
});
