/**
 * Cursor modes are normally read from the nearest `[data-cursor]` ancestor of
 * whatever is under the pointer. WebGL objects have no DOM, so scenes push
 * an override here instead (e.g. a reticle while hovering a machine part).
 */

export type CursorMode = 'default' | 'hover' | 'drag' | 'reticle' | 'crosshair' | 'hidden';

let override: CursorMode | null = null;
let label: string | null = null;
const listeners = new Set<() => void>();

export const cursorBus = {
  get override() {
    return override;
  },
  get label() {
    return label;
  },
  set(mode: CursorMode | null, text: string | null = null) {
    if (mode === override && text === label) return;
    override = mode;
    label = text;
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
