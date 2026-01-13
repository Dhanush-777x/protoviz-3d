/**
 * \file UARTBoard.tsx
 * \brief Renders a 3D UART TX/RX board model with labeled connectors.
 */

'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

interface UARTBoardProps {
    type: 'tx' | 'rx';
    position: [number, number, number];
}

/**
 * \brief Renders a UART transmitter or receiver board based on the specified type.
 */
export default function UARTBoard({ type, position }: UARTBoardProps) {
    const boardColor = type === 'tx' ? 0x2d6a4f : 0x264a6e;

    const labelColor = type === 'tx' ? '#ff6060' : '#6060ff';
    const labelText = type === 'tx' ? 'TX' : 'RX';

    const labelTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 512;
        canvas.height = 256;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = labelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, 256, 128);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        return texture;
    }, [labelColor, labelText]);

    useEffect(() => {
        return () => {
            labelTexture.dispose();
        };
    }, [labelTexture]);

    return (
        <group position={position}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[4, 0.3, 3]} />
                <meshStandardMaterial
                    color={boardColor}
                    roughness={0.4}
                    metalness={0.3}
                />
            </mesh>

            <mesh position={[0, 0.25, 0]} castShadow>
                <boxGeometry args={[1.5, 0.2, 1.2]} />
                <meshStandardMaterial
                    color={0x3a3a3a}
                    roughness={0.3}
                    metalness={0.7}
                />
            </mesh>

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

            <sprite position={[0, 1, 0]} scale={[3, 1.5, 1]}>
                <spriteMaterial map={labelTexture} transparent />
            </sprite>
        </group>
    );
}
