'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImmersivePhotoViewer } from '@/components/photos/immersive-photo-viewer';
import { ImagePlus, X, ChevronUp, ChevronDown } from 'lucide-react';

export type PhotoItem =
  | {
      kind: 'existing';
      id: string;
      storagePath: string;
      url: string;
    }
  | {
      kind: 'pending';
      file: File;
      url: string;
    };

interface PhotoUploaderProps {
  items: PhotoItem[];
  disabled?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}

export function PhotoUploader({
  items,
  disabled = false,
  onAddFiles,
  onRemove,
  onMove,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const previewPhotos = items.map((item, index) => ({
    id: item.kind === 'existing' ? item.id : `pending-${index}`,
    url: item.url,
  }));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onAddFiles(files);
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-2" data-testid="photo-uploader">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-textSecondary">Photos</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="border-stageBorder text-textPrimary hover:bg-elevated"
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Add Photos
        </Button>
        <input
          ref={inputRef}
          data-testid="photo-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-textSecondary italic">No photos yet</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item, index) => (
            <div
              key={item.kind === 'existing' ? item.id : `pending-${index}`}
              className="relative group rounded-md overflow-hidden border border-stageBorder bg-elevated aspect-[3/4] cursor-pointer"
              onClick={() => setPreviewIndex(index)}
            >
              <img
                src={item.url}
                alt={`Photo page ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {item.kind === 'pending' && (
                <span className="absolute top-1 left-1 bg-stageAccent text-stageAccentForeground text-[10px] font-semibold px-1 rounded">
                  New
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:top-auto [@media(hover:none)]:bottom-0 [@media(hover:none)]:inset-x-0 [@media(hover:none)]:h-11 [@media(hover:none)]:bg-black/70 [@media(hover:none)]:gap-0 transition-opacity flex items-center justify-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled || index === 0}
                  aria-label="Move photo up"
                  className="[@media(hover:none)]:h-9 [@media(hover:none)]:w-9 shrink-0 h-6 w-6 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(index, -1);
                  }}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled || index === items.length - 1}
                  aria-label="Move photo down"
                  className="[@media(hover:none)]:h-9 [@media(hover:none)]:w-9 shrink-0 h-6 w-6 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(index, 1);
                  }}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled}
                  aria-label="Remove photo"
                  className="[@media(hover:none)]:h-9 [@media(hover:none)]:w-9 shrink-0 h-6 w-6 text-white hover:bg-red-500/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewIndex !== null && (
        <ImmersivePhotoViewer
          photos={previewPhotos}
          immersive
          initialIndex={previewIndex}
          title={`Photo ${previewIndex + 1} of ${items.length}`}
          onCollapse={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}
