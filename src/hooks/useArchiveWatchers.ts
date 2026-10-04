import { useEffect } from 'react';
import { notices } from '../components/ui/notices';
import { archive } from '../state/archiveStore';

/**
 * The archive pays attention. Global, low-cost observers that power a few
 * of the easter eggs: stillness, resizing, the console, the night shift.
 */
export function useArchiveWatchers() {
  // Night shift + reduced-motion reflect onto <html> for CSS.
  useEffect(() => {
    const apply = () => {
      const s = archive.get();
      const root = document.documentElement;
      if (s.nightShift) root.dataset.shift = 'night';
      else delete root.dataset.shift;
      root.classList.toggle('reduced-motion', s.reducedMotion);
    };
    apply();
    return archive.subscribe(apply);
  }, []);

  // Developer console greeting. Nothing sensitive — there is nothing to find.
  useEffect(() => {
    const big = 'font: 400 28px "Instrument Serif", serif; color: #B74336;';
    const mono = 'font: 11px "IBM Plex Mono", monospace; color: #7B8088; letter-spacing: 0.1em;';
    console.log('%cHELLO, CURIOUS HUMAN.', big);
    console.log(
      '%cYou opened the back of the cabinet.\nMost visitors never do.\n\nThe machines are listening for a word.\nIt is the word written on the door.',
      mono,
    );
  }, []);

  // Stillness. 60 seconds without input and the archive notices.
  useEffect(() => {
    let timer = 0;
    let noticed = 0;
    const lines = ['YOU HAVE NOT MOVED FOR 60 SECONDS.', 'THE ARCHIVE HAS NOTICED.', 'IT IS ALSO VERY STILL.'];
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (archive.get().phase !== 'archive') return arm();
        notices.whisper(lines[Math.min(noticed, 1)], 'default', 5200);
        if (noticed++ > 0) window.setTimeout(() => notices.whisper(lines[2]), 1800);
        arm();
      }, 60_000);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, []);

  // The word on the door. Typed anywhere, it opens the curator's note.
  useEffect(() => {
    const WORD = 'IMPOSSIBLE';
    let buffer = '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey) return;
      buffer = (buffer + e.key.toUpperCase()).slice(-WORD.length);
      if (buffer === WORD) {
        buffer = '';
        notices.alert({
          code: "CURATOR'S NOTE / 07",
          body: 'SIX MACHINES.\nSIX SYMBOLS.\nONE DOOR WITHOUT A HANDLE.\n\nDO NOT LOOK FOR IT.',
          action: 'I WILL NOT',
          response: 'LIAR.',
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Resizing. Once is reasonable. Repeatedly is suspicious.
  useEffect(() => {
    let count = 0;
    let settle = 0;
    let cooldown = 0;
    const onResize = () => {
      count++;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const now = Date.now();
        if (count > 6 && now > cooldown && archive.get().phase === 'archive') {
          cooldown = now + 30_000;
          notices.whisper('WHY ARE YOU DOING THAT?', 'signal');
        }
        count = 0;
      }, 500);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
}
