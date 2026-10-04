export type MachineId = 'M-001' | 'M-002' | 'M-003' | 'M-004' | 'M-005' | 'M-006';

export interface MachineRecord {
  id: MachineId;
  slug: string;
  number: string;
  name: string;
  /** Hidden symbol the machine yields once completed. */
  symbol: string;
  /** The single sentence the archive leaves behind. Never explained. */
  hint: string;
  /** Catalogue microcopy shown in the index. */
  classification: string;
  /** Whether the object has been built into this archive yet. */
  available: boolean;
}

export const MACHINES: readonly MachineRecord[] = [
  {
    id: 'M-001',
    slug: 'm-001',
    number: '001',
    name: 'Memory Engine',
    symbol: '◇',
    hint: 'Memory can be stored.',
    classification: 'LUMINOUS STORAGE',
    available: true,
  },
  {
    id: 'M-002',
    slug: 'm-002',
    number: '002',
    name: 'Gravity Printer',
    symbol: '∆',
    hint: 'Gravity can be rewritten.',
    classification: 'TYPOGRAPHIC MASS',
    available: false,
  },
  {
    id: 'M-003',
    slug: 'm-003',
    number: '003',
    name: 'Time Eater',
    symbol: '○',
    hint: 'Time can be consumed.',
    classification: 'TEMPORAL DIGESTION',
    available: false,
  },
  {
    id: 'M-004',
    slug: 'm-004',
    number: '004',
    name: 'Emotion Reactor',
    symbol: '⬡',
    hint: 'Emotion can be measured.',
    classification: 'AFFECTIVE FIELD',
    available: false,
  },
  {
    id: 'M-005',
    slug: 'm-005',
    number: '005',
    name: 'Cursor Observatory',
    symbol: '⊙',
    hint: 'Observation changes behaviour.',
    classification: 'RECIPROCAL OPTICS',
    available: false,
  },
  {
    id: 'M-006',
    slug: 'm-006',
    number: '006',
    name: 'Universe Generator',
    symbol: '?',
    hint: 'Creation creates observers.',
    classification: 'ORIGIN APPARATUS',
    available: false,
  },
] as const;

export const machineById = (id: MachineId) => MACHINES.find((m) => m.id === id)!;
export const machineBySlug = (slug: string) => MACHINES.find((m) => m.slug === slug) ?? null;
