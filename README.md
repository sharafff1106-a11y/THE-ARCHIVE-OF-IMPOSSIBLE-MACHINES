# The Archive of Impossible Machines

An experimental interactive art piece: a classified institution that catalogues machines which should not exist.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Project, visual system, typography, cursor, navigation, transitions | ✅ |
| 2 | **M-001 Memory Engine** | ✅ |
| 3–8 | Gravity Printer · Time Eater · Emotion Reactor · Cursor Observatory · Universe Generator · Archive 000 | sealed in the index |
| 9–11 | Performance pass · mobile pass · full easter-egg set | partially done (see below) |

## Architecture

```
src/
├── animation/easings        motion vocabulary per machine state
├── audio/AudioEngine.ts     procedural Web Audio (no samples), off by default
├── components/
│   ├── cursor/              ArchiveCursor + cursorBus (DOM modes, WebGL overrides)
│   ├── navigation/          ArchiveHeader (symbol ledger, toggles), MachineIndex
│   ├── transitions/         Shutter (mechanical plates), Interlude (negative space)
│   ├── typography/          Chars (split text), ScrambleText (readouts)
│   └── ui/                  MechanicalDial (reusable), SystemNotices (fake errors, whispers)
├── data/machines.ts         catalogue: ids, symbols, hints
├── hooks/useArchiveWatchers stillness, resize, console, the typed word
├── machines/MemoryEngine/   control plate, rig (shared mutable state), memory images
├── scenes/                  Boot, Threshold, ArchiveScene, MemoryScene (R3F)
├── shaders/                 GPU-only memory particles
└── state/archiveStore.ts    central store, persisted to localStorage
```

Performance rules followed:

- Per-frame state lives in a mutable **rig** shared by the DOM and WebGL, not in React state, so React only renders when the machine changes phase.
- Particles run entirely on the GPU. Freezing the machine means the flow uniform stops advancing.
- three.js is code-split and only fetched when a machine is opened. It is prefetched while the visitor reads the threshold.
- The canvas stops rendering when it's off-screen or the tab is hidden. Geometries, materials and textures are disposed on unmount.
- Coarse pointers and low core counts get fewer particles, a lower DPR cap and no MSAA.

## M-001 — Memory Engine

Rotate the dial (drag, touch, or arrow keys / PageUp / Home / End). The machine moves through **dormant → awakening → active → overload → complete**, and each state has its own lights, gear speed, camera shot and sound. At 100% everything stops, the sound cuts out, and the machine stores a memory. Not every part is documented.

## Easter eggs so far

The logo · stillness · resizing · the console · a word · a button that does nothing · cable 07 · the crown · knocking on sealed doors.

## Accessibility

Keyboard-operable dial and lever, visible focus, a reduced-motion toggle (it also follows `prefers-reduced-motion`), sound off by default, and semantic buttons and labels throughout.
