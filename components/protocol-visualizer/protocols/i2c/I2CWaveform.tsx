/**
 * \file I2CWaveform.tsx
 * \brief Renders and animates the SDA/SCL timing waveform for I²C communication.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useI2CStore } from './useI2CLogic';

interface I2CWaveformProps {
    position: [number, number, number];
}

/**
 * \brief Visualizes the I²C SDA and SCL signals as a scrolling waveform.
 */
export default function I2CWaveform({ position }: I2CWaveformProps) {
    const sdaLineRef = useRef<THREE.LineSegments>(null);
    const sclLineRef = useRef<THREE.LineSegments>(null);
    const dotsGroupRef = useRef<THREE.Group>(null);

    const store = useI2CStore();
    const {
        waveformData,
        fullTaggedBitSequence,
        isTransmitting,
        isPaused,
        busPullupEnabled,
        internalClockFrequency,
        bitTimer,
        currentBitIndex,
        transmissionDirection,
    } = store;

    const MAX_POINTS = 600;
    const VISUAL_SLOWDOWN_FACTOR = 1000;
    const VIEW_WIDTH = 20;
    const MAX_VISIBLE_BITS = 14;
    const BIT_WIDTH = VIEW_WIDTH / MAX_VISIBLE_BITS;

    const scrollOffsetRef = useRef(0);
    const targetScrollRef = useRef(0);
    const phaseRef = useRef<'idle' | 'active'>('idle');
    const drainingRef = useRef(false);
    const prevIsTransmittingRef = useRef(false);

    useEffect(() => {
        if (isTransmitting && !prevIsTransmittingRef.current) {
            scrollOffsetRef.current = 0;
            targetScrollRef.current = 0;
            drainingRef.current = false;
            phaseRef.current = 'active';
        }
        prevIsTransmittingRef.current = isTransmitting;
    }, [isTransmitting]);

    useEffect(() => {
        if (!isTransmitting && phaseRef.current === 'active') {
            drainingRef.current = true;
        }
    }, [isTransmitting]);

    const glassShape = useMemo(() => {
        const shape = new THREE.Shape();
        const w = 22,
            h = 8.5,
            r = 1;
        shape.moveTo(-w / 2 + r, -h / 2);
        shape.lineTo(w / 2 - r, -h / 2);
        shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
        shape.lineTo(w / 2, h / 2 - r);
        shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
        shape.lineTo(-w / 2 + r, h / 2);
        shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
        shape.lineTo(-w / 2, -h / 2 + r);
        shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
        return shape;
    }, []);

    const dotGeometry = useMemo(() => new THREE.CircleGeometry(0.12, 16), []);
    const ringGeometry = useMemo(
        () => new THREE.RingGeometry(0.08, 0.12, 24),
        []
    );

    const dotMaterials = useMemo(
        () => ({
            start: new THREE.MeshBasicMaterial({
                color: 0x4ade80,
                side: THREE.DoubleSide,
            }),

            stop: new THREE.MeshBasicMaterial({
                color: 0xef4444,
                side: THREE.DoubleSide,
            }),

            addr_read: new THREE.MeshBasicMaterial({
                color: 0x60a5fa,
                side: THREE.DoubleSide,
            }),

            addr_write: new THREE.MeshBasicMaterial({
                color: 0xff60a0,
                side: THREE.DoubleSide,
            }),

            data: new THREE.MeshBasicMaterial({
                color: 0xfde047,
                side: THREE.DoubleSide,
            }),

            ack: new THREE.MeshBasicMaterial({
                color: 0x22d3ee,
                side: THREE.DoubleSide,
            }),

            nack: new THREE.MeshBasicMaterial({
                color: 0xfb923c,
                side: THREE.DoubleSide,
            }),
        }),
        []
    );

    const getDotMaterial = (
        state: string,
        direction: 'write' | 'read' | null
    ) => {
        if (state.includes('start')) return dotMaterials.start;
        if (state.includes('stop')) return dotMaterials.stop;

        if (state.includes('rw') || state.includes('address')) {
            return direction === 'read'
                ? dotMaterials.addr_read
                : dotMaterials.addr_write;
        }

        if (state.includes('ack')) return dotMaterials.ack;
        if (state.includes('nack')) return dotMaterials.nack;

        return dotMaterials.data;
    };

    const headingLabelTexture = useMemo(() => {
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
            'I²C SIGNAL WAVEFORM',
            canvas.width / 2,
            canvas.height / 2
        );

        return new THREE.CanvasTexture(canvas);
    }, []);

    const labelTextures = useMemo(() => {
        const genLabel = (text: string, color: string) => {
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d')!;
            c.width = 256;
            c.height = 128;
            ctx.font = 'bold 80px Arial';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 64);
            return new THREE.CanvasTexture(c);
        };
        return {
            sda: genLabel('SDA', '#4ade80'),
            scl: genLabel('SCL', '#fbbf24'),
        };
    }, []);

    useFrame((state, delta) => {
        if (isTransmitting) {
            store.updateTransmission(delta);
        }

        if (!sdaLineRef.current || !sclLineRef.current) return;
        if (isPaused) return;

        const displayBits = [...waveformData];

        let partialProgress = 0;
        if (isTransmitting && currentBitIndex < fullTaggedBitSequence.length) {
            displayBits.push(fullTaggedBitSequence[currentBitIndex]);
            const realDuration = 1 / internalClockFrequency;
            const visualDuration = realDuration * VISUAL_SLOWDOWN_FACTOR;
            partialProgress = Math.min(bitTimer / visualDuration, 1.0);
        }

        const totalContentWidth =
            (waveformData.length + partialProgress) * BIT_WIDTH;

        if (isTransmitting) {
            targetScrollRef.current = totalContentWidth;
        } else if (drainingRef.current) {
            targetScrollRef.current += 10 * delta;
        }

        scrollOffsetRef.current +=
            (targetScrollRef.current - scrollOffsetRef.current) * 0.2;

        if (
            scrollOffsetRef.current >
            displayBits.length * BIT_WIDTH + VIEW_WIDTH
        ) {
            drainingRef.current = false;
            phaseRef.current = 'idle';
        }

        const sdaPos = sdaLineRef.current.geometry.attributes.position
            .array as Float32Array;
        const sclPos = sclLineRef.current.geometry.attributes.position
            .array as Float32Array;
        let sdaIdx = 0,
            sclIdx = 0;

        const SDA_HIGH = 1.5,
            SDA_LOW = 0.5;
        const SCL_HIGH = -0.5,
            SCL_LOW = -1.5;
        const BUS_IDLE_SDA = busPullupEnabled ? SDA_HIGH : SDA_LOW;
        const BUS_IDLE_SCL = busPullupEnabled ? SCL_HIGH : SCL_LOW;

        const CLIP_LEFT = -10.9;
        const CLIP_RIGHT = 10.9;

        const pushSeg = (
            arr: Float32Array,
            idx: number,
            x1: number,
            y1: number,
            x2: number,
            y2: number
        ) => {
            arr[idx++] = x1;
            arr[idx++] = y1;
            arr[idx++] = 0.1;
            arr[idx++] = x2;
            arr[idx++] = y2;
            arr[idx++] = 0.1;
            return idx;
        };

        if (displayBits.length === 0 && !drainingRef.current) {
            sdaIdx = pushSeg(
                sdaPos,
                sdaIdx,
                CLIP_LEFT,
                BUS_IDLE_SDA,
                CLIP_RIGHT,
                BUS_IDLE_SDA
            );
            sclIdx = pushSeg(
                sclPos,
                sclIdx,
                CLIP_LEFT,
                BUS_IDLE_SCL,
                CLIP_RIGHT,
                BUS_IDLE_SCL
            );
        } else {
            let lastSDA = BUS_IDLE_SDA;
            let lastSCL = BUS_IDLE_SCL;
            const startX = -scrollOffsetRef.current;

            if (startX > CLIP_LEFT && startX < CLIP_RIGHT) {
                sdaIdx = pushSeg(
                    sdaPos,
                    sdaIdx,
                    CLIP_LEFT,
                    BUS_IDLE_SDA,
                    startX,
                    BUS_IDLE_SDA
                );
                sclIdx = pushSeg(
                    sclPos,
                    sclIdx,
                    CLIP_LEFT,
                    BUS_IDLE_SCL,
                    startX,
                    BUS_IDLE_SCL
                );
            }

            for (let i = 0; i < displayBits.length; i++) {
                const bit = displayBits[i];
                const bitStart = i * BIT_WIDTH - scrollOffsetRef.current;
                const bitEnd = (i + 1) * BIT_WIDTH - scrollOffsetRef.current;

                if (bitEnd < CLIP_LEFT) {
                    lastSDA = bit.sda ? SDA_HIGH : SDA_LOW;

                    if (bit.scl === 'static') {
                        lastSCL = SCL_HIGH;
                    } else {
                        lastSCL = SCL_LOW;
                    }
                    continue;
                }
                if (bitStart > CLIP_RIGHT) break;

                const renderStart = Math.max(CLIP_LEFT, bitStart);
                const renderEnd = Math.min(CLIP_RIGHT, bitEnd);
                const targetSDA = bit.sda ? SDA_HIGH : SDA_LOW;

                if (lastSDA !== targetSDA && renderStart >= CLIP_LEFT) {
                    sdaIdx = pushSeg(
                        sdaPos,
                        sdaIdx,
                        renderStart,
                        lastSDA,
                        renderStart,
                        targetSDA
                    );
                }

                sdaIdx = pushSeg(
                    sdaPos,
                    sdaIdx,
                    renderStart,
                    targetSDA,
                    renderEnd,
                    targetSDA
                );
                lastSDA = targetSDA;

                if (bit.scl === 'static') {
                    if (lastSCL !== SCL_HIGH && renderStart >= CLIP_LEFT) {
                        sclIdx = pushSeg(
                            sclPos,
                            sclIdx,
                            renderStart,
                            lastSCL,
                            renderStart,
                            SCL_HIGH
                        );
                    }
                    sclIdx = pushSeg(
                        sclPos,
                        sclIdx,
                        renderStart,
                        SCL_HIGH,
                        renderEnd,
                        SCL_HIGH
                    );
                    lastSCL = SCL_HIGH;
                } else {
                    const t1 = bitStart + BIT_WIDTH * 0.25;
                    const t2 = bitStart + BIT_WIDTH * 0.75;

                    if (lastSCL !== SCL_LOW && renderStart >= CLIP_LEFT) {
                        sclIdx = pushSeg(
                            sclPos,
                            sclIdx,
                            renderStart,
                            lastSCL,
                            renderStart,
                            SCL_LOW
                        );
                    }

                    if (renderStart < t1) {
                        const rS = renderStart;
                        const rE = Math.min(CLIP_RIGHT, t1);
                        if (rS < rE)
                            sclIdx = pushSeg(
                                sclPos,
                                sclIdx,
                                rS,
                                SCL_LOW,
                                rE,
                                SCL_LOW
                            );
                    }

                    if (t1 >= CLIP_LEFT && t1 <= CLIP_RIGHT) {
                        sclIdx = pushSeg(
                            sclPos,
                            sclIdx,
                            t1,
                            SCL_LOW,
                            t1,
                            SCL_HIGH
                        );
                    }

                    if (t1 < renderEnd && t2 > renderStart) {
                        const rS = Math.max(renderStart, t1);
                        const rE = Math.min(CLIP_RIGHT, t2);
                        if (rS < rE)
                            sclIdx = pushSeg(
                                sclPos,
                                sclIdx,
                                rS,
                                SCL_HIGH,
                                rE,
                                SCL_HIGH
                            );
                    }

                    if (t2 >= CLIP_LEFT && t2 <= CLIP_RIGHT) {
                        sclIdx = pushSeg(
                            sclPos,
                            sclIdx,
                            t2,
                            SCL_HIGH,
                            t2,
                            SCL_LOW
                        );
                    }

                    if (t2 < renderEnd) {
                        const rS = Math.max(renderStart, t2);
                        const rE = renderEnd;
                        if (rS < rE)
                            sclIdx = pushSeg(
                                sclPos,
                                sclIdx,
                                rS,
                                SCL_LOW,
                                rE,
                                SCL_LOW
                            );
                    }

                    lastSCL = SCL_LOW;
                }
            }

            const endX =
                displayBits.length * BIT_WIDTH - scrollOffsetRef.current;
            if (endX >= CLIP_LEFT && endX < CLIP_RIGHT) {
                if (lastSDA !== BUS_IDLE_SDA) {
                    sdaIdx = pushSeg(
                        sdaPos,
                        sdaIdx,
                        endX,
                        lastSDA,
                        endX,
                        BUS_IDLE_SDA
                    );
                }
                sdaIdx = pushSeg(
                    sdaPos,
                    sdaIdx,
                    endX,
                    BUS_IDLE_SDA,
                    CLIP_RIGHT,
                    BUS_IDLE_SDA
                );

                const lastBit = displayBits[displayBits.length - 1];
                let lastSCL = BUS_IDLE_SCL;

                if (lastBit) {
                    if (lastBit.scl === 'static') {
                        lastSCL = SCL_HIGH;
                    } else {
                        lastSCL = SCL_LOW;
                    }
                }

                if (lastSCL !== BUS_IDLE_SCL) {
                    sclIdx = pushSeg(
                        sclPos,
                        sclIdx,
                        endX,
                        lastSCL,
                        endX,
                        BUS_IDLE_SCL
                    );
                }
                sclIdx = pushSeg(
                    sclPos,
                    sclIdx,
                    endX,
                    BUS_IDLE_SCL,
                    CLIP_RIGHT,
                    BUS_IDLE_SCL
                );
            } else if (endX < CLIP_LEFT) {
                sdaIdx = pushSeg(
                    sdaPos,
                    sdaIdx,
                    CLIP_LEFT,
                    BUS_IDLE_SDA,
                    CLIP_RIGHT,
                    BUS_IDLE_SDA
                );
                sclIdx = pushSeg(
                    sclPos,
                    sclIdx,
                    CLIP_LEFT,
                    BUS_IDLE_SCL,
                    CLIP_RIGHT,
                    BUS_IDLE_SCL
                );
            }
        }

        for (let i = sdaIdx; i < MAX_POINTS * 3; i++) sdaPos[i] = 999;
        for (let i = sclIdx; i < MAX_POINTS * 3; i++) sclPos[i] = 999;

        sdaLineRef.current.geometry.attributes.position.needsUpdate = true;
        sclLineRef.current.geometry.attributes.position.needsUpdate = true;
        sdaLineRef.current.geometry.setDrawRange(0, sdaIdx / 3);
        sclLineRef.current.geometry.setDrawRange(0, sclIdx / 3);

        if (dotsGroupRef.current) {
            while (dotsGroupRef.current.children.length < displayBits.length) {
                const dot = new THREE.Mesh(dotGeometry, dotMaterials.data);
                dotsGroupRef.current.add(dot);
            }

            displayBits.forEach((bit, i) => {
                const dot = dotsGroupRef.current!.children[i] as THREE.Mesh;
                const bitCenter =
                    (i + 0.5) * BIT_WIDTH - scrollOffsetRef.current;

                if (bitCenter <= CLIP_LEFT || bitCenter >= CLIP_RIGHT) {
                    dot.visible = false;
                    return;
                }

                const prevBit = displayBits[i - 1];

                if (bit.state.includes('start')) {
                    if (!prevBit || prevBit.sda === bit.sda) {
                        dot.visible = false;
                        return;
                    }
                }

                if (bit.state.includes('stop')) {
                    if (!prevBit || prevBit.sda === bit.sda) {
                        dot.visible = false;
                        return;
                    }
                }

                dot.visible = true;
                const y = SDA_LOW - 0.4;
                dot.position.set(bitCenter, y, 0.15);
                dot.material = getDotMaterial(bit.state, transmissionDirection);
            });

            for (
                let i = displayBits.length;
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
            <mesh position={[0, 0, -0.1]}>
                <extrudeGeometry
                    args={[glassShape, { depth: 0.05, bevelEnabled: false }]}
                />
                <meshPhysicalMaterial
                    color={0xffffff}
                    transparent
                    opacity={0.1}
                    transmission={0.9}
                    roughness={0.2}
                />
            </mesh>

            {gridLines}

            <lineSegments
                ref={sdaLineRef}
                frustumCulled={false}
                renderOrder={2}
            >
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array(MAX_POINTS * 3), 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color={0x4ade80} linewidth={3} />
            </lineSegments>

            <lineSegments
                ref={sclLineRef}
                frustumCulled={false}
                renderOrder={2}
            >
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array(MAX_POINTS * 3), 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color={0xfbbf24} linewidth={3} />
            </lineSegments>

            <group ref={dotsGroupRef} renderOrder={10} />

            <mesh position={[0, 3.2, 0.02]} renderOrder={10}>
                <planeGeometry args={[10, 2.5]} />
                <meshBasicMaterial
                    map={headingLabelTexture}
                    transparent
                    opacity={0.9}
                    depthTest={false}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh position={[-10, 2.5, 0.2]} renderOrder={11}>
                <planeGeometry args={[2, 1]} />
                <meshBasicMaterial
                    map={labelTextures.sda}
                    transparent
                    depthTest={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <mesh position={[-10, -2.0, 0.2]} renderOrder={11}>
                <planeGeometry args={[2, 1]} />
                <meshBasicMaterial
                    map={labelTextures.scl}
                    transparent
                    depthTest={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}
