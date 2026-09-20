export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number
): (...args: Args) => void {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  return (...args: Args) => {
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
  };
}
