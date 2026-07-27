import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from its previous value to the current one.
 * Uses easeOutExpo for a fast-then-slow effect.
 */
export function useAnimatedNumber(value: number, duration = 600): number {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const start = prevValue.current;
    if (start === value) {
      setDisplayValue(value);
      return;
    }

    const startTime = performance.now();
    const diff = value - start;
    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(start + diff * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    prevValue.current = value;

    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return displayValue;
}
