import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Apparatus } from './Apparatus';
import { CameraRig } from './CameraRig';
import type { MemoryPart, MemoryRig } from '../../machines/MemoryEngine/memoryRig';

interface Props {
  rig: MemoryRig;
  onHover: (part: MemoryPart | null) => void;
  onPart: (part: MemoryPart) => void;
}

/** A neutral studio reflection so the metals read as metal. Generated, not downloaded. */
function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    };
  }, [gl, scene]);
  return null;
}

/**
 * The specimen chamber. Rendering pauses whenever the stage is off-screen
 * or the tab is hidden — inactive scenes cost nothing.
 */
export default function MemoryScene({ rig, onHover, onPart }: Props) {
  const [visible, setVisible] = useState(true);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!host) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.01 });
    io.observe(host);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [host]);

  return (
    <div ref={setHost} className="memory-scene">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, rig.lowPower ? 1.25 : 1.75]}
        camera={{ fov: 30, position: [0, 2.6, 17], near: 0.1, far: 60 }}
        gl={{ antialias: !rig.lowPower, powerPreference: 'high-performance', alpha: false }}
        onPointerMissed={() => onHover(null)}
      >
        <color attach="background" args={['#0b1b35']} />
        <fog attach="fog" args={['#0b1b35', 9, 24]} />
        <hemisphereLight args={['#c9d3e6', '#0b1b35', 0.55]} />
        <directionalLight position={[4, 6, 5]} intensity={1.7} color="#fff1dc" />
        <directionalLight position={[-5, 3, -4]} intensity={1.4} color="#7fa3d6" />
        <StudioEnvironment />
        <Apparatus rig={rig} onHover={onHover} onPart={onPart} />
        <CameraRig rig={rig} />
      </Canvas>
    </div>
  );
}
