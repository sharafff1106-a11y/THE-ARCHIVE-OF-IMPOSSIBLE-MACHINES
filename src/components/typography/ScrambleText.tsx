import { useEffect, useRef } from 'react';
import { scrambleInto } from '../../utils/scramble';

interface Props {
  text: string;
  /** Text to resolve into while hovered (e.g. a hidden second meaning). */
  hoverText?: string;
  as?: 'span' | 'p' | 'div' | 'b';
  className?: string;
  duration?: number;
  delay?: number;
  /** Re-scramble whenever `text` changes (default) or only on mount. */
  scrambleOnChange?: boolean;
}

/**
 * A label that arrives like a machine readout. Used for data, never for
 * prose — motion has hierarchy.
 */
export function ScrambleText({
  text,
  hoverText,
  as = 'span',
  className,
  duration = 650,
  delay = 0,
  scrambleOnChange = true,
}: Props) {
  const Tag = as as 'span';
  const ref = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (mounted.current && !scrambleOnChange) {
      el.textContent = text;
      return;
    }
    mounted.current = true;
    let cancel = () => {};
    const t = window.setTimeout(() => {
      cancel = scrambleInto(el, text, { duration });
    }, delay);
    return () => {
      window.clearTimeout(t);
      cancel();
    };
  }, [text, duration, delay, scrambleOnChange]);

  const hoverProps = hoverText
    ? {
        onPointerEnter: () => ref.current && scrambleInto(ref.current, hoverText, { duration: 380 }),
        onPointerLeave: () => ref.current && scrambleInto(ref.current, text, { duration: 300 }),
      }
    : {};

  return (
    <Tag ref={ref} className={className} aria-label={text} {...hoverProps}>
      {' '}
    </Tag>
  );
}
