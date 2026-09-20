import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransposeControl } from '@/components/live/transpose-control';
import { useUIStore } from '@/stores/ui-store';

describe('TransposeControl', () => {
  beforeEach(() => {
    useUIStore.setState({ transposeMap: {} });
  });

  it('renders initial transpose 0', () => {
    render(<TransposeControl songId="song-1" originalKey="G" />);
    expect(screen.getByText('Key: G')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByTestId('transpose-reset')).not.toBeInTheDocument();
  });

  it('increments transpose', () => {
    render(<TransposeControl songId="song-1" originalKey="G" />);
    fireEvent.click(screen.getByTestId('transpose-increment'));
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(useUIStore.getState().transposeMap['song-1']).toBe(1);
  });

  it('decrements transpose', () => {
    render(<TransposeControl songId="song-1" originalKey="G" />);
    fireEvent.click(screen.getByTestId('transpose-decrement'));
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('shows and handles reset button', () => {
    useUIStore.setState({ transposeMap: { 'song-1': 3 } });
    render(<TransposeControl songId="song-1" originalKey="G" />);
    
    const resetBtn = screen.getByTestId('transpose-reset');
    expect(resetBtn).toBeInTheDocument();
    
    fireEvent.click(resetBtn);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(useUIStore.getState().transposeMap['song-1']).toBe(0);
  });
});
