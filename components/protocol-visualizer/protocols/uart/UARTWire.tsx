/**
 * \file UARTWire.tsx
 * \brief Visual representation of a UART connection wire.
 *
 * Renders a curved wire between two UART pins and
 * visually indicates normal operation or short-circuit faults.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUARTStore } from './useUARTLogic';

/**
 * \brief Properties for UARTWire component.
 *
 * \param start Start position of the wire.
 * \param end End position of the wire.
 * \param color Base color of the wire.
 * \param yOffset Vertical offset to separate overlapping wires.
 */
interface UARTWireProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: number;
  yOffset: number;
}

/**
 * \brief UART wire visualization.
 *
 * Responsibilities:
 * - Generates a curved wire path between two points
 * - Applies emissive highlighting during faults
 * - Reacts to wire short conditions from the UART store
 *
 * \param start Wire start position.
 * \param end Wire end position.
 * \param color Wire color.
 * \param yOffset Vertical curve offset.
 * \return Three.js mesh representing the UART wire.
 */
export default function UARTWire({
  start,
  end,
  color,
  yOffset,
}: UARTWireProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { wireShorted } = useUARTStore();

  /**
   * \brief Generates the wire curvature.
   *
   * Uses a Catmull–Rom spline to create a smooth
   * cable-like path between UART pins.
   */
  const curve = useMemo(() => {
    const midY = Math.max(start.y, end.y) + 1.5 + yOffset;
    return new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(start.x + 2, midY, start.z),
      new THREE.Vector3(end.x - 2, midY, end.z),
      end,
    ]);
  }, [start, end, yOffset]);

  /**
   * \brief Updates wire emissive behavior.
   *
   * Emits a flickering red glow when wires are shorted
   * and a steady glow during normal operation.
   */
  useFrame(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;

      if (wireShorted) {
        const sparkIntensity = Math.random() * 0.8 + 0.2;
        material.emissive.setHex(0xff0000);
        material.emissiveIntensity = sparkIntensity * 1.5;
      } else {
        material.emissive.setHex(color);
        material.emissiveIntensity = 0.3;
      }
    }
  });

  return (
    <mesh ref={meshRef} castShadow userData={{ curve }}>
      <tubeGeometry args={[curve, 64, 0.08, 8, false]} />
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        metalness={0.5}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}
