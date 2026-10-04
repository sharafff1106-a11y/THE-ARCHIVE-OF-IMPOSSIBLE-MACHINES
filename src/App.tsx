import { useState } from 'react';
import { BootSequence } from './scenes/Boot/BootSequence';
import { Threshold } from './scenes/Threshold/Threshold';
import { ArchiveScene, prefetchMachines } from './scenes/ArchiveScene/ArchiveScene';
import { ArchiveCursor } from './components/cursor/ArchiveCursor';
import { SystemNotices } from './components/ui/SystemNotices';
import { useArchiveWatchers } from './hooks/useArchiveWatchers';
import { archive, useArchive } from './state/archiveStore';

/**
 * Phase switch only. Each phase owns its own choreography; the threshold
 * stays mounted above the archive while it tears open.
 */
export function App() {
  const phase = useArchive((s) => s.phase);
  const [thresholdMounted, setThresholdMounted] = useState(false);
  useArchiveWatchers();

  return (
    <>
      {phase === 'boot' && (
        <BootSequence
          onComplete={() => {
            setThresholdMounted(true);
            prefetchMachines();
            archive.set({ phase: 'threshold' });
          }}
        />
      )}
      {phase === 'archive' && <ArchiveScene />}
      {thresholdMounted && (
        <Threshold onUnfold={() => archive.set({ phase: 'archive' })} onGone={() => setThresholdMounted(false)} />
      )}
      <SystemNotices />
      <ArchiveCursor />
    </>
  );
}
