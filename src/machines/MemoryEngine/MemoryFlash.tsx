import { useLayoutEffect, useRef } from 'react';
import { memoryTitle, paintMemory } from './memoryImages';
import { pad } from '../../utils/scramble';

/**
 * About one second of someone else's memory. Hard cut in, hard cut out.
 * The timestamp is the visitor's own clock.
 */
export function MemoryFlash({ index }: { index: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    paintMemory(canvas.current!, index);
  }, [index]);

  const now = new Date();
  const stamp = `${pad(now.getHours(), 2)}:${pad(now.getMinutes(), 2)}:${pad(now.getSeconds(), 2)}`;

  return (
    <figure className="memory-flash" role="img" aria-label={`A stored memory: ${memoryTitle(index).toLowerCase()}`}>
      <canvas ref={canvas} className="memory-flash__img" />
      <figcaption className="memory-flash__cap t-mono-s">
        <span>MEM_{pad(index + 1, 4)}.RAW</span>
        <span>{memoryTitle(index)}</span>
        <span>RECORDED {stamp} · TODAY</span>
      </figcaption>
    </figure>
  );
}
