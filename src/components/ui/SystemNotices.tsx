import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { notices } from './notices';
import { audio } from '../../audio/AudioEngine';
import { ScrambleText } from '../typography/ScrambleText';
import './notices.css';

export function SystemNotices() {
  const { alert, whispers } = useSyncExternalStore(notices.subscribe, notices.get);
  const [responded, setResponded] = useState<string | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setResponded(null);
    if (!alert) return;
    audio.warn();
    returnFocus.current = document.activeElement as HTMLElement | null;
    btn.current?.focus({ preventScroll: true });
    return () => {
      // hand focus back to whatever the visitor was holding
      returnFocus.current?.focus?.({ preventScroll: true });
    };
  }, [alert]);

  const act = () => {
    if (!alert) return;
    audio.click();
    alert.onAction?.();
    if (alert.response) {
      setResponded(alert.response);
      window.setTimeout(() => notices.dismiss(), 1400);
    } else {
      notices.dismiss();
    }
  };

  return (
    <>
      {alert && (
        <div className="sys-alert" role="alertdialog" aria-labelledby="sys-alert-code" aria-describedby="sys-alert-body">
          <div className="sys-alert__panel">
            <div className="sys-alert__bar t-mono-s">
              <span id="sys-alert-code">{alert.code}</span>
              <span className="sys-alert__blink" />
            </div>
            {responded ? (
              <p className="sys-alert__body sys-alert__body--response t-mono">
                <ScrambleText text={responded} />
              </p>
            ) : (
              <>
                <p id="sys-alert-body" className="sys-alert__body t-mono">
                  {alert.body}
                </p>
                <button ref={btn} className="bracket-btn sys-alert__action" onClick={act} data-cursor="hover">
                  {alert.action}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="whispers" aria-live="polite">
        {whispers.map((w) => (
          <p key={w.id} className={`whisper t-mono ${w.tone === 'signal' ? 'signal' : ''}`}>
            <ScrambleText text={w.text} duration={500} />
          </p>
        ))}
      </div>
    </>
  );
}
