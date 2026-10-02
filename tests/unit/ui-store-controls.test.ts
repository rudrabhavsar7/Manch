import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/ui-store';

describe('UI Store Photo & View Controls', () => {
  beforeEach(() => {
    useUIStore.setState({
      photoScale: 1,
      photoIndex: 0,
      photoCount: 0,
      isViewingPhoto: false,
    });
  });

  it('updates and resets photo scale', () => {
    expect(useUIStore.getState().photoScale).toBe(1);
    useUIStore.getState().setPhotoScale(1.5);
    expect(useUIStore.getState().photoScale).toBe(1.5);
    useUIStore.getState().resetPhotoScale();
    expect(useUIStore.getState().photoScale).toBe(1);
  });

  it('updates photo index and photo count', () => {
    useUIStore.getState().setPhotoCount(3);
    expect(useUIStore.getState().photoCount).toBe(3);
    useUIStore.getState().setPhotoIndex(2);
    expect(useUIStore.getState().photoIndex).toBe(2);
  });

  it('toggles isViewingPhoto', () => {
    expect(useUIStore.getState().isViewingPhoto).toBe(false);
    useUIStore.getState().setIsViewingPhoto(true);
    expect(useUIStore.getState().isViewingPhoto).toBe(true);
  });
});
