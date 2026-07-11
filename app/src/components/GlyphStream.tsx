import { useRef } from 'react';
import { useGlyphStream } from '@/hooks/useGlyphStream';

interface GlyphStreamProps {
  originalText: string;
  className?: string;
}

export default function GlyphStream({ originalText, className = '' }: GlyphStreamProps) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useGlyphStream(spanRef, originalText, true, 60, 2500);

  return (
    <span
      ref={spanRef}
      className={className}
      style={{ fontFamily: "'Space Mono', monospace" }}
    />
  );
}
