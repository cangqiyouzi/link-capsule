import { useEffect, useRef } from 'react';

const GLYPHS = '0123456789ABCDEF<>+=-_';

export function useGlyphStream(
  elementRef: React.RefObject<HTMLElement | null>,
  originalText: string,
  isActive: boolean = true,
  interval: number = 50,
  duration: number = 3000
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActive || !elementRef.current) return;

    const el = elementRef.current;

    function startStream() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      intervalRef.current = setInterval(() => {
        let randomTail = '';
        for (let i = 0; i < 8; i++) {
          randomTail += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.innerText = originalText + randomTail;
      }, interval);

      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        el.innerText = originalText;
      }, duration);
    }

    startStream();

    const repeatTimer = setInterval(() => {
      startStream();
    }, duration + 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearInterval(repeatTimer);
    };
  }, [isActive, originalText, interval, duration, elementRef]);
}
