import { useRef } from 'react';
import gsap from 'gsap';
import { EASE } from '../../animation/easings';

interface Props {
  onPull: () => void;
  disabled?: boolean;
}

const TRAVEL = 120;

/**
 * A lever in a slot. It has to be pulled all the way — half-measures spring
 * back. Keyboard: Enter / Space performs a full pull.
 */
export function MemoryLever({ onPull, disabled }: Props) {
  const handle = useRef<SVGGElement>(null);
  const state = useRef({ y: 0, start: 0, scale: 1, dragging: false });
  const spring = useRef<gsap.core.Tween | null>(null);

  const setY = (y: number) => {
    state.current.y = y;
    handle.current!.setAttribute('transform', `translate(0 ${y})`);
  };

  const release = () => {
    const s = state.current;
    const pulled = s.y > TRAVEL * 0.88;
    if (pulled) onPull();
    const proxy = { y: s.y };
    spring.current = gsap.to(proxy, {
      y: 0,
      duration: pulled ? 1.4 : 0.9,
      ease: EASE.spring,
      delay: pulled ? 0.25 : 0,
      onUpdate: () => setY(proxy.y),
    });
  };

  return (
    <div className={`lever ${disabled ? 'is-disabled' : ''}`}>
      <svg
        className="lever__svg"
        viewBox="0 0 60 190"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Purge lever"
        aria-disabled={disabled}
        data-cursor="hover"
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          spring.current?.kill();
          const el = e.currentTarget as SVGSVGElement;
          el.setPointerCapture(e.pointerId);
          const s = state.current;
          s.scale = 190 / el.getBoundingClientRect().height;
          s.dragging = true;
          s.start = e.clientY * s.scale - s.y;
        }}
        onPointerMove={(e) => {
          const s = state.current;
          if (!s.dragging) return;
          setY(Math.min(TRAVEL, Math.max(0, e.clientY * s.scale - s.start)));
        }}
        onPointerUp={() => {
          if (!state.current.dragging) return;
          state.current.dragging = false;
          release();
        }}
        onPointerCancel={() => {
          state.current.dragging = false;
          release();
        }}
        onKeyDown={(e) => {
          if (disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
          e.preventDefault();
          const proxy = { y: 0 };
          gsap.to(proxy, { y: TRAVEL, duration: 0.25, ease: 'power3.in', onUpdate: () => setY(proxy.y), onComplete: release });
        }}
      >
        <rect x="26" y="20" width="8" height="150" rx="1" className="lever__slot" />
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} x1="40" x2={i % 3 === 0 ? 50 : 45} y1={30 + i * 20} y2={30 + i * 20} className="lever__mark" />
        ))}
        <text x="52" y="164" className="lever__end">MAX</text>
        <g ref={handle}>
          <rect x="28.5" y="16" width="3" height="34" className="lever__rod" />
          <rect x="12" y="10" width="36" height="14" rx="2" className="lever__grip" />
          <line x1="16" x2="44" y1="17" y2="17" className="lever__grip-line" />
        </g>
      </svg>
      <span className="lever__label t-mono-s">PULL</span>
    </div>
  );
}
