/**
 * \file InfoPoints.tsx
 * \brief Renders interactive 3D information markers for I²C scene components.
 */

import { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface InfoPoint {
    position: [number, number, number];
    title: string;
    description: string;
    color?: string;
}

interface InfoPointsProps {
    points: InfoPoint[];
    busPullupEnabled?: Boolean;
}

/**
 * \brief Displays a single interactive info marker with hover or tap details.
 */
function SingleInfoPoint({
    position,
    title,
    description,
    color = '#00ffaa',
}: InfoPoint) {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);

    const isMobile =
        typeof window !== 'undefined' &&
        window.matchMedia('(pointer: coarse)').matches;

    useEffect(() => {
        if (!hovered || !isMobile) return;

        const close = () => setHovered(false);
        window.addEventListener('touchstart', close);

        return () => window.removeEventListener('touchstart', close);
    }, [hovered]);

    useFrame((state) => {
        if (meshRef.current && glowRef.current) {
            const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.15 + 1;
            meshRef.current.scale.setScalar(hovered ? 1.5 : pulse);
            glowRef.current.scale.setScalar(hovered ? 2.5 : pulse * 1.8);

            const glowMaterial = glowRef.current
                .material as THREE.MeshBasicMaterial;
            glowMaterial.opacity = hovered
                ? 0.4
                : Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.2;
        }
    });

    return (
        <group position={position}>
            <mesh ref={glowRef}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                />
            </mesh>

            <mesh
                ref={meshRef}
                onPointerEnter={() => {
                    if (!isMobile) setHovered(true);
                }}
                onPointerLeave={() => {
                    if (!isMobile) setHovered(false);
                }}
                onClick={() => {
                    if (isMobile) setHovered((v) => !v);
                }}
            >
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial
                    color={hovered ? '#ffffff' : color}
                    emissive={color}
                    emissiveIntensity={hovered ? 1.5 : 0.8}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {hovered && (
                <Html
                    position={[0, 1.5, 0]}
                    center
                    distanceFactor={8}
                    zIndexRange={[1000, 0]}
                    style={{ pointerEvents: 'none' }}
                >
                    <div
                        className="info-tooltip max-w-[720px] min-w-[620px]"
                        style={{
                            border: `2px solid ${color}`,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${color}40`,
                        }}
                    >
                        <div
                            className="info-tooltip-title"
                            style={{
                                color,
                                textShadow: `0 0 10px ${color}80`,
                            }}
                        >
                            {title}
                        </div>

                        <div className="info-tooltip-desc">{description}</div>
                        <div
                            className="info-tooltip-arrow"
                            style={{ borderTop: `8px solid ${color}` }}
                        />
                    </div>
                </Html>
            )}
        </group>
    );
}

/**
 * \brief Conditionally renders multiple info markers when the I²C bus is active.
 */
export default function InfoPoints({
    points,
    busPullupEnabled = false,
}: InfoPointsProps) {
    if (!busPullupEnabled) {
        return null;
    }
    return (
        <group>
            {points.map((point, index) => (
                <SingleInfoPoint key={index} {...point} />
            ))}
        </group>
    );
}
