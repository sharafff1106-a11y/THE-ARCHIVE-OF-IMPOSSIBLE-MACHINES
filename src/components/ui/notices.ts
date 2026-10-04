/**
 * Two channels for the archive to speak:
 *
 *  - whisper(): small ephemeral line in the corner. Easter eggs, asides.
 *  - alert():   a fake system error with a bracketed response.
 */

export interface SystemAlert {
  id: number;
  code: string;
  body: string;
  action: string;
  /** Text shown after the action is taken, before dismissal. */
  response?: string;
  onAction?: () => void;
}

export interface Whisper {
  id: number;
  text: string;
  tone?: 'signal' | 'default';
}

type State = { alert: SystemAlert | null; whispers: Whisper[] };

let state: State = { alert: null, whispers: [] };
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const notices = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  whisper(text: string, tone: Whisper['tone'] = 'default', ms = 4200) {
    const w = { id: ++seq, text, tone };
    state = { ...state, whispers: [...state.whispers.slice(-2), w] };
    emit();
    window.setTimeout(() => {
      state = { ...state, whispers: state.whispers.filter((x) => x.id !== w.id) };
      emit();
    }, ms);
  },

  alert(a: Omit<SystemAlert, 'id'>) {
    if (state.alert) return;
    state = { ...state, alert: { ...a, id: ++seq } };
    emit();
  },

  dismiss() {
    state = { ...state, alert: null };
    emit();
  },
};
