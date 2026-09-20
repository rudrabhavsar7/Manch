import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '@/app/settings/page';
import { useUIStore } from '@/stores/ui-store';

describe('SettingsPage (/settings)', () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: 'dark',
      fontSize: 16,
      autoScrollSpeed: 50,
    });
  });

  it('renders settings heading and initial values', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /dark mode/i })).toBeInTheDocument();
    expect(screen.getByText('16px')).toBeInTheDocument();
    expect(screen.getByText('50px/s')).toBeInTheDocument();
  });

  it('toggles theme switch and updates useUIStore', () => {
    render(<SettingsPage />);

    const themeSwitch = screen.getByRole('switch', { name: /dark mode/i });
    expect(themeSwitch).toHaveAttribute('data-state', 'checked');

    fireEvent.click(themeSwitch);

    expect(useUIStore.getState().theme).toBe('light');
    expect(themeSwitch).toHaveAttribute('data-state', 'unchecked');

    fireEvent.click(themeSwitch);

    expect(useUIStore.getState().theme).toBe('dark');
    expect(themeSwitch).toHaveAttribute('data-state', 'checked');
  });

  it('adjusts font size slider and updates useUIStore', () => {
    render(<SettingsPage />);

    const fontSizeSlider = screen.getByRole('slider', { name: /default font size/i });
    expect(fontSizeSlider).toHaveAttribute('aria-valuenow', '16');

    fireEvent.keyDown(fontSizeSlider, { key: 'ArrowRight' });

    expect(useUIStore.getState().fontSize).toBe(18);
    expect(screen.getByText('18px')).toBeInTheDocument();

    fireEvent.keyDown(fontSizeSlider, { key: 'ArrowLeft' });

    expect(useUIStore.getState().fontSize).toBe(16);
  });

  it('adjusts auto-scroll speed slider and updates useUIStore', () => {
    render(<SettingsPage />);

    const speedSlider = screen.getByRole('slider', { name: /auto-scroll speed/i });
    expect(speedSlider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(speedSlider, { key: 'ArrowRight' });

    expect(useUIStore.getState().autoScrollSpeed).toBe(55);
    expect(screen.getByText('55px/s')).toBeInTheDocument();

    fireEvent.keyDown(speedSlider, { key: 'ArrowLeft' });

    expect(useUIStore.getState().autoScrollSpeed).toBe(50);
  });
});
