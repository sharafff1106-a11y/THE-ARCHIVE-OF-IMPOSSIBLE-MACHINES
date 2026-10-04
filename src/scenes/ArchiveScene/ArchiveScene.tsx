import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArchiveHeader } from '../../components/navigation/ArchiveHeader';
import { MachineIndex } from '../../components/navigation/MachineIndex';
import { Shutter, shutter } from '../../components/transitions/Shutter';
import { Interlude } from '../../components/transitions/Interlude';
import { ScrambleText } from '../../components/typography/ScrambleText';
import { archive, useArchive } from '../../state/archiveStore';
import { machineById, machineBySlug, type MachineId } from '../../data/machines';
import { EASE } from '../../animation/easings';
import './archive.css';

// Each machine is its own chunk — WebGL is only fetched when needed.
const loadMemoryEngine = () => import('../../machines/MemoryEngine/MemoryEngine');
const MemoryEngine = lazy(loadMemoryEngine);

/** Warm the heaviest chunk while the visitor is still reading the threshold. */
export const prefetchMachines = () => {
  void loadMemoryEngine();
};

const MACHINE_VIEWS: Partial<Record<MachineId, React.LazyExoticComponent<React.ComponentType<MachineViewProps>>>> = {
  'M-001': MemoryEngine,
};

export interface MachineViewProps {
  onExit: () => void;
  /** False while an interlude still covers the stage. */
  ready: boolean;
}

const INTERLUDES: Partial<Record<MachineId, Array<[string, string]>>> = {
  'M-001': [
    ['01', 'IT REMEMBERS.'],
    ['02', 'SO DO YOU.'],
  ],
};

const seenInterludes = new Set<MachineId>();

function machineFromHash(): MachineId | null {
  const slug = location.hash.replace(/^#\/?/, '');
  const m = machineBySlug(slug);
  return m && m.available ? m.id : null;
}

/**
 * The archive itself: header, catalogue rail, and a stage. The stage is
 * mostly empty until something is chosen.
 */
export function ArchiveScene() {
  const root = useRef<HTMLDivElement>(null);
  const current = useArchive((s) => s.currentMachine);
  const [interlude, setInterlude] = useState<MachineId | null>(null);

  // Unfold choreography — the interface assembles itself mechanically.
  useLayoutEffect(() => {
    const q = gsap.utils.selector(root.current);
    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.15 })
        .from(q('.a-header'), { yPercent: -100, duration: 0.9, ease: EASE.mech })
        .from(q('.archive__rail'), { xPercent: -100, duration: 1.0, ease: EASE.mech }, 0.1)
        .from(q('.m-index__row'), { x: -40, autoAlpha: 0, duration: 0.7, ease: EASE.settle, stagger: 0.07 }, 0.55)
        .from(q('.archive__stage-grid'), { scaleY: 0, duration: 1.2, ease: EASE.mech, transformOrigin: 'top' }, 0.4);
    }, root);
    return () => ctx.revert();
  }, []);

  const go = useCallback((id: MachineId | null) => {
    const label = id ? `${id} — RETRIEVING OBJECT` : 'RETURNING TO INDEX';
    return shutter.run(label, () => {
      archive.set({ currentMachine: id });
      if (id) {
        archive.discoverMachine(id);
        if (INTERLUDES[id] && !seenInterludes.has(id)) {
          seenInterludes.add(id);
          setInterlude(id);
        }
      } else {
        setInterlude(null);
      }
      const hash = id ? `#/${machineById(id).slug}` : '#/';
      if (location.hash !== hash) history.pushState(null, '', hash);
    });
  }, []);

  // Deep links and the back button.
  useEffect(() => {
    const fromHash = machineFromHash();
    if (fromHash && fromHash !== archive.get().currentMachine) void go(fromHash);
    const onPop = () => {
      const id = machineFromHash();
      if (id !== archive.get().currentMachine) void go(id);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [go]);

  // Escape returns to the reading room.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && archive.get().currentMachine) void go(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const View = current ? MACHINE_VIEWS[current] : null;

  return (
    <div ref={root} className="archive">
      <ArchiveHeader onHome={() => current && go(null)} />
      <div className="archive__body">
        <aside className="archive__rail">
          <MachineIndex current={current} onOpen={(id) => id !== current && go(id)} />
        </aside>
        <main className="archive__stage">
          <div className="archive__stage-grid" aria-hidden="true" />
          {View ? (
            <Suspense fallback={<StageLoading />}>
              <View onExit={() => go(null)} ready={!interlude} />
            </Suspense>
          ) : (
            <ReadingRoom onWake={() => go('M-001')} />
          )}
          {interlude && INTERLUDES[interlude] && (
            <Interlude beats={INTERLUDES[interlude]!} onDone={() => setInterlude(null)} />
          )}
          <Shutter />
        </main>
      </div>
    </div>
  );
}

function StageLoading() {
  return (
    <div className="archive__loading t-mono-s">
      <ScrambleText text="RETRIEVING SPECIMEN" />
    </div>
  );
}

/** The empty reading room. Almost nothing, on purpose. */
function ReadingRoom({ onWake }: { onWake: () => void }) {
  const memories = useArchive((s) => s.memoriesStored);
  const visits = useArchive((s) => s.visits);
  return (
    <div className="reading-room">
      <p className="reading-room__line t-mono">
        <ScrambleText text="SIX OBJECTS." delay={1200} duration={500} />
        <br />
        <button className="reading-room__wake" onClick={onWake} data-cursor="hover">
          <ScrambleText text="ONE OF THEM IS AWAKE." delay={1900} duration={800} />
        </button>
      </p>
      <dl className="reading-room__log t-mono-s">
        <div>
          <dt>VISIT</dt>
          <dd>{String(visits).padStart(4, '0')}</dd>
        </div>
        <div>
          <dt>MEMORIES HELD</dt>
          <dd>{String(memories).padStart(4, '0')}</dd>
        </div>
        <div>
          <dt>CURATOR</dt>
          <dd>ABSENT</dd>
        </div>
      </dl>
    </div>
  );
}
