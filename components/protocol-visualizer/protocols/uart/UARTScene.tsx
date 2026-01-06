/**
 * \file UARTScene.tsx
 * \brief 3D UART scene renderer and bit-timing driver.
 *
 * Renders the UART TX/RX boards, wires, waveform, particles,
 * and advances UART bit transmission based on baud rate timing.
 */

'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import UARTBoard from './UARTBoard';
import UARTWire from './UARTWire';
import UARTWaveform from './UARTWaveform';
import UARTParticles from './UARTParticles';
import { useUARTStore } from './useUARTLogic';
import * as THREE from 'three';
import InfoPoints from './InfoPoints';
import { Environment } from '@react-three/drei';

/**
 * \brief Main 3D UART visualization scene.
 *
 * Responsible for:
 * - Rendering TX/RX boards and wiring
 * - Driving UART bit timing based on baud rate
 * - Advancing bits during transmission
 * - Handling wire short conditions
 *
 * \return Three.js scene group containing all UART visuals.
 */
export default function UARTScene() {
  /**
   * \brief Accumulates elapsed time to determine when to advance UART bits.
   *
   * Acts as a software bit-timer derived from the selected baud rate.
   */
  const bitDurationRef = useRef(0);
  const { baudRate, isTransmitting, wireShorted, advanceBit, currentBit } =
    useUARTStore();

  /**
   * \brief Informational markers attached to UART components.
   *
   * Used for interactive explanations of TX/RX pins,
   * signal wire, and common ground reference.
   */
  const uartInfoPoints = [
    // TX Device - TX Pin (top left, on the yellow pin)
    {
      position: [-4.5, -0.25, -0.5] as [number, number, number],
      title: 'TX Pin (Transmitter)',
      description:
        "I'm the transmit pin of the TX device. I send serial data as electrical signals (HIGH/LOW) to the receiver.",
      color: '#fbbf24',
    },

    // TX Device - GND Pin (bottom left, on the yellow pin)
    {
      position: [-4.5, -0.25, 0.5] as [number, number, number],
      title: 'GND Pin (Transmitter)',
      description:
        "I'm the ground reference pin. I provide a common voltage reference (0V) for reliable signal interpretation.",
      color: '#6b7280',
    },

    // RX Device - RX Pin (top right, on the yellow pin)
    {
      position: [4.5, -0.25, 0.5] as [number, number, number],
      title: 'RX Pin (Receiver)',
      description:
        "I'm the receive pin of the RX device. I listen for incoming serial data signals from the transmitter.",
      color: '#fbbf24',
    },

    // RX Device - GND Pin (bottom right, on the yellow pin)
    {
      position: [4.5, -0.25, -0.5] as [number, number, number],
      title: 'GND Pin (Receiver)',
      description:
        "I'm the ground reference pin. I share a common ground with the transmitter to ensure accurate signal levels.",
      color: '#6b7280',
    },

    // Signal Wire - Top (on the curved wire, left side)
    {
      position: [-1.5, 1.6, -0.3] as [number, number, number],
      title: 'Signal Wire (TX → RX)',
      description:
        'I carry the UART data signal from TX to RX. I transmit HIGH (idle/stop/1) and LOW (start/0) voltage levels.',
      color: '#ef4444',
    },
    // Ground Wire (bottom wire - purple)
    {
      position: [-0.5, 1.3, 0.1] as [number, number, number],
      title: 'Ground Wire (Common Reference)',
      description:
        "I connect both GND pins. Without me, the receiver can't tell if the signal wire is HIGH or LOW. I'm essential!",
      color: '#3b82f6',
    },
  ];

  /**
   * \brief Resets bit timing when transmission stops or wiring is invalid.
   *
   * Prevents partial-bit carryover when restarting transmission
   * or when the wire is shorted.
   */
  useEffect(() => {
    if (!isTransmitting || wireShorted) {
      bitDurationRef.current = 0;
    }
  }, [isTransmitting, wireShorted]);

  /**
   * \brief Resets bit timer on fresh transmission start.
   *
   * Ensures accurate timing when currentBit returns to zero.
   */
  useEffect(() => {
    if (currentBit === 0) {
      bitDurationRef.current = 0;
    }
  }, [currentBit]);

  /**
   * \brief Advances UART bits based on baud rate timing.
   *
   * Uses a scaled bit time for visualization speed while
   * preserving relative UART timing behavior.
   *
   * This drives the entire transmission animation.
   */
  useFrame((state, delta) => {
    if (isTransmitting && !wireShorted) {
      const bitTime = (1 / baudRate) * 2000; // Adjusted for visual speed
      bitDurationRef.current += delta;

      if (bitDurationRef.current >= bitTime) {
        bitDurationRef.current = 0;
        advanceBit();
      }
    }
  });

  return (
    <group>
      {/* Ground Grid */}
      {/* TX Board */}
      <UARTBoard type="tx" position={[-6, -0.85, 0]} />

      {/* RX Board */}
      <UARTBoard type="rx" position={[6, -0.85, 0]} />

      {/* Wires - swap connections when shorted */}
      {wireShorted ? (
        <>
          {/* TX to TX (shorted) */}
          <UARTWire
            start={new THREE.Vector3(-4.5, -0.5, -0.5)}
            end={new THREE.Vector3(4.5, -0.5, -0.5)}
            color={0xff6b6b}
            yOffset={0.3}
          />
          {/* RX to RX (shorted) */}
          <UARTWire
            start={new THREE.Vector3(-4.5, -0.5, 0.5)}
            end={new THREE.Vector3(4.5, -0.5, 0.5)}
            color={0x6c8cff}
            yOffset={0}
          />
        </>
      ) : (
        <>
          {/* TX to RX (normal) */}
          <UARTWire
            start={new THREE.Vector3(-4.5, -0.5, -0.5)}
            end={new THREE.Vector3(4.5, -0.5, 0.5)}
            color={0xff6b6b}
            yOffset={0.3}
          />
          {/* RX to TX (normal) */}
          <UARTWire
            start={new THREE.Vector3(-4.5, -0.5, 0.5)}
            end={new THREE.Vector3(4.5, -0.5, -0.5)}
            color={0x6c8cff}
            yOffset={0}
          />
        </>
      )}

      {/* Particles */}
      <UARTParticles />

      {/* Waveform Display */}
      <UARTWaveform position={[0, 6, -2]} />

      <InfoPoints points={uartInfoPoints} wireShorted={wireShorted} />
    </group>
  );
}
