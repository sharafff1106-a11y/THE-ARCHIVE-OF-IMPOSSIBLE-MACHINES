import { useRef } from 'react';
import { archive, useArchive } from '../../state/archiveStore';
import { MACHINES } from '../../data/machines';
import { audio } from '../../audio/AudioEngine';
import { notices } from '../ui/notices';
import { ScrambleText } from '../typography/ScrambleText';
import './header.css';

export function ArchiveHeader({ onHome }: { onHome: () => void }) {
  const sound = useArchive((s) => s.soundEnabled);
  const reduced = useArchive((s) => s.reducedMotion);
  const symbols = useArchive((s) => s.discoveredSymbols);
  const logoClicks = useRef<{ n: number; t: number }>({ n: 0, t: 0 });

  const toggleSound = () => {
    const next = !sound;
    if (next) audio.enable();
    else audio.disable();
    archive.set({ soundEnabled: next });
    audio.click();
  };

  const toggleMotion = () => {
    archive.setReducedMotion(!reduced);
    audio.click();
  };

  // Easter egg — the logo, pressed seven times, changes the shift.
  const logo = () => {
    const c = logoClicks.current;
    const now = performance.now();
    c.n = now - c.t < 900 ? c.n + 1 : 1;
    c.t = now;
    audio.blip(c.n > 4);
    if (c.n === 7) {
      c.n = 0;
      const night = !archive.get().nightShift;
      archive.set({ nightShift: night });
      notices.whisper(night ? 'NIGHT SHIFT. THE CURATOR IS ASLEEP.' : 'DAY SHIFT RESUMED. NOTHING HAPPENED.');
      return;
    }
    if (c.n === 1) onHome();
  };

  return (
    <header className="a-header">
      <button className="a-header__logo" onClick={logo} data-cursor="hover" aria-label="Archive index">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M10 1.5 L18.5 10 L10 18.5 L1.5 10 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="10" cy="10" r="1.6" fill="var(--signal)" />
        </svg>
        <span className="t-mono">A.I.M.</span>
        <span className="a-header__sub t-mono-s">ARCHIVE OF IMPOSSIBLE MACHINES</span>
      </button>

      <div className="a-header__ledger t-mono-s" aria-label={`Symbols recovered: ${symbols.length} of 6`}>
        <span className="a-header__ledger-label">RECOVERED</span>
        {MACHINES.map((m) => {
          const found = symbols.includes(m.symbol);
          return (
            <span
              key={m.id}
              className={`a-header__slot ${found ? 'is-found' : ''}`}
              data-cursor="crosshair"
              title={found ? m.id : 'UNRECOVERED'}
            >
              {found ? m.symbol : '·'}
            </span>
          );
        })}
      </div>

      <div className="a-header__controls">
        <button className="a-header__toggle t-mono-s" onClick={toggleMotion} data-cursor="hover" aria-pressed={reduced}>
          MOTION <ScrambleText text={reduced ? 'LOW' : 'FULL'} className="a-header__val" />
        </button>
        <button className="a-header__toggle t-mono-s" onClick={toggleSound} data-cursor="hover" aria-pressed={sound}>
          SOUND <ScrambleText text={sound ? 'ON' : 'OFF'} className={`a-header__val ${sound ? 'is-on' : ''}`} />
        </button>
      </div>
    </header>
  );
}
