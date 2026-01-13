/**
 * \file I2CBoard.tsx
 * \brief Renders a 3D I²C master or slave board with pins and labels.
 */

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface I2CBoardProps {
    type: 'master' | 'slave';
    position: [number, number, number];
    label?: string;
    address?: string;
}

/**
 * \brief Displays a visual representation of an I²C master or slave device.
 */
export default function I2CBoard({
    type,
    position,
    label,
    address,
}: I2CBoardProps) {
    const boardColor = type === 'master' ? 0x6a2d4f : 0x2d4a6a;
    const labelColor = type === 'master' ? '#ff60a0' : '#60a0ff';
    const labelText = label || (type === 'master' ? 'MASTER' : 'SLAVE');

    const labelTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 512;
        canvas.height = 256;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 60px Arial';
        ctx.fillStyle = labelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, 256, address ? 100 : 128);

        if (address) {
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(address, 256, 170);
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }, [labelColor, labelText, address]);

    return (
        <group position={position}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[3.5, 0.3, 2.5]} />
                <meshStandardMaterial
                    color={boardColor}
                    roughness={0.4}
                    metalness={0.3}
                />
            </mesh>

            <mesh position={[0, 0.25, 0]} castShadow>
                <boxGeometry args={[1.3, 0.2, 1]} />
                <meshStandardMaterial
                    color={0x3a3a3a}
                    roughness={0.3}
                    metalness={0.7}
                />
            </mesh>

            {Array.from({ length: 6 }, (_, i) => i - 2.5).map((i) => (
                <group key={`pin-${i}`}>
                    <mesh position={[i * 0.2, 0.4, 0.4]}>
                        <boxGeometry args={[0.08, 0.12, 0.08]} />
                        <meshStandardMaterial
                            color={0xe0e0e0}
                            metalness={0.9}
                            roughness={0.1}
                        />
                    </mesh>
                    <mesh position={[i * 0.2, 0.4, -0.4]}>
                        <boxGeometry args={[0.08, 0.12, 0.08]} />
                        <meshStandardMaterial
                            color={0xe0e0e0}
                            metalness={0.9}
                            roughness={0.1}
                        />
                    </mesh>
                </group>
            ))}

            <mesh position={[-1.5, 0.35, -0.8]}>
                <cylinderGeometry args={[0.12, 0.12, 0.35, 8]} />
                <meshStandardMaterial
                    color={0x4ade80}
                    roughness={0.2}
                    metalness={0.9}
                />
            </mesh>

            <mesh position={[-1.5, 0.35, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.35, 8]} />
                <meshStandardMaterial
                    color={0xfbbf24}
                    roughness={0.2}
                    metalness={0.9}
                />
            </mesh>

            <mesh position={[-1.5, 0.35, 0.8]}>
                <cylinderGeometry args={[0.12, 0.12, 0.35, 8]} />
                <meshStandardMaterial
                    color={0x6b7280}
                    roughness={0.2}
                    metalness={0.9}
                />
            </mesh>

            <mesh position={[1.5, 0.35, -0.8]}>
                <cylinderGeometry args={[0.12, 0.12, 0.35, 8]} />
                <meshStandardMaterial
                    color={0x4ade80}
                    roughness={0.2}
                    metalness={0.9}
                />
            </mesh>

            <mesh position={[1.5, 0.35, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.35, 8]} />
                <meshStandardMaterial
                    color={0xfbbf24}
                    roughness={0.2}
                    metalness={0.9}
                />
            </mesh>

            <mesh position={[1.5, 0.35, 0.8]}>
                <cylinderGeometry args={[0.12, 0.12, 0.35, 8]} />
                <meshStandardMaterial
                    color={0x6b7280}
                    roughness={0.2}
                    metalness={0.9}
                />
            </mesh>

            <sprite position={[0, 1.2, 0]} scale={[3.5, 1.75, 1]}>
                <spriteMaterial map={labelTexture} />
            </sprite>
        </group>
    );
}
