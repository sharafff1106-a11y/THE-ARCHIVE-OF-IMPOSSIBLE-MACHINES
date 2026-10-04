import { useSyncExternalStore } from 'react';
import type { MachineId } from '../data/machines';

/**
 * Centralised archive state.
 *
 * A tiny external store (no dependency) read through useSyncExternalStore
 * with selectors, so components only re-render for the slice they use.
 * Anything that changes every frame lives in refs, never here.
 */

export type ArchivePhase = 'boot' | 'threshold' | 'archive';
export type MachineStatus = 'locked' | 'dormant' | 'active' | 'complete';

export interface ArchiveState {
  phase: ArchivePhase;
  currentMachine: MachineId | null;
  discoveredMachines: MachineId[];
  discoveredSymbols: string[];
  soundEnabled: boolean;
  reducedMotion: boolean;
  archive000Unlocked: boolean;
  /** How many times this browser has opened the archive. */
  visits: number;
  memoriesStored: number;
  nightShift: boolean;
}

const STORAGE_KEY = 'aim.archive.v1';

type Persisted = Pick<
  ArchiveState,
  'discoveredMachines' | 'discoveredSymbols' | 'archive000Unlocked' | 'visits' | 'memoriesStored'
> & { reducedMotionOverride?: boolean | null };

function systemPrefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readPersisted(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
  } catch {
    return {};
  }
}

const persisted = readPersisted();
let reducedMotionOverride: boolean | null = persisted.reducedMotionOverride ?? null;

let state: ArchiveState = {
  phase: 'boot',
  currentMachine: null,
  discoveredMachines: persisted.discoveredMachines ?? [],
  discoveredSymbols: persisted.discoveredSymbols ?? [],
  // Sound is never assumed. The visitor must ask for it.
  soundEnabled: false,
  reducedMotion: reducedMotionOverride ?? systemPrefersReducedMotion(),
  archive000Unlocked: persisted.archive000Unlocked ?? false,
  visits: (persisted.visits ?? 0) + 1,
  memoriesStored: persisted.memoriesStored ?? 0,
  nightShift: false,
};

const listeners = new Set<() => void>();

function persist() {
  const data: Persisted = {
    discoveredMachines: state.discoveredMachines,
    discoveredSymbols: state.discoveredSymbols,
    archive000Unlocked: state.archive000Unlocked,
    visits: state.visits,
    memoriesStored: state.memoriesStored,
    reducedMotionOverride,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* private mode — the archive simply forgets */
  }
}

persist();

export const archive = {
  get: () => state,

  set(patch: Partial<ArchiveState> | ((s: ArchiveState) => Partial<ArchiveState>)) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...next };
    persist();
    listeners.forEach((l) => l());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // ── Domain actions ──────────────────────────────────────

  discoverMachine(id: MachineId) {
    if (state.discoveredMachines.includes(id)) return;
    archive.set((s) => ({ discoveredMachines: [...s.discoveredMachines, id] }));
  },

  /** Returns true when the symbol is new. */
  discoverSymbol(symbol: string) {
    if (state.discoveredSymbols.includes(symbol)) return false;
    archive.set((s) => {
      const discoveredSymbols = [...s.discoveredSymbols, symbol];
      return { discoveredSymbols, archive000Unlocked: discoveredSymbols.length >= 6 };
    });
    return true;
  },

  setReducedMotion(value: boolean) {
    reducedMotionOverride = value;
    archive.set({ reducedMotion: value });
  },
};

export function useArchive<T>(selector: (s: ArchiveState) => T): T {
  return useSyncExternalStore(
    archive.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
