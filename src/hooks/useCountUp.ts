import { useState, useEffect } from 'react';

/**
 * Animated count-up hook for figures and statistics.
 * Automatically skips animation if user prefers reduced motion or in test environments.
 */
export function useCountUp(target: number, duration = 650): number {
  const isReduced =
    typeof window === 'undefined' ||
    import.meta.env?.MODE === 'test' ||
    Boolean(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const [value, setValue] = useState<number>(0);

  useEffect(() => {
    if (isReduced) return;

    let startTime: number | null = null;
    let animFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * target));
      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [target, duration, isReduced]);

  return isReduced ? target : value;
}
