/**
 * \file UARTParticles.tsx
 * \brief Animated particle flow visualization for UART data transmission.
 *
 * Renders moving particles along the UART signal wire to visually represent
 * data flow, baud-rate speed, and fault conditions such as wire shorting.
 */

'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUARTStore } from './useUARTLogic';

/**
 * \brief Runtime particle representation.
 *
 * Each particle tracks its mesh, glow effect,
 * normalized curve progress, and travel speed.
 */
interface Particle {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  progress: number;
  speed: number;
}

/**
 * \brief UART data flow particle system.
 *
 * Responsibilities:
 * - Spawns particles during transmission
 * - Adjusts particle speed and density based on baud rate
 * - Visually indicates normal transmission vs short-circuit faults
 * - Resets cleanly when transmission stops
 *
 * \return Three.js group containing UART particles.
 */
export default function UARTParticles() {
  const groupRef = useRef<THREE.Group>(null);

  /**
   * \brief Holds all active UART particles.
   *
   * Particles are spawned, animated, and removed
   * based on transmission state and baud rate.
   */
  const particlesRef = useRef<Particle[]>([]);

  /**
   * \brief Timer used to spawn particles at baud-rate-dependent intervals.
   */
  const particleTimerRef = useRef(0);
  const prevIsTransmittingRef = useRef(false);

  const store = useUARTStore();
  const { isTransmitting, wireShorted, isPaused, tutorialHold } = store;
  const baudRate = 'baudRate' in store ? (store as any).baudRate : 9600;

  /**
   * \brief Defines the signal path between TX and RX pins.
   *
   * Uses a smooth Catmull–Rom spline to visually represent
   * the UART signal wire, adapting when wires are shorted.
   */
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

  /**
   * \brief Main particle animation loop.
   *
   * - Spawns particles based on baud rate
   * - Advances particles along the signal curve
   * - Fades particles out near the receiver
   * - Resets particles when transmission ends
   * - Generates spark effects when wires are shorted
   */
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (isPaused || tutorialHold) return;

    /**
     * \brief Hard-resets particles when transmission ends.
     *
     * Prevents stale particles from persisting
     * across multiple transmissions.
     */
    if (prevIsTransmittingRef.current && !isTransmitting) {
      // Remove all particle meshes
      particlesRef.current.forEach((p) => {
        groupRef.current?.remove(p.mesh);
      });

      // Reset particle state
      particlesRef.current = [];
      particleTimerRef.current = 0;
    }

    // Update previous state
    prevIsTransmittingRef.current = isTransmitting;

    /**
     * \brief Scales particle speed and density based on baud rate.
     *
     * Higher baud rates produce faster and denser particle flow
     * to visually convey increased data throughput.
     */
    const baudScaleFactor = baudRate / 9600; // Normalize to base rate
    const particleSpeed = 2 * Math.sqrt(baudScaleFactor); // Speed increases with baud rate (but not linearly)

    const spawnInterval = 0.5 / baudScaleFactor;

    particleTimerRef.current += delta;

    // Create new particles synchronized with baud rate
    if (
      isTransmitting &&
      !wireShorted &&
      particleTimerRef.current >= spawnInterval
    ) {
      particleTimerRef.current = 0;

      // Higher limit for faster baud rates to show continuous flow
      const maxParticles = Math.min(60, 20 + Math.floor(baudScaleFactor * 10));

      if (particlesRef.current.length < maxParticles) {
        const particleGeometry = new THREE.SphereGeometry(0.18, 16, 16);
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: 0xffeb3b,
          transparent: true,
          opacity: 1,
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

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

    // Update particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const particle = particlesRef.current[i];
      particle.progress += delta * particle.speed;
      const t = Math.min(particle.progress, 1);
      const pos = curve.getPoint(t);
      particle.mesh.position.copy(pos);

      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      const glowMaterial = particle.glow.material as THREE.MeshBasicMaterial;

      // Smoother fade out
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

    /**
     * \brief Generates chaotic spark particles when wires are shorted.
     *
     * Represents electrical fault conditions with erratic motion,
     * increased brightness, and random emission points.
     */
    if (wireShorted) {
      // More frequent sparks based on baud rate
      const sparkChance = 0.98 - baudScaleFactor * 0.05;

      if (Math.random() > sparkChance && particlesRef.current.length < 20) {
        const sparkSize = 0.12 + Math.random() * 0.08;
        const particleGeometry = new THREE.SphereGeometry(sparkSize, 12, 12);
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: 0xff3030,
          transparent: true,
          opacity: 1,
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        const glowGeometry = new THREE.SphereGeometry(sparkSize * 2, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xff6060,
          transparent: true,
          opacity: 0.6,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        particle.add(glow);

        const pos = curve.getPoint(Math.random());
        particle.position.copy(pos);

        // Add random offset for chaotic spark effect
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
