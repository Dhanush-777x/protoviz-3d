/**
 * \file UARTBoard.tsx
 * \brief 3D representation of a UART TX or RX board.
 *
 * Renders a simplified PCB with MCU, pins, connectors,
 * and a labeled identifier for transmitter or receiver.
 */

'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * \brief Properties for UARTBoard component.
 *
 * \param type Identifies the board as transmitter or receiver.
 * \param position World-space position of the board.
 */
interface UARTBoardProps {
  type: 'tx' | 'rx';
  position: [number, number, number];
}

/**
 * \brief UART device board visualization.
 *
 * Represents either a transmitter (TX) or receiver (RX)
 * in the UART scene, including PCB, MCU, pins, and
 * wire connection points.
 *
 * \param type Board type: 'tx' or 'rx'.
 * \param position World-space position of the board.
 * \return Three.js group representing the UART board.
 */
export default function UARTBoard({ type, position }: UARTBoardProps) {
  /**
   * \brief Board-specific visual identity.
   *
   * TX boards and RX boards use different colors
   * and labels to distinguish their roles.
   */
  const boardColor = type === 'tx' ? 0x2d6a4f : 0x264a6e;

  /**
   * \brief Generates a canvas-based label texture.
   *
   * Used to render "TX" or "RX" text above the board
   * without relying on 3D text geometry.
   */
  const labelColor = type === 'tx' ? '#ff6060' : '#6060ff';
  const labelText = type === 'tx' ? 'TX' : 'RX';

  // Create label texture
  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 256;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 72px Arial';
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, [labelColor, labelText]);

  return (
    <group position={position}>
      {/* PCB Board */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4, 0.3, 3]} />
        <meshStandardMaterial
          color={boardColor}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* MCU Chip */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[1.5, 0.2, 1.2]} />
        <meshStandardMaterial
          color={0x3a3a3a}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Chip Pins */}
      {Array.from({ length: 7 }, (_, i) => i - 3).map((i) => (
        <group key={`pin-${i}`}>
          <mesh position={[i * 0.2, 0.4, 0.5]}>
            <boxGeometry args={[0.1, 0.15, 0.1]} />
            <meshStandardMaterial
              color={0xe0e0e0}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          <mesh position={[i * 0.2, 0.4, -0.5]}>
            <boxGeometry args={[0.1, 0.15, 0.1]} />
            <meshStandardMaterial
              color={0xe0e0e0}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        </group>
      ))}

      {/* Wire Connectors */}
      <mesh position={[1.5, 0.35, -0.5]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 8]} />
        <meshStandardMaterial
          color={0xffd700}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[1.5, 0.35, 0.5]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 8]} />
        <meshStandardMaterial
          color={0xffd700}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[-1.5, 0.35, -0.5]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 8]} />
        <meshStandardMaterial
          color={0xffd700}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[-1.5, 0.35, 0.5]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 8]} />
        <meshStandardMaterial
          color={0xffd700}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Label */}
      <sprite position={[0, 1, 0]} scale={[3, 1.5, 1]}>
        <spriteMaterial map={labelTexture} />
      </sprite>
    </group>
  );
}
