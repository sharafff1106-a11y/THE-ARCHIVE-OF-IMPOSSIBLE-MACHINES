/**
 * Motion vocabulary. Each machine state has its own way of moving:
 *
 *   DORMANT    — barely anything; long, heavy, damped.
 *   AWAKENING  — hesitant mechanical steps.
 *   ACTIVE     — confident, continuous.
 *   OVERLOAD   — fast, jittery, slightly wrong.
 *   COMPLETE   — nothing. A cut.
 */
export const EASE = {
  /** Parts sliding on rails: slow start, hard stop. */
  mech: 'power4.inOut',
  /** Things arriving and settling. */
  settle: 'expo.out',
  /** Heavy objects released. */
  drop: 'power3.in',
  /** Discrete stepped motion — servos, counters. */
  servo: 'steps(6)',
  /** Spring-back on levers. */
  spring: 'elastic.out(1, 0.38)',
} as const;
