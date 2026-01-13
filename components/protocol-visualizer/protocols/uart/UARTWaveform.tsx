/**
 * \file UARTWaveform.tsx
 * \brief Renders an animated UART signal waveform with timing-accurate visualization.
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
 * \brief Visualizes UART transmission data as a scrolling waveform with bit markers.
 */
export default function UARTWaveform({ position }: UARTWaveformProps) {
    const waveLineRef = useRef<THREE.LineSegments>(null);
    const dotsGroupRef = useRef<THREE.Group>(null);
    const store = useUARTStore();
    const { waveformData, isTransmitting, isPaused, wireShorted } = store;
    const baudRate = 'baudRate' in store ? (store as any).baudRate : 9600;
    const MAX_POINTS = 400;

    const allBitsRef = useRef<number[]>([]);

    const scrollOffsetRef = useRef(0);
    const visualBitsRef = useRef(0);
    const drainingRef = useRef(false);

    const phaseRef = useRef<'idle' | 'active'>('idle');
    const lastBitCountRef = useRef(0);
    const bitTimerRef = useRef(0);
    const prevIsTransmittingRef = useRef(false);
    const prevWireShortedRef = useRef(false);

    const targetScrollRef = useRef(0);

    // Sync data
    useEffect(() => {
        if (isTransmitting) {
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

        if (!isTransmitting && phaseRef.current === 'idle') {
            allBitsRef.current = [];
            scrollOffsetRef.current = 0;
            targetScrollRef.current = 0;
            lastBitCountRef.current = 0;
            bitTimerRef.current = 0;
        }
    }, [waveformData, isTransmitting]);

    /**
     * \brief Determines whether a UART bit index represents a start, data, or stop bit.
     */
    const getBitType = (bitIndex: number): 'start' | 'data' | 'stop' => {
        const positionInFrame = bitIndex % 10;

        if (positionInFrame === 0) {
            return 'start';
        } else if (positionInFrame === 9) {
            return 'stop';
        } else {
            return 'data';
        }
    };

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
        ctx.fillText(
            'UART SIGNAL WAVEFORM',
            canvas.width / 2,
            canvas.height / 2
        );

        return new THREE.CanvasTexture(canvas);
    }, []);

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

    useFrame((state, delta) => {
        if (isTransmitting) {
            store.updateTransmission(delta);
        }

        if (!waveLineRef.current) return;

        const positions = waveLineRef.current.geometry.attributes.position
            .array as Float32Array;

        const maxVisibleBits = 20;
        const viewWidth = 20;
        const bitWidth = viewWidth / maxVisibleBits;

        /* Freeze when paused */
        if (isPaused) {
            return;
        }

        if (!prevIsTransmittingRef.current && isTransmitting) {
            scrollOffsetRef.current = 0;
            targetScrollRef.current = 0;
            drainingRef.current = false;
            phaseRef.current = 'active';
        }

        if (prevIsTransmittingRef.current && !isTransmitting) {
            /* Start visual drain */
            drainingRef.current = true;
        }
        prevIsTransmittingRef.current = isTransmitting;

        const bits = allBitsRef.current;

        /* Idle state - show HIGH line */
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

        const VISUAL_SLOWDOWN = 1000;

        const visualBitDuration = bitDuration * VISUAL_SLOWDOWN;

        if (isTransmitting) {
            const completedBits = waveformData.length;
            const partialBit = Math.min(
                store.bitTimer / visualBitDuration,
                1.0
            );
            targetScrollRef.current = (completedBits + partialBit) * bitWidth;
        } else if (drainingRef.current) {
            const drainSpeed = bitWidth / visualBitDuration;
            targetScrollRef.current += drainSpeed * delta;
        }

        const smoothingFactor = 0.2;
        scrollOffsetRef.current +=
            (targetScrollRef.current - scrollOffsetRef.current) *
            smoothingFactor;

        const totalDataWidth = bits.length * bitWidth;

        if (scrollOffsetRef.current > totalDataWidth + viewWidth) {
            phaseRef.current = 'idle';
            drainingRef.current = false;

            allBitsRef.current = [];
            scrollOffsetRef.current = 0;
            targetScrollRef.current = 0;

            return;
        }

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

        /* Draw all bits */
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

        /* Update dots */
        if (dotsGroupRef.current) {
            while (dotsGroupRef.current.children.length < bits.length) {
                const dot = new THREE.Mesh(dotGeometry, dotMaterials.data);
                dot.renderOrder = 10;
                dotsGroupRef.current.add(dot);
            }

            for (let i = 0; i < bits.length; i++) {
                const dot = dotsGroupRef.current.children[i] as THREE.Mesh;
                const bitCenterX =
                    (i + 0.5) * bitWidth - scrollOffsetRef.current;

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

            for (
                let i = bits.length;
                i < dotsGroupRef.current.children.length;
                i++
            ) {
                dotsGroupRef.current.children[i].visible = false;
            }
        }
    });

    const gridLines = useMemo(() => {
        const lines: React.ReactElement[] = [];
        const segments = 50;

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

        for (let i = 0; i <= 8; i++) {
            const points: number[] = [];
            const y = -4 + i;

            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                const x = -10 + t * 20;
                const normalizedY = (y + 4) / 8;
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

    return (
        <group position={position}>
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

            {gridLines}

            <lineSegments
                ref={waveLineRef}
                frustumCulled={false}
                renderOrder={5}
            >
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array(MAX_POINTS * 3), 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color={0x14b8a6} linewidth={3} />
            </lineSegments>

            <group ref={dotsGroupRef} />

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
