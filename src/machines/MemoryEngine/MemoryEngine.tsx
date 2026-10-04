import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import MemoryScene from '../../scenes/MemoryScene/MemoryScene';
import { MechanicalDial } from '../../components/ui/MechanicalDial';
import { MemoryLever } from './MemoryLever';
import { MemoryFlash } from './MemoryFlash';
import { Chars } from '../../components/typography/Chars';
import { ScrambleText } from '../../components/typography/ScrambleText';
import { cursorBus } from '../../components/cursor/cursorBus';
import { notices } from '../../components/ui/notices';
import { archive, useArchive } from '../../state/archiveStore';
import { machineById } from '../../data/machines';
import { audio } from '../../audio/AudioEngine';
import { scrambleInto, pad } from '../../utils/scramble';
import { EASE } from '../../animation/easings';
import { createMemoryRig, phaseFor, PART_NOTES, ramp, type MemoryPart, type MemoryPhase } from './memoryRig';
import type { MachineViewProps } from '../../scenes/ArchiveScene/ArchiveScene';
import './memory.css';

const RECORD = machineById('M-001');
const PHASES: MemoryPhase[] = ['dormant', 'awakening', 'active', 'overload', 'complete'];
const WARNING_LINES = ['THIS BUTTON DOES NOTHING.', 'IT DID SOMETHING.', 'STOP.'];

let overloadWarned = false;

/**
 * M-001 — THE MEMORY ENGINE
 * Converts memories into physical light. Rotate the dial and find out
 * what it keeps.
 */
export default function MemoryEngine({ onExit, ready }: MachineViewProps) {
  const reduced = useArchive((s) => s.reducedMotion);
  const symbols = useArchive((s) => s.discoveredSymbols);

  const [rig] = useState(() =>
    createMemoryRig(
      archive.get().reducedMotion,
      window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4,
    ),
  );

  const root = useRef<HTMLElement>(null);
  const capacityEl = useRef<HTMLSpanElement>(null);
  const thermalEl = useRef<HTMLSpanElement>(null);
  const densityEl = useRef<HTMLSpanElement>(null);
  const rpmEl = useRef<HTMLSpanElement>(null);
  const calEl = useRef<HTMLSpanElement>(null);
  const markerEl = useRef<HTMLDivElement>(null);
  const lastInput = useRef(0);
  const sequence = useRef(false);
  const warnClicks = useRef(0);
  const cableClicks = useRef(0);
  const warnTimer = useRef(0);

  const [phase, setPhase] = useState<MemoryPhase>('dormant');
  const [part, setPart] = useState<MemoryPart | null>(null);
  const [locked, setLocked] = useState(false);
  const [stored, setStored] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);
  const [warnLine, setWarnLine] = useState<string | null>(null);
  const hintKnown = symbols.includes(RECORD.symbol);

  useEffect(() => {
    rig.reducedMotion = reduced;
  }, [reduced, rig]);

  if (import.meta.env.DEV) (window as unknown as { __memoryRig: unknown }).__memoryRig = rig;

  // ── Intro: wide establishing shot, then the instruments arrive ──
  useLayoutEffect(() => {
    if (!ready) return;
    rig.revealed = true;
    const q = gsap.utils.selector(root.current);
    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.4 })
        .from(q('.memory__code'), { autoAlpha: 0, duration: 0.01 })
        .from(q('.memory__name .char'), { yPercent: 110, duration: 1.1, ease: EASE.settle, stagger: 0.035 }, 0.2)
        .from(q('.memory__readout > div'), { autoAlpha: 0, x: -8, duration: 0.5, ease: 'power2.out', stagger: 0.12 }, 0.9)
        .from(q('.memory__controls'), { autoAlpha: 0, x: 24, duration: 1.0, ease: EASE.mech }, 1.2)
        .from(q('.dial__tick'), { autoAlpha: 0, duration: 0.01, stagger: { each: 0.012, from: 'start' } }, 1.4)
        .from(q('.memory__states li'), { autoAlpha: 0, duration: 0.01, stagger: 0.09 }, 1.6)
        .from(q('.memory__telemetry li'), { autoAlpha: 0, duration: 0.01, stagger: 0.07 }, 1.8)
        .from(q('.memory__frame span'), { scale: 0, duration: 0.4, ease: 'back.out(3)', stagger: 0.04 }, 1.0);
    }, root);
    return () => ctx.revert();
  }, [ready, rig]);

  // "MEMORY STORED" — typed one character at a time into the silence
  useLayoutEffect(() => {
    if (!stored) return;
    const chars = root.current!.querySelectorAll('.memory__stored .char');
    const tween = gsap.from(chars, { autoAlpha: 0, duration: 0.01, stagger: 0.07 });
    return () => {
      tween.kill();
    };
  }, [stored]);

  // ── Sound: the hum lives only while this machine is on stage ──
  const soundOn = useArchive((s) => s.soundEnabled);
  useEffect(() => {
    if (!soundOn) return;
    audio.humStart();
    return () => audio.humStop();
  }, [soundOn]);

  // ── The completion ritual ─────────────────────────────────
  const complete = useCallback(() => {
    if (sequence.current) return;
    sequence.current = true;
    rig.capacity = 100;
    rig.frozen = true; // everything stops exactly where it is
    audio.silence();
    setLocked(true);
    cursorBus.set(null);
    root.current!.dataset.cut = 'true';

    const memoryIndex = archive.get().memoriesStored;
    const fast = archive.get().reducedMotion;

    gsap
      .timeline()
      .to({}, { duration: 1.7 }) // silence
      .call(() => {
        setStored(true);
        audio.stored();
      })
      .to({}, { duration: 1.9 })
      .call(() => setFlash(memoryIndex))
      .to({}, { duration: 1.05 })
      .call(() => {
        setFlash(null);
        setStored(false);
      })
      .to({}, { duration: 0.8 })
      .call(() => {
        archive.set((s) => ({ memoriesStored: s.memoriesStored + 1 }));
        const fresh = archive.discoverSymbol(RECORD.symbol);
        if (fresh) {
          notices.whisper(`SYMBOL ${RECORD.symbol} RECOVERED · ${archive.get().discoveredSymbols.length} OF 6`, 'signal', 6000);
        } else {
          notices.whisper(`MEMORY ${pad(memoryIndex + 1, 4)} FILED.`);
        }
        rig.frozen = false;
        delete root.current!.dataset.cut;
      })
      // The machine resets itself: the dial unwinds on its own.
      .to(rig, { capacity: 0, duration: fast ? 1.2 : 3.2, ease: 'power2.inOut' })
      .call(() => {
        sequence.current = false;
        setLocked(false);
      });
  }, [rig]);

  // ── Per-frame conductor: readouts, leak, phase transitions ──
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let current: MemoryPhase = 'dormant';
    let lastThermal = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;

      // Memory fades if you let go. Slowly — the machine is not cruel.
      if (!sequence.current && !notices.get().alert && rig.capacity > 0 && rig.capacity < 100 && now - lastInput.current > 2600) {
        rig.capacity = Math.max(0, rig.capacity - dt * 1.4);
      }

      const cap = rig.capacity;
      const e = rig.energy;

      if (!sequence.current) {
        if (cap >= 99.9) complete();
        const next = phaseFor(cap);
        if (next !== current) {
          if (next === 'awakening' && current === 'dormant') audio.blip(true);
          if (next === 'overload' && !overloadWarned) {
            overloadWarned = true;
            notices.alert({
              code: 'SYSTEM WARNING',
              body: 'OBJECT HAS EXCEEDED\nEXPECTED REALITY LIMITS.',
              action: 'CONTINUE',
            });
          }
          current = next;
          setPhase(next);
        }
      }

      capacityEl.current!.textContent = `${pad(cap, 2)}%`;
      densityEl.current!.textContent = `${(e * 0.832).toFixed(1)}%`;
      rpmEl.current!.textContent = pad(ramp(e, 38, 100) * 1440, 4);
      if (now - lastThermal > 180) {
        lastThermal = now;
        thermalEl.current!.textContent = (4.2 + e * 0.31 + Math.random() * (e / 60)).toFixed(1).padStart(5, '0');
      }
      const idx = Math.min(4, Math.floor(cap / 25));
      markerEl.current!.style.transform = `translateX(${(cap / 100) * 100}%)`;
      markerEl.current!.dataset.idx = String(idx);

      audio.humSet(rig.frozen ? 0 : e / 100);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rig, complete]);

  // Pointer → normalised coordinates for camera parallax and the crown's gaze
  useEffect(() => {
    const el = root.current!;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      rig.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      rig.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      el.removeEventListener('pointermove', onMove);
      cursorBus.set(null);
    };
  }, [rig]);

  // ── Inputs ───────────────────────────────────────────────
  const writeCapacity = useCallback(
    (v: number) => {
      if (sequence.current) return;
      lastInput.current = performance.now();
      rig.capacity = v;
    },
    [rig],
  );

  const onHover = useCallback((p: MemoryPart | null) => {
    setPart(p);
    cursorBus.set(p ? 'reticle' : null, p ? PART_NOTES[p].name : null);
    if (p) audio.blip();
  }, []);

  const onPart = useCallback(
    (p: MemoryPart) => {
      if (sequence.current) return;
      setPart(p);
      switch (p) {
        case 'chamber':
        case 'core':
          rig.corePulse = 1;
          audio.glass();
          break;
        case 'gimbal-outer':
        case 'gimbal-inner':
        case 'governor':
          rig.ringKick = 1;
          audio.tick(0.6);
          break;
        case 'crown':
          rig.watch = 4;
          audio.blip(true);
          break;
        case 'cable': {
          const n = ++cableClicks.current;
          audio.click();
          if (n === 3) {
            cableClicks.current = 0;
            rig.blackout = 1.6;
            audio.silence();
            notices.whisper('UNPLUGGED.');
            window.setTimeout(() => notices.whisper('REPLUGGED. NOBODY SAW THAT.'), 2400);
          } else {
            notices.whisper(n === 1 ? 'CABLE 07 — DO NOT UNPLUG.' : 'CABLE 07 — PLEASE DO NOT UNPLUG.');
          }
          break;
        }
        case 'capacitor':
          notices.whisper('WARM.');
          audio.blip();
          break;
        case 'plinth':
          audio.thunk();
          rig.ringKick = 0.3;
          break;
      }
    },
    [rig],
  );

  const pullLever = useCallback(() => {
    audio.thunk();
    if (sequence.current) return;
    if (rig.capacity < 4) {
      notices.whisper('NOTHING TO PURGE.');
      return;
    }
    rig.purge = 1;
    lastInput.current = performance.now();
    gsap.to(rig, { capacity: 0, duration: 0.9, ease: 'power3.out' });
    notices.whisper('PURGED. 0 MEMORIES LOST. PROBABLY.');
  }, [rig]);

  const calibrate = () => {
    audio.click();
    rig.ringKick = 1;
    if (calEl.current) scrambleInto(calEl.current, `±0.000${(Math.random() * 9) | 0}`, { duration: 600 });
  };

  const warning = () => {
    const n = warnClicks.current++;
    audio.click();
    setWarnLine(WARNING_LINES[Math.min(n, 2)]);
    if (n === 1) {
      // It does something after all: the register turns red and the crown looks at you.
      rig.alarm = 1;
      rig.watch = 5;
      audio.warn();
    }
    window.clearTimeout(warnTimer.current);
    warnTimer.current = window.setTimeout(() => {
      setWarnLine(null);
      if (warnClicks.current > 2) warnClicks.current = 0;
    }, 3200);
  };

  const note = part ? PART_NOTES[part] : null;

  return (
    <section
      ref={root}
      className="memory"
      data-phase={phase}
      aria-label="Machine 001, the Memory Engine"
      onPointerLeave={() => cursorBus.set(null)}
    >
      <MemoryScene rig={rig} onHover={onHover} onPart={onPart} />
      <div className="memory__vignette" aria-hidden="true" />

      <div className="memory__frame" aria-hidden="true">
        <span className="screw" />
        <span className="screw" />
        <span className="screw" />
        <span className="screw" />
      </div>

      {/* Title block */}
      <header className="memory__title memory__ui">
        <div className="memory__code t-mono">
          M-{RECORD.number} <span className="memory__dim">/ UNIT {RECORD.id}</span>
        </div>
        <h2 className="memory__name t-serif">
          <span className="memory__mask">
            <Chars text={RECORD.name} />
          </span>
        </h2>
        {hintKnown && <p className="memory__hint t-serif-i">{RECORD.hint}</p>}
      </header>

      <dl className="memory__readout memory__ui t-mono">
        <div>
          <dt>STATUS</dt>
          <dd>
            <ScrambleText text={phase.toUpperCase()} className="memory__status" />
          </dd>
        </div>
        <div>
          <dt>MEMORY CAPACITY</dt>
          <dd>
            <span ref={capacityEl} className="memory__capacity">
              00%
            </span>
          </dd>
        </div>
      </dl>

      {/* Control plate */}
      <aside className="memory__controls memory__ui" aria-label="Control plate">
        <MechanicalDial
          read={() => rig.capacity}
          write={writeCapacity}
          label="ROTATE"
          ariaLabel="Memory capacity dial"
          disabled={locked}
          onDetent={(v) => audio.tick(v / 100)}
          onGrab={() => {
            lastInput.current = performance.now();
          }}
        />
        <div className="memory__aux">
          <MemoryLever onPull={pullLever} disabled={locked} />
          <div className="memory__buttons">
            <button className="memory__key t-mono-s" onClick={calibrate} disabled={locked} data-cursor="hover">
              CAL
            </button>
            <button
              className="memory__key memory__key--warn t-mono-s"
              onClick={warning}
              disabled={locked}
              data-cursor="hover"
              aria-label="Warning"
            >
              ⚠
            </button>
            <p className="memory__warnline t-mono-s" aria-live="polite">
              {warnLine && (
                <>
                  <span className="signal">WARNING</span>
                  <br />
                  <ScrambleText text={warnLine} />
                </>
              )}
            </p>
          </div>
        </div>
      </aside>

      {/* Telemetry — tiny, intentional */}
      <ul className="memory__telemetry memory__ui t-mono-s">
        <li>
          UNIT <b>M-001</b>
        </li>
        <li>
          <ScrambleText text="THERMAL OUTPUT" hoverText="THERMAL OUTPUT UNSTABLE" className="memory__hoverable" />{' '}
          <b ref={thermalEl}>004.2</b>
        </li>
        <li>
          MEMORY DENSITY <b ref={densityEl}>0.0%</b>
        </li>
        <li>
          RING RPM <b ref={rpmEl}>0000</b>
        </li>
        <li>
          CALIBRATION <b ref={calEl}>±0.0003</b>
        </li>
        <li>
          CORE STATUS <b>{phase === 'overload' ? 'UNSTABLE' : 'STABLE'}</b>
        </li>
      </ul>

      {/* State rail */}
      <div className="memory__states memory__ui" aria-hidden="true">
        <ol className="t-mono-s">
          {PHASES.map((p) => (
            <li key={p} className={p === phase ? 'is-current' : ''}>
              {p}
            </li>
          ))}
        </ol>
        <div className="memory__track">
          <div ref={markerEl} className="memory__marker">
            <i />
          </div>
        </div>
      </div>

      {/* Component annotation */}
      <div className={`memory__note memory__ui t-mono-s ${note ? 'is-on' : ''}`} aria-live="polite">
        {note && (
          <>
            <span className="memory__note-name">
              <ScrambleText text={note.name} duration={300} />
            </span>
            <span>{note.spec}</span>
            <span className="memory__dim">{note.note}</span>
          </>
        )}
      </div>

      <button className="memory__exit memory__ui t-mono-s" onClick={onExit} data-cursor="hover">
        ← INDEX
      </button>

      {stored && (
        <div className="memory__stored" role="status">
          <Chars text="MEMORY STORED" className="t-mono" />
        </div>
      )}
      {flash !== null && <MemoryFlash index={flash} />}
    </section>
  );
}
