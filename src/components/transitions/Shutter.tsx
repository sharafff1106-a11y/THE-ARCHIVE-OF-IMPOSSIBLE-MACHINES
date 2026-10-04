import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { scrambleInto } from '../../utils/scramble';
import { archive } from '../../state/archiveStore';
import { audio } from '../../audio/AudioEngine';
import { EASE } from '../../animation/easings';
import './shutter.css';

type Runner = (label: string, onCovered: () => void) => Promise<void>;

let runner: Runner | null = null;

/**
 * Mechanical transition: two heavy plates close over the stage, a label is
 * stamped on the seam, the scene is swapped while hidden, the plates part.
 */
export const shutter = {
  run(label: string, onCovered: () => void) {
    if (!runner) {
      onCovered();
      return Promise.resolve();
    }
    return runner(label, onCovered);
  },
};

export function Shutter() {
  const root = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const q = gsap.utils.selector(root.current);
    runner = (label, onCovered) =>
      new Promise((resolve) => {
        if (busy.current) {
          onCovered();
          resolve();
          return;
        }
        busy.current = true;
        const fast = archive.get().reducedMotion;
        const d = fast ? 0.35 : 0.7;
        gsap
          .timeline({
            onComplete: () => {
              busy.current = false;
              resolve();
            },
          })
          .set(root.current, { visibility: 'visible' })
          .fromTo(q('.shutter__plate--top'), { yPercent: -100 }, { yPercent: 0, duration: d, ease: EASE.mech })
          .fromTo(q('.shutter__plate--bottom'), { yPercent: 100 }, { yPercent: 0, duration: d, ease: EASE.mech }, '<')
          .call(() => audio.thunk())
          .fromTo(q('.shutter__seam'), { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power3.out' })
          .call(() => {
            scrambleInto(text.current!, label, { duration: 380 });
            onCovered();
          }, undefined, '<')
          .to({}, { duration: fast ? 0.25 : 0.55 })
          .to(q('.shutter__seam'), { scaleX: 0, duration: 0.25, ease: 'power2.in', transformOrigin: 'right center' })
          .call(() => {
            text.current!.textContent = '';
          })
          .to(q('.shutter__plate--top'), { yPercent: -100, duration: d, ease: EASE.mech })
          .to(q('.shutter__plate--bottom'), { yPercent: 100, duration: d, ease: EASE.mech }, '<')
          .set(root.current, { visibility: 'hidden' })
          .set(q('.shutter__seam'), { transformOrigin: 'left center' });
      });
    return () => {
      runner = null;
    };
  }, []);

  return (
    <div ref={root} className="shutter" aria-hidden="true">
      <div className="shutter__plate shutter__plate--top">
        <span className="shutter__bolt" />
        <span className="shutter__bolt shutter__bolt--r" />
      </div>
      <div className="shutter__plate shutter__plate--bottom">
        <span className="shutter__bolt" />
        <span className="shutter__bolt shutter__bolt--r" />
      </div>
      <div className="shutter__seam" />
      <span ref={text} className="shutter__label t-mono" />
    </div>
  );
}
