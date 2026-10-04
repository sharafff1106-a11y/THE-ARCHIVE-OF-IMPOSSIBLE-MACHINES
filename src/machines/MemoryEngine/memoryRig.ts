/**
 * The Memory Engine's live state. A plain mutable object shared between the
 * DOM control plate and the WebGL scene, read every frame by both — so the
 * machine can run at 60fps without React rendering anything.
 *
 * React state is reserved for discrete changes (the machine's phase).
 */

export type MemoryPhase = 'dormant' | 'awakening' | 'active' | 'overload' | 'complete';

export type MemoryPart = 'chamber' | 'core' | 'gimbal-outer' | 'gimbal-inner' | 'governor' | 'crown' | 'plinth' | 'cable' | 'capacitor';

export interface MemoryRig {
  /** Input value from the dial, 0..100. */
  capacity: number;
  /** Eased capacity the machine actually "feels". */
  energy: number;
  /** When true, all motion halts in place. */
  frozen: boolean;
  /** Accumulated flow time for particles — stops when frozen. */
  flow: number;
  /** Transient impulses, decay to 0. */
  ringKick: number;
  corePulse: number;
  purge: number;
  /** Lights forced off (cable gag). */
  blackout: number;
  /** Signal-red override on the LEDs (warning button). */
  alarm: number;
  /** Seconds the crown spends looking at the visitor. */
  watch: number;
  /** Normalised pointer, -1..1. */
  pointer: { x: number; y: number };
  hovered: MemoryPart | null;
  /** Camera intro gate. */
  revealed: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
}

export function createMemoryRig(reducedMotion: boolean, lowPower: boolean): MemoryRig {
  return {
    capacity: 0,
    energy: 0,
    frozen: false,
    flow: 0,
    ringKick: 0,
    corePulse: 0,
    purge: 0,
    blackout: 0,
    alarm: 0,
    watch: 0,
    pointer: { x: 0, y: 0 },
    hovered: null,
    revealed: false,
    reducedMotion,
    lowPower,
  };
}

export function phaseFor(capacity: number): MemoryPhase {
  if (capacity >= 100) return 'complete';
  if (capacity >= 90) return 'overload';
  if (capacity >= 60) return 'active';
  if (capacity >= 20) return 'awakening';
  return 'dormant';
}

/** Smooth 0..1 ramp of `x` between edges. */
export const ramp = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

export const PART_NOTES: Record<MemoryPart, { name: string; spec: string; note: string }> = {
  chamber: { name: 'RETENTION CHAMBER', spec: 'BOROSILICATE · 4.2 MM · Ø 1.24 M', note: 'TAP GENTLY' },
  core: { name: 'MEMORY PLATES ×9', spec: 'SILVER HALIDE ON NICKEL', note: 'DO NOT LOOK DIRECTLY' },
  'gimbal-outer': { name: 'GIMBAL I — EXTERNAL', spec: 'ROTATION Ø 2.56 M · BRASS', note: 'HOLDS THE PAST STEADY' },
  'gimbal-inner': { name: 'GIMBAL II — INTERNAL', spec: 'ROTATION Ø 2.20 M · BRASS', note: 'HOLDS THE PRESENT STEADY' },
  governor: { name: 'GOVERNOR BAND', spec: '12 BEARINGS · TOL ±0.002', note: 'REGULATES NOSTALGIA' },
  crown: { name: 'EMISSION CROWN', spec: 'APERTURE 0.08 M', note: 'IT IS NOT AN EYE' },
  plinth: { name: 'PLINTH / LED REGISTER', spec: '24 INDICATORS · CAST IRON', note: 'COUNTS SOMETHING' },
  cable: { name: 'CABLE 07', spec: '11 KV · CLOTH SHEATH', note: 'DO NOT UNPLUG' },
  capacitor: { name: 'CAPACITOR BANK', spec: '3 × 400 µF · VINTAGE 19—', note: 'WARM TO THE TOUCH' },
};
