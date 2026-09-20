export function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = ms - (now - lastCall);
    lastArgs = args;

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastCall = now;
      const argsToUse = lastArgs;
      lastArgs = null;
      fn(...argsToUse);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        if (lastArgs) {
          const argsToUse = lastArgs;
          lastArgs = null;
          fn(...argsToUse);
        }
      }, remaining);
    }
  }) as unknown as T;
}
