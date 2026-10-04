import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Chars } from '../../components/typography/Chars';
import { scrambleInto, pad } from '../../utils/scramble';
import { archive } from '../../state/archiveStore';
import { EASE } from '../../animation/easings';
import './boot.css';

interface Props {
  onComplete: () => void;
}

interface BootLine {
  label: string;
  status: string;
  tone?: 'warn' | 'dim';
}

/**
 * Cinematic boot. Tiny monospace on black, then the title, then a single
 * hairline that draws across the screen — and becomes the paper of the
 * archive itself.
 */
export function BootSequence({ onComplete }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onComplete);
  done.current = onComplete;

  const { visits, reducedMotion } = archive.get();
  const returning = visits > 1;

  const lines: BootLine[] = [
    { label: 'MEMORY ENGINE', status: 'ONLINE' },
    { label: 'GRAVITY SYSTEM', status: 'ONLINE' },
    { label: 'TEMPORAL SYSTEM', status: 'WARNING', tone: 'warn' },
    { label: 'AFFECT SENSORS', status: 'ONLINE' },
    { label: 'OBSERVATORY', status: 'WATCHING', tone: 'dim' },
    ...(returning ? [{ label: 'VISITOR', status: `RECOGNISED · ${pad(visits, 4)}`, tone: 'warn' as const }] : []),
  ];

  useLayoutEffect(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => done.current() });

      tl.set(q('.boot__block'), { autoAlpha: 1 })
        .from(q('.boot__head > *'), { autoAlpha: 0, y: 4, duration: 0.01, stagger: 0.18 })
        .to({}, { duration: 0.35 });

      q('.boot__line').forEach((line, i) => {
        const status = line.querySelector<HTMLElement>('.boot__status')!;
        const finalText = lines[i].status;
        tl.fromTo(line, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 })
          .fromTo(
            line.querySelector('.boot__leader'),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.28, ease: 'none', transformOrigin: 'left center' },
          )
          .call(() => {
            cleanups.push(scrambleInto(status, finalText, { duration: 260 }));
          })
          .to({}, { duration: lines[i].tone === 'warn' ? 0.45 : 0.12 });
      });

      // Integrity counter — counts up, hesitates, never reaches 100.
      const counter = { v: 0 };
      tl.fromTo(q('.boot__integrity'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, '+=0.2').to(counter, {
        v: 97.4,
        duration: 1.1,
        ease: 'power2.out',
        onUpdate: () => {
          const n = q('.boot__integrity-n')[0];
          if (n) n.textContent = counter.v.toFixed(1) + '%';
        },
      });

      tl.fromTo(q('.boot__unknown'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, '+=0.25')
        .to(q('.boot__unknown'), { autoAlpha: 0, duration: 0.01, repeat: 3, yoyo: true, repeatDelay: 0.12 })
        .to({}, { duration: 0.7 })
        // Hard cut. The diagnostics are gone.
        .set(q('.boot__block'), { autoAlpha: 0 })
        .to({}, { duration: 0.5 });

      // Title
      tl.set(q('.boot__title'), { autoAlpha: 1 })
        .from(q('.boot__title-code'), { autoAlpha: 0, duration: 0.01 })
        .from(q('.boot__title-a .char'), { yPercent: 110, duration: 0.9, ease: EASE.settle, stagger: 0.025 }, '+=0.2')
        .from(q('.boot__title-b .char'), { yPercent: 110, duration: 1.1, ease: EASE.settle, stagger: 0.03 }, '-=0.6')
        .from(q('.boot__title-b'), { letterSpacing: '-0.04em', duration: 2.4, ease: 'power2.out' }, '<')
        .to({}, { duration: 0.6 });

      // The line draws itself across the screen…
      tl.fromTo(q('.boot__rule'), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: EASE.mech })
        .to(q('.boot__title'), { yPercent: -18, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, '-=0.3')
        // …and becomes the archive: it opens vertically into paper.
        .to(q('.boot__rule'), { scaleY: () => window.innerHeight * 1.05, duration: 1.0, ease: 'expo.inOut' }, '+=0.15')
        .set(el, { pointerEvents: 'none' });

      if (reducedMotion) tl.timeScale(1.6);

      // Any interaction after a moment fast-forwards — never trap people.
      const skip = () => {
        if (tl.time() > 0.8) tl.timeScale(7);
      };
      window.addEventListener('pointerdown', skip);
      window.addEventListener('keydown', skip);
      cleanups.push(() => {
        window.removeEventListener('pointerdown', skip);
        window.removeEventListener('keydown', skip);
      });
    }, el);

    return () => {
      cleanups.forEach((c) => c());
      ctx.revert();
    };
  // Runs once: the boot is a single uninterrupted take.
  }, []);

  return (
    <div ref={root} className="boot" role="status" aria-live="polite">
      <div className="boot__block">
        <div className="boot__head t-mono">
          <div>ARCHIVE SYSTEM</div>
          <div className="boot__dim">INITIALIZING…</div>
        </div>
        <ul className="boot__lines t-mono">
          {lines.map((l) => (
            <li key={l.label} className={`boot__line ${l.tone ? `is-${l.tone}` : ''}`}>
              <span className="boot__label">{l.label}</span>
              <span className="boot__leader" />
              <span className="boot__status">{' '}</span>
            </li>
          ))}
        </ul>
        <div className="boot__integrity t-mono">
          <div className="boot__dim">ARCHIVE INTEGRITY</div>
          <div className="boot__integrity-n">0.0%</div>
        </div>
        <div className="boot__unknown t-mono">UNKNOWN OBJECT DETECTED</div>
      </div>

      <div className="boot__title">
        <div className="boot__title-code t-mono">ARCHIVE 00</div>
        <h1 className="boot__title-text t-serif">
          <span className="boot__mask">
            <Chars text="The Archive of" className="boot__title-a" />
          </span>
          <span className="boot__mask">
            <Chars text="Impossible Machines" className="boot__title-b" />
          </span>
        </h1>
      </div>

      <div className="boot__rule" />
      <p className="boot__skip t-mono-s">PRESS ANY KEY TO HURRY THE ARCHIVE</p>
    </div>
  );
}
