import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Chars } from '../../components/typography/Chars';
import { scrambleInto } from '../../utils/scramble';
import { audio } from '../../audio/AudioEngine';
import { EASE } from '../../animation/easings';
import { archive } from '../../state/archiveStore';
import './threshold.css';

interface Props {
  /** Called the moment the halves begin to part — mount the archive behind. */
  onUnfold: () => void;
  /** Called once the threshold has fully left. */
  onGone: () => void;
}

/**
 * A huge empty space with one number in it. The page is cut along the
 * boot hairline; entering splits it open like a folded document.
 */
export function Threshold({ onUnfold, onGone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const numeral = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const cbs = useRef({ onUnfold, onGone });
  cbs.current = { onUnfold, onGone };

  useLayoutEffect(() => {
    const q = gsap.utils.selector(root.current);
    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.25 })
        .from(q('.threshold__meta'), { autoAlpha: 0, duration: 0.01, stagger: 0.12 })
        .from(q('.threshold__code .char'), { yPercent: 100, duration: 0.6, ease: EASE.settle, stagger: 0.04 }, 0.2)
        .from(q('.threshold__numeral'), { yPercent: 105, duration: 1.4, ease: 'expo.out' }, 0.35)
        .from(q('.threshold__words .char'), { yPercent: -110, duration: 0.9, ease: EASE.settle, stagger: 0.018 }, 0.8)
        .from(q('.threshold__enter'), { autoAlpha: 0, y: 6, duration: 0.6, ease: 'power2.out' }, 1.6)
        .from(q('.threshold__mark'), { scale: 0, duration: 0.5, ease: 'back.out(3)', stagger: 0.05 }, 1.2);
    }, root);
    return () => ctx.revert();
  }, []);

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    audio.thunk();
    const q = gsap.utils.selector(root.current);
    const reduce = archive.get().reducedMotion;
    scrambleInto(label.current!, 'UNSEALING', { duration: 420 });
    gsap
      .timeline({ onComplete: () => cbs.current.onGone() })
      .to(q('.threshold__enter'), { autoAlpha: 0, duration: 0.2, delay: 0.5 })
      // The hairline thickens into a seam…
      .to(q('.threshold__seam'), { scaleY: 3, duration: 0.25, ease: 'power2.in' })
      .call(() => cbs.current.onUnfold())
      // …and the sheet is torn open along it.
      .to(q('.threshold__half--top'), { yPercent: -100, duration: reduce ? 0.6 : 1.25, ease: EASE.mech }, '<0.05')
      .to(q('.threshold__half--bottom'), { yPercent: 100, duration: reduce ? 0.6 : 1.25, ease: EASE.mech }, '<')
      .to(q('.threshold__seam'), { scaleX: 0, duration: 0.8, ease: EASE.mech, transformOrigin: 'right center' }, '<0.2');
  };

  const hoverNumeral = () => {
    if (numeral.current) scrambleInto(numeral.current, '06', { duration: 300, glyphs: '0123456789' });
  };

  return (
    <div ref={root} className="threshold">
      <div className="threshold__half threshold__half--top">
        <div className="threshold__meta threshold__meta--tl t-mono-s">
          REF. AIM/00
          <br />
          CLASSIFICATION — UNRESOLVED
        </div>
        <div className="threshold__meta threshold__meta--tr t-mono-s">
          LOCATION WITHHELD
          <br />
          N 00°00′ — E 00°00′
        </div>
        <div className="threshold__upper">
          <span className="threshold__mask">
            <Chars text="ARCHIVE" className="threshold__code t-mono" />
          </span>
          <span className="threshold__mask threshold__mask--numeral">
            <span
              ref={numeral}
              className="threshold__numeral t-serif"
              onPointerEnter={hoverNumeral}
              data-cursor="crosshair"
              aria-label="six"
            >
              06
            </span>
          </span>
        </div>
        <span className="threshold__mark threshold__mark--l" />
        <span className="threshold__mark threshold__mark--r" />
      </div>

      <div className="threshold__seam" />

      <div className="threshold__half threshold__half--bottom">
        <div className="threshold__lower">
          <span className="threshold__mask">
            <Chars text="objects" className="threshold__words t-serif-i" />
          </span>
          <span className="threshold__mask">
            <Chars text="of" className="threshold__words t-serif-i" />
          </span>
          <span className="threshold__mask">
            <Chars text="impossibility" className="threshold__words t-serif-i" />
          </span>
          <button className="threshold__enter bracket-btn" onClick={enter} data-cursor="hover" disabled={leaving}>
            <span ref={label}>ENTER ARCHIVE</span>
          </button>
        </div>
        <div className="threshold__meta threshold__meta--bl t-mono-s">PLEASE DO NOT TOUCH THE OBJECTS</div>
        <div className="threshold__meta threshold__meta--br t-mono-s">THE OBJECTS MAY TOUCH YOU</div>
      </div>
    </div>
  );
}
