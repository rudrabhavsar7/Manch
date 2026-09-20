import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../../src/lib/utils/throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the function immediately on the first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not call the function again within the throttle window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls the function after the throttle window if it was called during the window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled(); // t=0
    throttled(); // delayed until t=100
    
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses the latest arguments for the delayed call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled(1);
    throttled(2);
    throttled(3); // This will be the one executed
    
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenLastCalledWith(3);
  });
});
