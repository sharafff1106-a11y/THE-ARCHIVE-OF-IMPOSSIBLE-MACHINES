import { useRef } from 'react';
import { MACHINES, type MachineId, type MachineRecord } from '../../data/machines';
import { useArchive } from '../../state/archiveStore';
import { scrambleInto } from '../../utils/scramble';
import { audio } from '../../audio/AudioEngine';
import { notices } from '../ui/notices';
import './index.css';

interface Props {
  current: MachineId | null;
  onOpen: (id: MachineId) => void;
}

const SEALED_REPLIES = [
  'SEALED.',
  'STILL SEALED.',
  'IT CAN HEAR YOU KNOCKING.',
  'NOT YET.',
  'PATIENCE IS ALSO A MACHINE.',
];

/**
 * The vertical catalogue. Objects not yet catalogued are sealed — they are
 * present, they just refuse.
 */
export function MachineIndex({ current, onOpen }: Props) {
  const discovered = useArchive((s) => s.discoveredMachines);
  const knocks = useRef(0);

  return (
    <nav className="m-index" aria-label="Machine index">
      <div className="m-index__head t-mono-s">
        <span>INDEX</span>
        <span>06 OBJECTS</span>
      </div>
      <ol className="m-index__list">
        {MACHINES.map((m, i) => (
          <IndexRow
            key={m.id}
            machine={m}
            index={i}
            active={current === m.id}
            visited={discovered.includes(m.id)}
            onOpen={() => {
              if (m.available) {
                audio.click();
                onOpen(m.id);
              } else {
                audio.warn();
                const reply = SEALED_REPLIES[Math.min(knocks.current++, SEALED_REPLIES.length - 1)];
                notices.whisper(`${m.id} — ${reply}`);
                if (knocks.current === 7) {
                  notices.alert({
                    code: 'ERROR 0081',
                    body: 'THIS MACHINE\nSHOULD NOT EXIST.',
                    action: 'IGNORE',
                    response: 'IGNORED.',
                  });
                }
              }
            }}
          />
        ))}
      </ol>
      <div className="m-index__foot t-mono-s">
        <span>ARCHIVE 000</span>
        <span className="m-index__redacted" data-cursor="crosshair" title="REDACTED">
          ██████
        </span>
      </div>
    </nav>
  );
}

function IndexRow({
  machine,
  index,
  active,
  visited,
  onOpen,
}: {
  machine: MachineRecord;
  index: number;
  active: boolean;
  visited: boolean;
  onOpen: () => void;
}) {
  const num = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const base = machine.available ? (visited ? 'CATALOGUED' : 'AWAKE') : 'SEALED';

  const enter = () => {
    audio.tick(index / 6);
    if (num.current) scrambleInto(num.current, machine.number, { duration: 260 });
    if (status.current)
      scrambleInto(status.current, machine.available ? machine.classification : 'CALIBRATION PENDING', { duration: 360 });
  };
  const leave = () => {
    if (status.current) scrambleInto(status.current, base, { duration: 260 });
  };

  return (
    <li
      className={`m-index__row ${active ? 'is-active' : ''} ${machine.available ? '' : 'is-sealed'}`}
      style={{ ['--i' as string]: index }}
    >
      <button
        className="m-index__btn"
        onClick={onOpen}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocus={enter}
        onBlur={leave}
        data-cursor="hover"
        aria-current={active ? 'page' : undefined}
        aria-label={`${machine.id} ${machine.name}${machine.available ? '' : ', sealed'}`}
      >
        <span ref={num} className="m-index__num t-mono">
          {machine.number}
        </span>
        <span className="m-index__name t-serif">{machine.name}</span>
        <span className="m-index__status t-mono-s">
          {machine.available && !visited && <i className="m-index__pulse" />}
          <span ref={status}>{base}</span>
        </span>
      </button>
    </li>
  );
}
