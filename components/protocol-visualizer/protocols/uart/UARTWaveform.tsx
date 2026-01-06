/**
 * \file UARTWaveform.tsx
 * \brief Real-time UART signal waveform renderer.
 *
 * Visualizes UART bits as a scrolling digital waveform,
 * including start, data, and stop bits with timing derived
 * from the selected baud rate.
 */

'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUARTStore } from './useUARTLogic';
import { FontLoader, TextGeometry } from 'three-stdlib';

interface UARTWaveformProps {
  position: [number, number, number];
}

/**
 * \brief UART waveform visualization component.
 *
 * Responsible for:
 * - Rendering UART HIGH/LOW signal levels
 * - Scrolling bits based on baud-rate timing
 * - Displaying bit-type markers (start/data/stop)
 * - Handling pause, idle, and wire-short states
 *
 * \param position World-space position of the waveform panel.
 * \return Three.js group containing the waveform UI.
 */
export default function UARTWaveform({ position }: UARTWaveformProps) {
  const waveLineRef = useRef<THREE.LineSegments>(null);
  const dotsGroupRef = useRef<THREE.Group>(null);
  const store = useUARTStore();
  const { waveformData, isTransmitting, isPaused, wireShorted } = store;
  const baudRate = 'baudRate' in store ? (store as any).baudRate : 9600;
  const MAX_POINTS = 400;

  /**
   * \brief Stores all transmitted UART bits for rendering.
   *
   * Bits are appended as transmission progresses and
   * scrolled across the waveform display.
   */
  const allBitsRef = useRef<number[]>([]);

  /**
   * \brief Accumulates horizontal scroll offset for waveform animation.
   *
   * Controls smooth left-to-right motion of bits.
   */
  const scrollOffsetRef = useRef(0);
  const visualBitsRef = useRef(0);
  const drainingRef = useRef(false);

  /**
   * \brief Tracks whether waveform is idle or actively scrolling.
   */
  const phaseRef = useRef<'idle' | 'active'>('idle');
  const lastBitCountRef = useRef(0);
  const bitTimerRef = useRef(0);
  const prevIsTransmittingRef = useRef(false);
  const prevWireShortedRef = useRef(false);
  /**
   * \brief Target scroll position for smooth interpolation.
   */
  const targetScrollRef = useRef(0);

  // Sync data
  useEffect(() => {
    if (isTransmitting) {
      // 🔥 HARD reset visual state immediately
      allBitsRef.current = [];
      scrollOffsetRef.current = 0;
      targetScrollRef.current = 0;
      drainingRef.current = false;
      phaseRef.current = 'active';
    }
  }, [isTransmitting]);

  useEffect(() => {
    if (waveformData.length > 0) {
      allBitsRef.current = [...waveformData];
      phaseRef.current = 'active';

      if (waveformData.length > lastBitCountRef.current) {
        lastBitCountRef.current = waveformData.length;
        bitTimerRef.current = 0;
      }
    }

    // ✅ Only reset AFTER transmission AND visual drain
    if (!isTransmitting && phaseRef.current === 'idle') {
      allBitsRef.current = [];
      scrollOffsetRef.current = 0;
      targetScrollRef.current = 0;
      lastBitCountRef.current = 0;
      bitTimerRef.current = 0;
    }
  }, [waveformData, isTransmitting]);

  /**
   * \brief Determines UART bit type based on position in frame.
   *
   * UART frame format:
   * START (1) + DATA (8) + STOP (1)
   *
   * \param bitIndex Index of the bit in the stream.
   * \return Bit type: start, data, or stop.
   */
  const getBitType = (bitIndex: number): 'start' | 'data' | 'stop' => {
    // UART frame structure: START(1) + DATA(8) + STOP(1) = 10 bits per char
    const positionInFrame = bitIndex % 10;

    if (positionInFrame === 0) {
      return 'start';
    } else if (positionInFrame === 9) {
      return 'stop';
    } else {
      return 'data';
    }
  };

  /* --------------------------------------------------
     Glass panel
  -------------------------------------------------- */
  const glassShape = useMemo(() => {
    const shape = new THREE.Shape();
    const width = 20;
    const height = 8;
    const radius = 0.8;
    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    return shape;
  }, []);

  /* --------------------------------------------------
     Label
  -------------------------------------------------- */
  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1300;
    canvas.height = 300;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 96px Arial';
    ctx.fillStyle = '#e8faff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#e8faff';
    ctx.shadowBlur = 5;
    ctx.fillText('UART SIGNAL WAVEFORM', canvas.width / 2, canvas.height / 2);

    return new THREE.CanvasTexture(canvas);
  }, []);

  /* --------------------------------------------------
     Dot Materials
  -------------------------------------------------- */
  const dotMaterials = useMemo(
    () => ({
      start: new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      stop: new THREE.MeshBasicMaterial({
        color: 0xff0000,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      data: new THREE.MeshBasicMaterial({
        color: 0xffff00,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    }),
    []
  );

  const dotGeometry = useMemo(() => new THREE.CircleGeometry(0.15, 16), []);

  /**
   * \brief Main waveform animation loop.
   *
   * - Advances waveform scroll based on baud rate
   * - Draws HIGH/LOW transitions
   * - Handles idle line, pause state, and end-of-data behavior
   * - Updates colored bit markers
   */
  useFrame((state, delta) => {
    // ⭐ CRITICAL: Update transmission timing
    if (isTransmitting) {
      store.updateTransmission(delta);
    }

    if (!waveLineRef.current) return;

    const positions = waveLineRef.current.geometry.attributes.position
      .array as Float32Array;

    const maxVisibleBits = 20;
    const viewWidth = 20;
    const bitWidth = viewWidth / maxVisibleBits;

    // Freeze when paused
    if (isPaused) {
      return;
    }

    if (!prevIsTransmittingRef.current && isTransmitting) {
      // HARD reset visual state
      scrollOffsetRef.current = 0;
      targetScrollRef.current = 0;
      drainingRef.current = false;
      phaseRef.current = 'active';
    }

    if (prevIsTransmittingRef.current && !isTransmitting) {
      // Start visual drain
      drainingRef.current = true;
    }
    prevIsTransmittingRef.current = isTransmitting;

    const bits = allBitsRef.current;

    // Idle state - show HIGH line
    if (bits.length === 0) {
      phaseRef.current = 'idle';

      if (dotsGroupRef.current) {
        dotsGroupRef.current.children.forEach((child) => {
          child.visible = false;
        });
      }

      let vertexIndex = 0;
      positions[vertexIndex++] = -10;
      positions[vertexIndex++] = 2.5;
      positions[vertexIndex++] = 0.1;

      positions[vertexIndex++] = 10;
      positions[vertexIndex++] = 2.5;
      positions[vertexIndex++] = 0.1;

      for (let i = vertexIndex; i < positions.length; i++) {
        positions[i] = 1000;
      }

      const pointCount = Math.floor(vertexIndex / 3);
      waveLineRef.current.geometry.setDrawRange(0, pointCount);
      waveLineRef.current.geometry.attributes.position.needsUpdate = true;

      return;
    }

    const bitDuration = 1 / baudRate;

    // 🔥 SMOOTH SLOWDOWN: Makes everything slower than reality
    const VISUAL_SLOWDOWN = 1000; // Increase this number to make it slower

    // Calculate visual bit duration (how long each bit should visually take)
    const visualBitDuration = bitDuration * VISUAL_SLOWDOWN;

    if (isTransmitting) {
      // Normal scrolling during transmission
      const completedBits = waveformData.length;
      const partialBit = Math.min(store.bitTimer / visualBitDuration, 1.0);
      targetScrollRef.current = (completedBits + partialBit) * bitWidth;
    } else if (drainingRef.current) {
      // Continue scrolling after TX completes
      const drainSpeed = bitWidth / visualBitDuration;
      targetScrollRef.current += drainSpeed * delta;
    }

    // Smooth interpolation (lerp) to eliminate jitter
    const smoothingFactor = 0.2;
    scrollOffsetRef.current +=
      (targetScrollRef.current - scrollOffsetRef.current) * smoothingFactor;

    const totalDataWidth = bits.length * bitWidth;

    if (scrollOffsetRef.current > totalDataWidth + viewWidth) {
      phaseRef.current = 'idle';
      drainingRef.current = false;

      // 🔥 THIS IS REQUIRED
      allBitsRef.current = [];
      scrollOffsetRef.current = 0;
      targetScrollRef.current = 0;

      return;
    }

    // Build waveform
    let vertexIndex = 0;
    let lastY = 2.5;

    const firstBitStartX = -scrollOffsetRef.current;
    if (firstBitStartX > -10) {
      positions[vertexIndex++] = -10;
      positions[vertexIndex++] = 2.5;
      positions[vertexIndex++] = 0.1;

      positions[vertexIndex++] = Math.min(firstBitStartX, 10);
      positions[vertexIndex++] = 2.5;
      positions[vertexIndex++] = 0.1;
    }

    // Draw all bits
    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i];
      const bitStartX = i * bitWidth - scrollOffsetRef.current;
      const bitEndX = (i + 1) * bitWidth - scrollOffsetRef.current;
      const targetY = bit === 1 ? 2.5 : -2.5;

      if (bitEndX < -10) {
        lastY = targetY;
        continue;
      }

      if (bitStartX > 10) break;

      if (lastY !== targetY) {
        const transitionX = Math.max(-10, Math.min(10, bitStartX));

        positions[vertexIndex++] = transitionX;
        positions[vertexIndex++] = lastY;
        positions[vertexIndex++] = 0.1;

        positions[vertexIndex++] = transitionX;
        positions[vertexIndex++] = targetY;
        positions[vertexIndex++] = 0.1;
      }

      const segmentStartX = Math.max(-10, bitStartX);
      const segmentEndX = Math.min(10, bitEndX);

      positions[vertexIndex++] = segmentStartX;
      positions[vertexIndex++] = targetY;
      positions[vertexIndex++] = 0.1;

      positions[vertexIndex++] = segmentEndX;
      positions[vertexIndex++] = targetY;
      positions[vertexIndex++] = 0.1;

      lastY = targetY;
    }

    const dataEndX = totalDataWidth - scrollOffsetRef.current;

    if (dataEndX >= -10 && dataEndX <= 10) {
      if (lastY !== 2.5) {
        positions[vertexIndex++] = dataEndX;
        positions[vertexIndex++] = lastY;
        positions[vertexIndex++] = 0.1;

        positions[vertexIndex++] = dataEndX;
        positions[vertexIndex++] = 2.5;
        positions[vertexIndex++] = 0.1;
      }

      positions[vertexIndex++] = dataEndX;
      positions[vertexIndex++] = 2.5;
      positions[vertexIndex++] = 0.1;

      positions[vertexIndex++] = 10;
      positions[vertexIndex++] = 2.5;
      positions[vertexIndex++] = 0.1;
    } else if (dataEndX < -10) {
      positions[vertexIndex++] = -10;
      positions[vertexIndex++] = 2.5;
      positions[vertexIndex++] = 0.1;

      positions[vertexIndex++] = 10;
      positions[vertexIndex++] = 2.5;
      positions[vertexIndex++] = 0.1;
    }

    for (let i = vertexIndex; i < positions.length; i++) {
      positions[i] = 1000;
    }

    const pointCount = Math.floor(vertexIndex / 3);
    waveLineRef.current.geometry.setDrawRange(0, pointCount);
    waveLineRef.current.geometry.attributes.position.needsUpdate = true;

    // Update dots
    if (dotsGroupRef.current) {
      while (dotsGroupRef.current.children.length < bits.length) {
        const dot = new THREE.Mesh(dotGeometry, dotMaterials.data);
        dot.renderOrder = 10;
        dotsGroupRef.current.add(dot);
      }

      for (let i = 0; i < bits.length; i++) {
        const dot = dotsGroupRef.current.children[i] as THREE.Mesh;
        const bitCenterX = (i + 0.5) * bitWidth - scrollOffsetRef.current;

        if (bitCenterX >= -10 && bitCenterX <= 10) {
          dot.visible = true;
          dot.position.set(bitCenterX, -3.5, 0.15);

          const bitType = getBitType(i);

          if (bitType === 'start') {
            dot.material = dotMaterials.start;
          } else if (bitType === 'stop') {
            dot.material = dotMaterials.stop;
          } else {
            dot.material = dotMaterials.data;
          }
        } else {
          dot.visible = false;
        }
      }

      for (let i = bits.length; i < dotsGroupRef.current.children.length; i++) {
        dotsGroupRef.current.children[i].visible = false;
      }
    }
  });

  /* --------------------------------------------------
     Grid
  -------------------------------------------------- */

  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const segments = 50; // More segments = smoother curve

    // Vertical lines (curved)
    for (let i = 0; i <= 20; i++) {
      const points: number[] = [];
      const x = -10 + i;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const y = -4 + t * 8;
        const z = 0.01;
        points.push(x, y, z);
      }

      lines.push(
        <line key={`v-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(points), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={0xffffff}
            transparent
            opacity={0.035}
            depthTest={false}
            depthWrite={false}
          />
        </line>
      );
    }

    // Horizontal lines (curved)
    for (let i = 0; i <= 8; i++) {
      const points: number[] = [];
      const y = -4 + i;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = -10 + t * 20;
        const normalizedY = (y + 4) / 8; // Normalize y to 0-1
        const z = 0.01;
        points.push(x, y, z);
      }

      lines.push(
        <line key={`h-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(points), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={0xffffff}
            transparent
            opacity={0.035}
            depthTest={false}
            depthWrite={false}
          />
        </line>
      );
    }

    return lines;
  }, []);

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
  return (
    <group position={position}>
      {/* Glass panel */}
      <mesh position={[0, 0, -0.05]}>
        <extrudeGeometry
          args={[glassShape, { depth: 0.05, bevelEnabled: false }]}
        />
        <meshPhysicalMaterial
          color={0xffffff}
          transparent
          opacity={0.25}
          transmission={0.95}
          thickness={1}
          ior={1.45}
          roughness={0.25}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>

      {/* Grid */}
      {gridLines}

      {/* Waveform */}

      <lineSegments ref={waveLineRef} frustumCulled={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(MAX_POINTS * 3), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={0x14b8a6} linewidth={3} />
      </lineSegments>

      {/* Dots for bit indicators */}
      <group ref={dotsGroupRef} />

      {/* Label */}
      <mesh position={[0, 3.2, 0.02]} renderOrder={10}>
        <planeGeometry args={[10, 2.5]} />
        <meshBasicMaterial
          map={labelTexture}
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
