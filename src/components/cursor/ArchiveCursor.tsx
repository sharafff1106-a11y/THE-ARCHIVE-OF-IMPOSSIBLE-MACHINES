import { useEffect, useRef } from 'react';
import { cursorBus, type CursorMode } from './cursorBus';
import './cursor.css';

/**
 * The archive's pointer. A point that follows exactly, and a ring that
 * lags behind like an instrument settling. Mode changes are CSS-driven via
 * a data attribute so nothing here re-renders per frame.
 */
export function ArchiveCursor() {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    if (!fine.matches) return;
    document.documentElement.classList.add('has-archive-cursor');

    const el = root.current!;
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { ...target };
    let domMode: CursorMode = 'default';
    let pressed = false;
    let visible = false;
    let raf = 0;

    const apply = () => {
      let mode: CursorMode = cursorBus.override ?? domMode;
      if (pressed && (mode === 'hover' || mode === 'drag')) mode = 'drag';
      el.dataset.mode = mode;
      tag.current!.textContent = cursorBus.label ?? '';
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        visible = true;
        ringPos.x = target.x;
        ringPos.y = target.y;
        el.dataset.visible = 'true';
      }
      const hit = (e.target as Element | null)?.closest?.('[data-cursor]') as HTMLElement | null;
      const next = (hit?.dataset.cursor as CursorMode | undefined) ?? 'default';
      if (next !== domMode) {
        domMode = next;
        apply();
      }
    };
    const onDown = () => {
      pressed = true;
      apply();
    };
    const onUp = () => {
      pressed = false;
      apply();
    };
    const onLeave = () => {
      visible = false;
      el.dataset.visible = 'false';
    };

    const loop = () => {
      ringPos.x += (target.x - ringPos.x) * 0.2;
      ringPos.y += (target.y - ringPos.y) * 0.2;
      dot.current!.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      ring.current!.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const unsub = cursorBus.subscribe(apply);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      unsub();
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      document.documentElement.classList.remove('has-archive-cursor');
    };
  }, []);

  return (
    <div ref={root} className="archive-cursor" data-mode="default" data-visible="false" aria-hidden="true">
      <div ref={ring} className="archive-cursor__ring">
        <span className="archive-cursor__shape" />
        <span ref={tag} className="archive-cursor__tag" />
      </div>
      <div ref={dot} className="archive-cursor__dot">
        <span className="archive-cursor__point" />
      </div>
    </div>
  );
}
