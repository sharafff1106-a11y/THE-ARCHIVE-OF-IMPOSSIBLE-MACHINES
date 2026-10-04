import { memo } from 'react';

interface Props {
  text: string;
  className?: string;
}

/**
 * Splits text into individually animatable characters while keeping the
 * real string available to assistive tech.
 */
export const Chars = memo(function Chars({ text, className }: Props) {
  return (
    <span className={className} aria-label={text} role="text">
      {Array.from(text).map((c, i) => (
        <span key={i} className="char" aria-hidden="true">
          {c === ' ' ? ' ' : c}
        </span>
      ))}
    </span>
  );
});
