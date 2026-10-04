import * as THREE from 'three';

/**
 * One material library per scene instance. Shared across meshes so the
 * GPU sees a handful of programs, not dozens. Disposed with the scene.
 */
export function createMemoryMaterials() {
  const iron = new THREE.MeshStandardMaterial({ color: '#1c212b', metalness: 0.75, roughness: 0.52 });
  const castIron = new THREE.MeshStandardMaterial({ color: '#14181f', metalness: 0.6, roughness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: '#a89a78', metalness: 0.92, roughness: 0.32 });
  const steel = new THREE.MeshStandardMaterial({ color: '#b8b4aa', metalness: 0.88, roughness: 0.26 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#0c0e12', metalness: 0.1, roughness: 0.85 });
  const paint = new THREE.MeshStandardMaterial({ color: '#b74336', metalness: 0.2, roughness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#cdd6e4',
    metalness: 0.1,
    roughness: 0.04,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plate = new THREE.MeshStandardMaterial({
    color: '#cfc9bb',
    metalness: 0.85,
    roughness: 0.22,
    emissive: new THREE.Color('#f6e7c8'),
    emissiveIntensity: 0,
  });
  const lens = new THREE.MeshStandardMaterial({
    color: '#05070a',
    metalness: 0.2,
    roughness: 0.05,
    emissive: new THREE.Color('#b74336'),
    emissiveIntensity: 0,
  });
  const schematic = new THREE.LineBasicMaterial({ color: '#7fa3d6', transparent: true, opacity: 0.5, depthWrite: false });
  const led = new THREE.MeshBasicMaterial({ toneMapped: false });

  const all = [iron, castIron, brass, steel, rubber, paint, glass, plate, lens, schematic, led];
  return {
    iron,
    castIron,
    brass,
    steel,
    rubber,
    paint,
    glass,
    plate,
    lens,
    schematic,
    led,
    dispose: () => all.forEach((m) => m.dispose()),
  };
}

export type MemoryMaterials = ReturnType<typeof createMemoryMaterials>;
