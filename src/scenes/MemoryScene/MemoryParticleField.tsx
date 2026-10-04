import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { memoryParticleFragment, memoryParticleVertex } from '../../shaders/memoryParticles';
import { ramp, type MemoryRig } from '../../machines/MemoryEngine/memoryRig';

/** Luminous memory particles. One draw call, fully GPU-animated. */
export function MemoryParticleField({ rig, count }: { rig: MemoryRig; count: number }) {
  const gl = useThree((s) => s.gl);
  const points = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));

    const material = new THREE.ShaderMaterial({
      vertexShader: memoryParticleVertex,
      fragmentShader: memoryParticleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uFlow: { value: 0 },
        uDust: { value: 0 },
        uEmit: { value: 0 },
        uPurge: { value: 0 },
        uOverload: { value: 0 },
        uSize: { value: 11 },
        uPixelRatio: { value: 1 },
        uColor: { value: new THREE.Color('#f6e2b8') },
        uHeatColor: { value: new THREE.Color('#e0634f') },
      },
    });
    return { geometry, material };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const u = material.uniforms;
    const e = rig.energy;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uFlow.value = rig.flow;
    if (rig.frozen) return;
    u.uDust.value = ramp(e, 58, 72) * (1 - rig.blackout);
    u.uEmit.value = ramp(e, 78, 90) * (1 - rig.blackout);
    u.uOverload.value = ramp(e, 88, 100);
    u.uPurge.value = rig.purge;
    points.current!.visible = u.uDust.value > 0.001 || u.uEmit.value > 0.001 || rig.purge > 0.001;
  });

  return (
    <points
      ref={points}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      raycast={() => null}
      renderOrder={2}
    />
  );
}
