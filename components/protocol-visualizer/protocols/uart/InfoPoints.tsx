/**
 * \file InfoPoints.tsx
 * \brief Interactive information markers for the 3D protocol scene.
 *
 * Displays hoverable points attached to scene elements that
 * explain physical and logical aspects of the protocol visualization.
 */

import { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

/**
 * \brief Information point definition.
 *
 * Represents a 3D marker with explanatory content.
 *
 * \param position World-space position of the marker.
 * \param title Short heading shown on hover.
 * \param description Detailed explanation text.
 * \param color Optional accent color for the marker.
 */
interface InfoPoint {
  position: [number, number, number];
  title: string;
  description: string;
  color?: string;
}

/**
 * \brief Properties for the InfoPoints container.
 *
 * \param points List of information points to render.
 * \param wireShorted When true, info points are hidden to avoid confusion.
 */
interface InfoPointsProps {
  points: InfoPoint[];
  wireShorted?: boolean;
}

/**
 * \brief Single interactive information point.
 *
 * Renders a pulsing 3D marker with a hover-triggered
 * explanatory card anchored in screen space.
 *
 * \param position World-space position of the marker.
 * \param title Marker title.
 * \param description Marker description.
 * \param color Marker accent color.
 * \return Three.js group representing the info point.
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

  /**
   * \brief Hover-driven pulse animation.
   *
   * Scales the marker and glow subtly over time and
   * increases emphasis when hovered.
   */
  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      // Gentle pulse animation
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.15 + 1;
      meshRef.current.scale.setScalar(hovered ? 1.5 : pulse);
      glowRef.current.scale.setScalar(hovered ? 2.5 : pulse * 1.8);

      // Opacity pulse for glow
      const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = hovered
        ? 0.4
        : Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Main point */}
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

      {/* Info Card */}
      {hovered && (
        <Html
          position={[0, 1, 0]}
          center
          distanceFactor={8}
          zIndexRange={[1000, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(18, 20, 30, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `2px solid ${color}`,
              borderRadius: '12px',
              padding: '16px 20px',
              minWidth: '620px',
              maxWidth: '720px',
              boxShadow: `
                0 8px 32px rgba(0, 0, 0, 0.6),
                0 0 20px ${color}40,
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `,
              transform: 'translateY(-10px)',
              animation: 'fadeSlideIn 0.2s ease-out',
            }}
          >
            <style>
              {`
                @keyframes fadeSlideIn {
                  from {
                    opacity: 0;
                    transform: translateY(-5px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(-10px);
                  }
                }
              `}
            </style>

            {/* Title */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: color,
                marginBottom: '8px',
                textShadow: `0 0 10px ${color}80`,
                letterSpacing: '0.5px',
              }}
            >
              {title}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: '28px',
                color: '#e8ebf2',
                lineHeight: '1.5',
                opacity: 0.9,
              }}
            >
              {description}
            </div>

            {/* Arrow pointer */}
            <div
              style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `8px solid ${color}`,
              }}
            />
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * \brief Information point collection.
 *
 * Renders all info points unless the scene is in
 * a fault state (e.g., wires shorted).
 *
 * \param points Array of info point definitions.
 * \param wireShorted Fault-state flag.
 * \return Group of info markers or null.
 */
export default function InfoPoints({
  points,
  wireShorted = false,
}: InfoPointsProps) {
  // Don't render anything if wires are shorted
  if (wireShorted) {
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
