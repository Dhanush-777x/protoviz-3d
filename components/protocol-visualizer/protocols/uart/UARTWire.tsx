/**
 * \file UARTWire.tsx
 * \brief Renders a curved UART signal or ground wire with visual fault indication.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUARTStore } from './useUARTLogic';

interface UARTWireProps {
    start: THREE.Vector3;
    end: THREE.Vector3;
    color: number;
    yOffset: number;
}

/**
 * \brief Renders a UART wire segment and animates emissive effects during wire faults.
 */
export default function UARTWire({
    start,
    end,
    color,
    yOffset,
}: UARTWireProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const { wireShorted } = useUARTStore();

    const curve = useMemo(() => {
        const midY = Math.max(start.y, end.y) + 1.5 + yOffset;
        return new THREE.CatmullRomCurve3([
            start,
            new THREE.Vector3(start.x + 2, midY, start.z),
            new THREE.Vector3(end.x - 2, midY, end.z),
            end,
        ]);
    }, [start, end, yOffset]);

    useFrame(() => {
        if (meshRef.current) {
            const material = meshRef.current
                .material as THREE.MeshStandardMaterial;

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
