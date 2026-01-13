/**
 * \file I2CWire.tsx
 * \brief Renders a curved I²C bus wire using a tube geometry.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface I2CWireProps {
  points: THREE.Vector3[];
  color: number;
  label?: string;
}

/**
 * \brief Draws an I²C wire along a predefined set of 3D points.
 */
export default function I2CWire({ points, color, label }: I2CWireProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points);
  }, [points]);

  useFrame(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(color);
      material.emissiveIntensity = 0.2;
    }
  });

  return (
    <mesh ref={meshRef} castShadow userData={{ curve }}>
      <tubeGeometry args={[curve, 64, 0.08, 8, false]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.7}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}
