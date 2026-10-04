import { useEffect, useMemo, useRef } from 'react';
import './dial.css';

interface Props {
  /** Read the live value (0..100). Polled per frame — the dial never owns it. */
  read: () => number;
  write: (v: number) => void;
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  /** Fires every `detent` units of travel, for clicks and haptics. */
  onDetent?: (v: number) => void;
  onGrab?: () => void;
  onRelease?: () => void;
  detent?: number;
}

const SWEEP = 300; // degrees of travel, -150° → +150°
const START = -150;
const R_TICKS = 104;

const polar = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [120 + Math.cos(a) * r, 120 + Math.sin(a) * r] as const;
};

/**
 * A heavy, detented rotary control. Drag in a circle (mouse or touch), or
 * use arrow keys. Reusable by any machine that needs one.
 */
export function MechanicalDial({ read, write, label, ariaLabel, disabled, onDetent, onGrab, onRelease, detent = 2 }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const knob = useRef<SVGGElement>(null);
  const arc = useRef<SVGPathElement>(null);
  const valueText = useRef<SVGTextElement>(null);
  const drag = useRef<{ last: number } | null>(null);
  const cb = useRef({ read, write, onDetent, onGrab, onRelease, disabled });
  cb.current = { read, write, onDetent, onGrab, onRelease, disabled };

  const ticks = useMemo(
    () =>
      Array.from({ length: 51 }, (_, i) => {
        const deg = START + (i / 50) * SWEEP;
        const major = i % 5 === 0;
        const [x1, y1] = polar(deg, R_TICKS);
        const [x2, y2] = polar(deg, R_TICKS - (major ? 10 : 5));
        return { x1, y1, x2, y2, major, i };
      }),
    [],
  );

  const labels = useMemo(
    () =>
      [0, 25, 50, 75, 100].map((v) => {
        const [x, y] = polar(START + (v / 100) * SWEEP, R_TICKS + 11);
        return { v, x, y };
      }),
    [],
  );

  // Render loop: reflect the live value into the SVG without React.
  useEffect(() => {
    let raf = 0;
    let last = -1;
    let lastDetent = Math.floor(cb.current.read() / detent);
    const loop = () => {
      const v = cb.current.read();
      if (Math.abs(v - last) > 0.005) {
        last = v;
        const deg = START + (v / 100) * SWEEP;
        knob.current!.setAttribute('transform', `rotate(${deg} 120 120)`);
        const [sx, sy] = polar(START, 92);
        const [ex, ey] = polar(deg, 92);
        const large = deg - START > 180 ? 1 : 0;
        arc.current!.setAttribute('d', v < 0.05 ? '' : `M ${sx} ${sy} A 92 92 0 ${large} 1 ${ex} ${ey}`);
        const rounded = Math.round(v);
        valueText.current!.textContent = String(rounded).padStart(3, '0');
        svg.current!.setAttribute('aria-valuenow', String(rounded));
        const d = Math.floor(v / detent);
        if (d !== lastDetent) {
          lastDetent = d;
          if (drag.current) cb.current.onDetent?.(v);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [detent]);

  const angleAt = (e: PointerEvent | React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (cb.current.disabled) return;
    e.preventDefault();
    svg.current!.setPointerCapture(e.pointerId);
    svg.current!.focus({ preventScroll: true });
    drag.current = { last: angleAt(e) };
    svg.current!.dataset.held = 'true';
    cb.current.onGrab?.();
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || cb.current.disabled) return;
    const a = angleAt(e);
    let d = a - drag.current.last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    drag.current.last = a;
    const next = Math.min(100, Math.max(0, cb.current.read() + (d / SWEEP) * 100));
    cb.current.write(next);
  };

  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    delete svg.current!.dataset.held;
    cb.current.onRelease?.();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (cb.current.disabled) return;
    const v = cb.current.read();
    const step = e.shiftKey || e.key.startsWith('Page') ? 10 : 2;
    let next: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'PageUp') next = v + step;
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'PageDown') next = v - step;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = 100;
    if (next === null) return;
    e.preventDefault();
    cb.current.onGrab?.();
    cb.current.write(Math.min(100, Math.max(0, next)));
    cb.current.onDetent?.(next);
    cb.current.onRelease?.();
  };

  return (
    <div className={`dial ${disabled ? 'is-disabled' : ''}`}>
      <svg
        ref={svg}
        className="dial__svg"
        viewBox="0 0 240 240"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-disabled={disabled}
        data-cursor="hover"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <circle cx="120" cy="120" r="116" className="dial__bezel" />
        {ticks.map((t) => (
          <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className={t.major ? 'dial__tick is-major' : 'dial__tick'} />
        ))}
        {labels.map((l) => (
          <text key={l.v} x={l.x} y={l.y} className="dial__num" textAnchor="middle" dominantBaseline="middle">
            {String(l.v).padStart(2, '0')}
          </text>
        ))}
        <circle cx="120" cy="120" r="92" className="dial__track" />
        <path ref={arc} className="dial__arc" />
        <g ref={knob} transform={`rotate(${START} 120 120)`}>
          <circle cx="120" cy="120" r="74" className="dial__knob" />
          {Array.from({ length: 48 }, (_, i) => {
            const [x1, y1] = polar((i / 48) * 360, 74);
            const [x2, y2] = polar((i / 48) * 360, 68);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="dial__grip" />;
          })}
          <circle cx="120" cy="120" r="56" className="dial__face" />
          <line x1="120" y1="120" x2="120" y2="52" className="dial__needle" />
          <circle cx="120" cy="58" r="3" className="dial__needle-dot" />
          <circle cx="120" cy="120" r="9" className="dial__hub" />
        </g>
        <text ref={valueText} x="120" y="150" className="dial__value" textAnchor="middle">
          000
        </text>
      </svg>
      <span className="dial__label t-mono-s">{label}</span>
    </div>
  );
}
