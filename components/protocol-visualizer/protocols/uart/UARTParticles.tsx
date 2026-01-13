/**
 * \file UARTParticles.tsx
 * \brief Animates data flow particles and fault effects for UART transmission visualization.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUARTStore } from './useUARTLogic';

interface Particle {
    mesh: THREE.Mesh;
    glow: THREE.Mesh;
    progress: number;
    speed: number;
}

/**
 * \brief Renders animated particles representing UART data flow and wire fault effects.
 */
export default function UARTParticles() {
    const groupRef = useRef<THREE.Group>(null);

    const particlesRef = useRef<Particle[]>([]);

    const particleTimerRef = useRef(0);
    const prevIsTransmittingRef = useRef(false);

    const store = useUARTStore();
    const { isTransmitting, wireShorted, isPaused, tutorialHold } = store;
    const baudRate = 'baudRate' in store ? (store as any).baudRate : 9600;

    const curve = useMemo(() => {
        const start = new THREE.Vector3(-4.5, -0.5, -0.5);
        const end = new THREE.Vector3(4.5, -0.5, wireShorted ? -0.5 : 0.5);
        const midY = Math.max(start.y, end.y) + 1.5 + 0.3;

        return new THREE.CatmullRomCurve3([
            start,
            new THREE.Vector3(start.x + 2, midY, start.z),
            new THREE.Vector3(end.x - 2, midY, end.z),
            end,
        ]);
    }, [wireShorted]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        if (isPaused || tutorialHold) return;

        if (prevIsTransmittingRef.current && !isTransmitting) {
            particlesRef.current.forEach((p) => {
                groupRef.current?.remove(p.mesh);
            });

            particlesRef.current = [];
            particleTimerRef.current = 0;
        }

        prevIsTransmittingRef.current = isTransmitting;

        const baudScaleFactor = baudRate / 9600;

        const particleSpeed = 2 * Math.sqrt(baudScaleFactor);

        const spawnInterval = 0.5 / baudScaleFactor;

        particleTimerRef.current += delta;

        if (
            isTransmitting &&
            !wireShorted &&
            particleTimerRef.current >= spawnInterval
        ) {
            particleTimerRef.current = 0;

            const maxParticles = Math.min(
                60,
                20 + Math.floor(baudScaleFactor * 10)
            );

            if (particlesRef.current.length < maxParticles) {
                const particleGeometry = new THREE.SphereGeometry(0.18, 16, 16);
                const particleMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffeb3b,
                    transparent: true,
                    opacity: 1,
                });
                const particle = new THREE.Mesh(
                    particleGeometry,
                    particleMaterial
                );

                const glowGeometry = new THREE.SphereGeometry(0.35, 16, 16);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffeb3b,
                    transparent: true,
                    opacity: 0.5,
                });
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                particle.add(glow);

                const pos = curve.getPoint(0);
                particle.position.copy(pos);

                groupRef.current.add(particle);
                particlesRef.current.push({
                    mesh: particle,
                    glow,
                    progress: 0,
                    speed: particleSpeed + Math.random() * 0.1,
                });
            }
        }

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const particle = particlesRef.current[i];
            particle.progress += delta * particle.speed;
            const t = Math.min(particle.progress, 1);
            const pos = curve.getPoint(t);
            particle.mesh.position.copy(pos);

            const material = particle.mesh.material as THREE.MeshBasicMaterial;
            const glowMaterial = particle.glow
                .material as THREE.MeshBasicMaterial;

            const fadeStart = 0.7;
            if (t > fadeStart) {
                const fadeProgress = (t - fadeStart) / (1 - fadeStart);
                material.opacity = 1 - fadeProgress;
                glowMaterial.opacity = (1 - fadeProgress) * 0.5;
            } else {
                material.opacity = 1;
                glowMaterial.opacity = 0.5;
            }

            if (t >= 1) {
                groupRef.current?.remove(particle.mesh);
                particlesRef.current.splice(i, 1);
            }
        }

        if (wireShorted) {
            const sparkChance = 0.98 - baudScaleFactor * 0.05;

            if (
                Math.random() > sparkChance &&
                particlesRef.current.length < 20
            ) {
                const sparkSize = 0.12 + Math.random() * 0.08;
                const particleGeometry = new THREE.SphereGeometry(
                    sparkSize,
                    12,
                    12
                );
                const particleMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff3030,
                    transparent: true,
                    opacity: 1,
                });
                const particle = new THREE.Mesh(
                    particleGeometry,
                    particleMaterial
                );

                const glowGeometry = new THREE.SphereGeometry(
                    sparkSize * 2,
                    12,
                    12
                );
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff6060,
                    transparent: true,
                    opacity: 0.6,
                });
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                particle.add(glow);

                const pos = curve.getPoint(Math.random());
                particle.position.copy(pos);

                particle.position.x += (Math.random() - 0.5) * 0.5;
                particle.position.y += (Math.random() - 0.5) * 0.5;
                particle.position.z += (Math.random() - 0.5) * 0.3;

                groupRef.current.add(particle);
                particlesRef.current.push({
                    mesh: particle,
                    glow,
                    progress: 0.5 + Math.random() * 0.3,
                    speed: 1.5 + Math.random() * 0.5,
                });
            }
        }
    });

    return <group ref={groupRef} />;
}
