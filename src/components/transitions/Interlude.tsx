import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Chars } from '../typography/Chars';
import { archive } from '../../state/archiveStore';
import './interlude.css';

interface Props {
  /** Pairs of [index, sentence]. Shown one at a time in a lot of nothing. */
  beats: Array<[string, string]>;
  onDone: () => void;
}

/**
 * Negative space as an event. One sentence, then nothing, then another.
 * Click anywhere to move on — the archive is patient, not a hostage-taker.
 */
export function Interlude({ beats, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    const q = gsap.utils.selector(root.current);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => done.current() });
      q('.interlude__beat').forEach((beat) => {
        const n = beat.querySelector('.interlude__n')!;
        const chars = beat.querySelectorAll('.char');
        tl.set(beat, { autoAlpha: 1 })
          .from(n, { autoAlpha: 0, duration: 0.01 })
          .to({}, { duration: 0.6 })
          .from(chars, { autoAlpha: 0, duration: 0.01, stagger: 0.055 })
          .to({}, { duration: 2.1 })
          // the sentence leaves the way it came, letter by letter, backwards
          .to([...chars].reverse(), { autoAlpha: 0, duration: 0.01, stagger: 0.02 })
          .set(beat, { autoAlpha: 0 })
          .to({}, { duration: 0.5 });
      });
      if (archive.get().reducedMotion) tl.timeScale(1.5);
      tlRef.current = tl;
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={root}
      className="interlude"
      onClick={() => tlRef.current?.timeScale(8)}
      role="presentation"
      data-cursor="hover"
    >
      {beats.map(([n, s]) => (
        <div key={n} className="interlude__beat">
          <span className="interlude__n t-mono">{n}</span>
          <Chars text={s} className="interlude__s t-mono" />
        </div>
      ))}
    </div>
  );
}
