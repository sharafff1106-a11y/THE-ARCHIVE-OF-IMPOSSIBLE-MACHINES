import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { createMemoryMaterials } from './materials';
import { MemoryParticleField } from './MemoryParticleField';
import { ramp, type MemoryPart, type MemoryRig } from '../../machines/MemoryEngine/memoryRig';

interface Props {
  rig: MemoryRig;
  onHover: (part: MemoryPart | null) => void;
  onPart: (part: MemoryPart) => void;
}

const LED_COUNT = 24;
const PLATE_COUNT = 9;
const TAU = Math.PI * 2;

/**
 * M-001. Built like an instrument, not a prop: a cast plinth with an LED
 * register, a borosilicate retention chamber in a tie-rod cage, nine
 * memory plates on a spindle, a governor band, two precessing rings, an
 * emission crown carried by side struts, and the cabling that feeds it.
 *
 * Dimensions are chosen so nothing that rotates can ever intersect
 * anything else — it should look like it could actually run.
 */
export function Apparatus({ rig, onHover, onPart }: Props) {
  const mats = useMemo(createMemoryMaterials, []);
  useEffect(() => () => mats.dispose(), [mats]);

  const machine = useRef<THREE.Group>(null);
  const ringOuter = useRef<THREE.Group>(null);
  const ringInner = useRef<THREE.Group>(null);
  const governor = useRef<THREE.Group>(null);
  const crown = useRef<THREE.Group>(null);
  const plates = useRef<Array<THREE.Mesh | null>>([]);
  const leds = useRef<THREE.InstancedMesh>(null);
  const coreLight = useRef<THREE.PointLight>(null);
  const hoverRef = useRef<MemoryPart | null>(null);
  const ledKey = useRef('');

  // ── Geometry built once ──────────────────────────────────
  const geo = useMemo(() => {
    const curve = (pts: number[][]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const cables = [
      curve([[1.25, -1.0, -1.05], [1.9, -1.2, -0.9], [2.7, -1.55, -0.3], [4.8, -1.56, 0.9]]),
      curve([[-0.75, -1.05, -0.72], [-1.6, -1.35, -1.1], [-2.6, -1.55, -1.5], [-5.2, -1.56, -2.4]]),
      curve([[1.56, 1.0, -0.06], [2.0, 1.6, -0.6], [2.5, 0.6, -1.4], [2.8, -1.55, -2.2], [3.6, -1.56, -3.4]]),
      curve([[-1.25, -1.0, -1.0], [-1.7, -1.3, -1.6], [-2.1, -1.55, -2.6], [-2.4, -1.56, -5.0]]),
    ].map((c) => new THREE.TubeGeometry(c, 64, 0.032, 8, false));

    // Low-poly twins of the main volumes, used only for the schematic overlay.
    const edge = (g: THREE.BufferGeometry) => {
      const e = new THREE.EdgesGeometry(g, 1);
      g.dispose();
      return e;
    };
    const schematic = {
      plinth: edge(new THREE.CylinderGeometry(1.75, 1.75, 0.32, 24, 1)),
      collar: edge(new THREE.CylinderGeometry(1.0, 1.0, 0.25, 16, 1)),
      chamber: edge(new THREE.CylinderGeometry(0.6, 0.6, 2.0, 12, 1, true)),
      cap: edge(new THREE.CylinderGeometry(0.66, 0.66, 0.16, 16, 1)),
    };

    // soft contact shadow
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const shadow = new THREE.CanvasTexture(c);

    return { cables, schematic, shadow };
  }, []);

  useEffect(
    () => () => {
      geo.cables.forEach((g) => g.dispose());
      Object.values(geo.schematic).forEach((g) => g.dispose());
      geo.shadow.dispose();
    },
    [geo],
  );

  // LED register placement
  useLayoutEffect(() => {
    const m = leds.current!;
    const o = new THREE.Object3D();
    for (let i = 0; i < LED_COUNT; i++) {
      const a = (i / LED_COUNT) * TAU + Math.PI / 2;
      o.position.set(Math.cos(a) * 1.62, -1.235, Math.sin(a) * 1.62);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, new THREE.Color('#1a1f28'));
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);

  // ── The machine runs here ────────────────────────────────
  const tmpColor = useMemo(() => new THREE.Color(), []);
  useFrame((state, delta) => {
    const r = rig;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (r.frozen) return; // complete: everything stops exactly where it is

    r.energy += (r.capacity - r.energy) * (1 - Math.exp(-dt * 3.2));
    const e = r.energy;
    const awake = ramp(e, 0, 40);
    const spin = ramp(e, 38, 60) * (0.35 + 2.4 * ramp(e, 60, 100)) + r.ringKick * 3;
    const over = ramp(e, 90, 100);

    r.flow += dt * (0.5 + 2.6 * (e / 100));
    r.ringKick = Math.max(0, r.ringKick - dt * 0.8);
    r.corePulse = Math.max(0, r.corePulse - dt * 1.6);
    r.purge = Math.max(0, r.purge - dt * 0.55);
    r.blackout = Math.max(0, r.blackout - dt * 0.7);
    r.alarm = Math.max(0, r.alarm - dt * 0.25);
    r.watch = Math.max(0, r.watch - dt);

    // Rotations — each part has its own gear ratio
    ringOuter.current!.rotation.y += dt * spin * 0.55;
    ringInner.current!.rotation.y -= dt * spin * 0.85;
    governor.current!.rotation.y += dt * spin * 1.9;
    plates.current.forEach((p, i) => {
      if (p) p.rotation.y += dt * spin * (i % 2 ? 1 : -1) * (0.6 + i * 0.18);
    });

    // Crown: normally faces away. When "watching", it turns to find you.
    const c = crown.current!;
    const wantY = r.watch > 0 ? Math.PI * 2 + r.pointer.x * 0.6 : Math.PI;
    const wantX = r.watch > 0 ? -r.pointer.y * 0.35 : 0;
    c.rotation.y += (wantY - c.rotation.y) * (1 - Math.exp(-dt * (r.watch > 0 ? 4 : 1.5)));
    c.rotation.x += (wantX - c.rotation.x) * (1 - Math.exp(-dt * 4));
    mats.lens.emissiveIntensity = r.watch > 0 ? 2.2 + Math.sin(t * 20) * 0.3 : 0;

    // Light
    const lightsOn = 1 - Math.min(1, r.blackout * 1.5);
    const glow = (ramp(e, 18, 100) * 5 + r.corePulse * 3 + over * Math.random() * 3) * lightsOn;
    coreLight.current!.intensity = glow;
    mats.plate.emissiveIntensity = (ramp(e, 30, 100) * 1.4 + r.corePulse * 0.8) * lightsOn;
    mats.glass.opacity = 0.09 + awake * 0.05 + r.corePulse * 0.1;

    // Schematic overlay — the dormant machine is still mostly a drawing
    mats.schematic.opacity = (0.55 * (1 - awake) + (hoverRef.current ? 0.25 : 0)) * (r.reducedMotion ? 0.8 : 1);

    // LED register: lights come on in sequence from 20%, flicker at overload
    const lit = Math.round(ramp(e, 16, 62) * LED_COUNT);
    const flick = over > 0 ? Math.floor(t * 18) : 0;
    const key = `${lit}|${r.alarm > 0}|${lightsOn < 0.5}|${flick}`;
    if (key !== ledKey.current) {
      ledKey.current = key;
      const m = leds.current!;
      for (let i = 0; i < LED_COUNT; i++) {
        let col = '#1a1f28';
        if (lightsOn >= 0.5) {
          if (r.alarm > 0) col = '#e0523f';
          else if (i < lit) col = over > 0 && (i + flick) % 5 === 0 ? '#e0523f' : '#f3e2bd';
        }
        m.setColorAt(i, tmpColor.set(col));
      }
      m.instanceColor!.needsUpdate = true;
    }

    // Overload: the whole apparatus trembles. Not with reduced motion.
    const g = machine.current!;
    if (!r.reducedMotion && over > 0) {
      const amp = 0.012 * over;
      g.position.set((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp, 0);
    } else {
      g.position.set(0, 0, 0);
    }
  });

  // ── Interaction: resolve which part is under the pointer ──
  const resolvePart = (e: ThreeEvent<PointerEvent | MouseEvent>): MemoryPart | null => {
    let found: MemoryPart | null = null;
    for (const hit of e.intersections) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.part) o = o.parent;
      const part = (o?.userData.part as MemoryPart | undefined) ?? null;
      if (!part) continue;
      // glass is transparent: if the core is behind it, the core wins
      if (!found) found = part;
      if (found === 'chamber' && part === 'core') return 'core';
      if (found !== 'chamber') return found;
    }
    return found;
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const part = resolvePart(e);
    if (part !== hoverRef.current) {
      hoverRef.current = part;
      rig.hovered = part;
      onHover(part);
    }
  };
  const onLeave = () => {
    hoverRef.current = null;
    rig.hovered = null;
    onHover(null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const part = resolvePart(e);
    if (part) onPart(part);
  };

  const tag = (part: MemoryPart) => ({ userData: { part } });

  return (
    <group>
      {/* Floor: measuring grid + contact shadow */}
      <gridHelper args={[24, 48, '#2b4466', '#1b2d4a']} position={[0, -1.57, 0]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.565, 0]} raycast={() => null}>
        <planeGeometry args={[5.5, 5.5]} />
        <meshBasicMaterial map={geo.shadow} transparent depthWrite={false} />
      </mesh>

      <group ref={machine} onPointerMove={onMove} onPointerLeave={onLeave} onClick={onClick}>
        {/* PLINTH */}
        <group {...tag('plinth')}>
          <mesh position={[0, -1.41, 0]} material={mats.castIron}>
            <cylinderGeometry args={[1.75, 1.8, 0.32, 64]} />
          </mesh>
          <mesh position={[0, -1.252, 0]} rotation-x={Math.PI / 2} material={mats.brass}>
            <torusGeometry args={[1.5, 0.01, 6, 96]} />
          </mesh>
          <instancedMesh ref={leds} args={[undefined, undefined, LED_COUNT]} material={mats.led}>
            <sphereGeometry args={[0.03, 10, 8]} />
          </instancedMesh>
          {/* valve wheel */}
          <group position={[-1.33, -1.41, 1.33]} rotation-y={-Math.PI / 4}>
            <mesh material={mats.steel} rotation-x={Math.PI / 2} position={[0, 0, -0.04]}>
              <cylinderGeometry args={[0.015, 0.015, 0.08, 6]} />
            </mesh>
            <mesh material={mats.paint}>
              <torusGeometry args={[0.11, 0.016, 8, 24]} />
            </mesh>
            <mesh material={mats.paint} rotation-z={Math.PI / 4}>
              <boxGeometry args={[0.2, 0.014, 0.014]} />
            </mesh>
            <mesh material={mats.paint} rotation-z={-Math.PI / 4}>
              <boxGeometry args={[0.2, 0.014, 0.014]} />
            </mesh>
          </group>
        </group>

        {/* COLLAR + bolts */}
        <group {...tag('plinth')}>
          <mesh position={[0, -1.125, 0]} material={mats.iron}>
            <cylinderGeometry args={[0.95, 1.0, 0.25, 64]} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * TAU;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.86, -0.995, Math.sin(a) * 0.86]} material={mats.steel}>
                <cylinderGeometry args={[0.028, 0.028, 0.03, 6]} />
              </mesh>
            );
          })}
        </group>

        {/* CHAMBER: glass, rims, tie-rod cage */}
        <group {...tag('chamber')}>
          <mesh material={mats.glass} renderOrder={3}>
            <cylinderGeometry args={[0.6, 0.6, 2.0, 64, 1, true]} />
          </mesh>
          {[-1.0, 1.0].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={mats.brass}>
              <torusGeometry args={[0.62, 0.028, 10, 64]} />
            </mesh>
          ))}
          {Array.from({ length: 4 }, (_, i) => {
            const a = (i / 4) * TAU + Math.PI / 4;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7]} material={mats.steel}>
                <cylinderGeometry args={[0.016, 0.016, 2.0, 6]} />
              </mesh>
            );
          })}
        </group>

        {/* CORE: spindle + nine memory plates */}
        <group {...tag('core')}>
          <mesh material={mats.steel}>
            <cylinderGeometry args={[0.045, 0.045, 2.0, 12]} />
          </mesh>
          {Array.from({ length: PLATE_COUNT }, (_, i) => {
            const y = -0.8 + i * 0.2;
            const r = 0.2 + Math.sin((i / (PLATE_COUNT - 1)) * Math.PI) * 0.16;
            return (
              <mesh key={i} ref={(m) => void (plates.current[i] = m)} position={[0, y, 0]} material={mats.plate}>
                <cylinderGeometry args={[r, r, 0.016, 40]} />
                {/* index notch so rotation reads */}
                <mesh position={[r - 0.03, 0.012, 0]} material={mats.paint}>
                  <boxGeometry args={[0.05, 0.01, 0.012]} />
                </mesh>
              </mesh>
            );
          })}
          <pointLight ref={coreLight} color="#ffe6bf" intensity={0} distance={7} decay={1.6} />
        </group>

        {/* GOVERNOR BAND */}
        <group ref={governor} position={[0, -0.62, 0]} {...tag('governor')}>
          <mesh material={mats.brass}>
            <cylinderGeometry args={[0.82, 0.82, 0.08, 64, 1, true]} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * TAU;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85]} rotation-y={-a} material={mats.iron}>
                <boxGeometry args={[0.05, 0.12, 0.09]} />
              </mesh>
            );
          })}
        </group>

        {/* RING I — precessing, tilted */}
        <group ref={ringOuter} position={[0, 0.35, 0]} {...tag('gimbal-outer')}>
          <group rotation-x={Math.PI / 2 - 0.28}>
            <mesh material={mats.steel}>
              <torusGeometry args={[1.3, 0.024, 10, 128]} />
            </mesh>
            {[0, 1, 2, 3].map((i) => {
              const a = (i / 4) * TAU;
              return (
                <mesh key={i} position={[Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0]} rotation-z={a} material={mats.iron}>
                  <boxGeometry args={[0.1, 0.07, 0.07]} />
                </mesh>
              );
            })}
          </group>
        </group>

        {/* RING II — counter-rotating */}
        <group ref={ringInner} position={[0, -0.12, 0]} {...tag('gimbal-inner')}>
          <group rotation-x={Math.PI / 2} rotation-y={0.2}>
            <mesh material={mats.brass}>
              <torusGeometry args={[1.12, 0.018, 8, 128]} />
            </mesh>
            {[0, 1, 2].map((i) => {
              const a = (i / 3) * TAU;
              return (
                <mesh key={i} position={[Math.cos(a) * 1.12, Math.sin(a) * 1.12, 0]} material={mats.steel}>
                  <sphereGeometry args={[0.04, 10, 8]} />
                </mesh>
              );
            })}
          </group>
        </group>

        {/* STRUTS carrying the crown */}
        <group {...tag('plinth')}>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 1.5, -0.085, 0]} material={mats.iron}>
                <boxGeometry args={[0.1, 2.33, 0.16]} />
              </mesh>
              <mesh position={[s * 1.05, 1.08, 0]} material={mats.iron}>
                <boxGeometry args={[1.0, 0.08, 0.14]} />
              </mesh>
              {[-0.9, 0.2].map((y) => (
                <mesh key={y} position={[s * 1.5, y, 0.085]} rotation-x={Math.PI / 2} material={mats.steel}>
                  <cylinderGeometry args={[0.025, 0.025, 0.02, 6]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* CAP + CROWN */}
        <group {...tag('crown')}>
          <mesh position={[0, 1.08, 0]} material={mats.iron}>
            <cylinderGeometry args={[0.6, 0.66, 0.16, 48]} />
          </mesh>
          <group ref={crown} position={[0, 1.28, 0]} rotation-y={Math.PI}>
            <mesh material={mats.brass}>
              <cylinderGeometry args={[0.24, 0.3, 0.24, 32]} />
            </mesh>
            <mesh position={[0, 0.22, 0]} material={mats.steel}>
              <coneGeometry args={[0.12, 0.2, 24, 1, true]} />
            </mesh>
            {/* the lens. It is not an eye. */}
            <mesh position={[0, 0.0, 0.27]} rotation-x={Math.PI / 2} material={mats.lens}>
              <cylinderGeometry args={[0.07, 0.07, 0.04, 24]} />
            </mesh>
            <mesh position={[0, 0.0, 0.25]} rotation-x={Math.PI / 2} material={mats.steel}>
              <torusGeometry args={[0.085, 0.012, 6, 24]} />
            </mesh>
          </group>
        </group>

        {/* CAPACITOR BANK */}
        <group position={[1.15, -1.12, -1.05]} rotation-y={-0.6} {...tag('capacitor')}>
          <mesh material={mats.iron}>
            <boxGeometry args={[0.52, 0.26, 0.3]} />
          </mesh>
          {[-0.16, 0, 0.16].map((x) => (
            <mesh key={x} position={[x, 0.22, 0]} material={mats.steel}>
              <cylinderGeometry args={[0.055, 0.055, 0.2, 16]} />
            </mesh>
          ))}
        </group>

        {/* CABLES */}
        <group {...tag('cable')}>
          {geo.cables.map((g, i) => (
            <mesh key={i} geometry={g} material={mats.rubber} />
          ))}
        </group>

        {/* SCHEMATIC OVERLAY — fades as the machine wakes */}
        <group>
          <lineSegments geometry={geo.schematic.plinth} material={mats.schematic} position={[0, -1.41, 0]} raycast={() => null} />
          <lineSegments geometry={geo.schematic.collar} material={mats.schematic} position={[0, -1.125, 0]} raycast={() => null} />
          <lineSegments geometry={geo.schematic.chamber} material={mats.schematic} raycast={() => null} />
          <lineSegments geometry={geo.schematic.cap} material={mats.schematic} position={[0, 1.08, 0]} raycast={() => null} />
        </group>
      </group>

      <MemoryParticleField rig={rig} count={rig.lowPower ? 900 : 2600} />
    </group>
  );
}
