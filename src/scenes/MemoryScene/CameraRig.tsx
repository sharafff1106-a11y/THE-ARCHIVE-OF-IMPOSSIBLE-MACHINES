import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MemoryRig } from '../../machines/MemoryEngine/memoryRig';

type Shot = { pos: [number, number, number]; look: [number, number, number]; speed: number };

/**
 * The viewport is a camera operator with a shot list:
 *
 *   establishing — far away, high, before the visitor is allowed close
 *   medium       — dormant: the whole object, slightly below eye level
 *   orbit        — awakening: a slow lateral drift begins
 *   close        — active: in on the mechanism
 *   extreme      — overload: pressed against the glass
 *
 * When the machine freezes, so does the camera.
 */
const SHOTS: Record<string, Shot> = {
  establishing: { pos: [0, 2.6, 17], look: [0, 0.2, 0], speed: 0.6 },
  medium: { pos: [0, 0.25, 8.6], look: [0, 0.0, 0], speed: 0.9 },
  orbit: { pos: [1.4, 0.6, 7.6], look: [0, 0.1, 0], speed: 0.7 },
  close: { pos: [2.1, 0.9, 5.6], look: [0, 0.35, 0], speed: 0.9 },
  extreme: { pos: [0.35, 1.25, 3.7], look: [0, 0.95, 0], speed: 1.6 },
};

export function CameraRig({ rig }: { rig: MemoryRig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const look = useMemo(() => new THREE.Vector3(0, 0.2, 0), []);
  const goalPos = useMemo(() => new THREE.Vector3(), []);
  const goalLook = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (rig.frozen) return;
    const dt = Math.min(delta, 0.05);
    const e = rig.energy;
    const shot = !rig.revealed
      ? SHOTS.establishing
      : e >= 90
        ? SHOTS.extreme
        : e >= 60
          ? SHOTS.close
          : e >= 20
            ? SHOTS.orbit
            : SHOTS.medium;

    // narrow viewports need more distance to keep the object in frame
    const aspect = size.width / Math.max(1, size.height);
    const fit = aspect < 1 ? 1 + (1 - aspect) * 1.1 : 1;

    const t = state.clock.elapsedTime;
    const drift = rig.reducedMotion ? 0 : Math.sin(t * 0.12) * 0.25;
    const px = rig.reducedMotion ? 0 : rig.pointer.x * 0.45;
    const py = rig.reducedMotion ? 0 : rig.pointer.y * 0.25;

    goalPos.set(shot.pos[0] * fit + drift + px, shot.pos[1] + py, shot.pos[2] * fit);
    goalLook.set(...shot.look);

    const k = 1 - Math.exp(-dt * shot.speed * (rig.reducedMotion ? 2.5 : 1));
    camera.position.lerp(goalPos, k);
    look.lerp(goalLook, k);
    camera.lookAt(look);
  });

  return null;
}
