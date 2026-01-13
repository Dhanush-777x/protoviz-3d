/**
 * \file I2CParticles.tsx
 * \brief Animates visual data and clock particles flowing along I²C bus lines.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useI2CStore } from './useI2CLogic';

interface Particle {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  progress: number;
  speed: number;
  line: 'sda' | 'scl';
  reverse: boolean;
  targetDevice: 'slave1' | 'slave2';
}

/**
 * \brief Spawns and animates I²C SDA and SCL particles based on bus activity.
 */
export default function I2CParticles() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<Particle[]>([]);
  const particleTimerRef = useRef(0);
  const prevIsTransmittingRef = useRef(false);

  const {
    isTransmitting,
    busPullupEnabled,
    isPaused,
    internalClockFrequency,
    transmissionDirection,
    currentState,
    selectedSlaveAddress,
    tutorialHold,
  } = useI2CStore();

  const isReadPhase =
    transmissionDirection === 'read' &&
    (currentState === 'data' || currentState === 'address');

  const sdaSlave1Curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.5, -0.5, -0.8),

      new THREE.Vector3(-4.5, 0.5, -0.8),
      new THREE.Vector3(-4.5, 1.5, -0.8),

      new THREE.Vector3(-1, 1.5, -0.8),
      new THREE.Vector3(0, 1.5, -0.8),

      new THREE.Vector3(0, 0.5, -0.8),
      new THREE.Vector3(0, -0.5, -0.8),
    ]);
  }, []);

  const sdaSlave2Curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.5, -0.5, -0.8),

      new THREE.Vector3(-4.5, 0.5, -0.8),
      new THREE.Vector3(-4.5, 1.5, -0.8),

      new THREE.Vector3(-1, 1.5, -0.8),
      new THREE.Vector3(0, 1.5, -0.8),
      new THREE.Vector3(3.5, 1.5, -0.8),
      new THREE.Vector3(4.5, 1.5, -0.8),

      new THREE.Vector3(4.5, 0.5, -0.8),
      new THREE.Vector3(4.5, -0.5, -0.8),
    ]);
  }, []);

  const sclSlave1Curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.5, -0.5, 0),

      new THREE.Vector3(-4.5, 0.35, 0),
      new THREE.Vector3(-4.5, 1.2, 0),

      new THREE.Vector3(-1, 1.2, 0),
      new THREE.Vector3(0, 1.2, 0),

      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, -0.5, 0),
    ]);
  }, []);

  const sclSlave2Curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.5, -0.5, 0),

      new THREE.Vector3(-4.5, 0.35, 0),
      new THREE.Vector3(-4.5, 1.2, 0),

      new THREE.Vector3(-1, 1.2, 0),
      new THREE.Vector3(0, 1.2, 0),
      new THREE.Vector3(3.5, 1.2, 0),
      new THREE.Vector3(4.5, 1.2, 0),

      new THREE.Vector3(4.5, 0.35, 0),
      new THREE.Vector3(4.5, -0.5, 0),
    ]);
  }, []);

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

    if (!isTransmitting || !busPullupEnabled) return;

    const freqScaleFactor = internalClockFrequency / 10000;

    const particleSpeed = 1.2 * Math.sqrt(freqScaleFactor);
    const spawnInterval = 0.25 / freqScaleFactor;

    particleTimerRef.current += delta;

    const targetDevice = selectedSlaveAddress === 0x68 ? 'slave1' : 'slave2';

    if (particleTimerRef.current >= spawnInterval) {
      particleTimerRef.current = 0;

      const maxParticles = Math.min(80, 30 + Math.floor(freqScaleFactor * 15));

      if (particlesRef.current.length < maxParticles) {
        const sdaParticle = createParticle(
          'sda',
          isReadPhase,
          particleSpeed,
          targetDevice
        );
        if (sdaParticle) {
          groupRef.current.add(sdaParticle.mesh);
          particlesRef.current.push(sdaParticle);
        }

        const sclParticle = createParticle(
          'scl',
          false,
          particleSpeed,
          targetDevice
        );
        if (sclParticle) {
          groupRef.current.add(sclParticle.mesh);
          particlesRef.current.push(sclParticle);
        }
      }
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const particle = particlesRef.current[i];

      particle.progress += delta * particle.speed;
      const t = Math.min(particle.progress, 1);

      let curve: THREE.CatmullRomCurve3;
      if (particle.line === 'sda') {
        curve =
          particle.targetDevice === 'slave1' ? sdaSlave1Curve : sdaSlave2Curve;
      } else {
        curve =
          particle.targetDevice === 'slave1' ? sclSlave1Curve : sclSlave2Curve;
      }

      const curveT = particle.reverse ? 1 - t : t;
      const pos = curve.getPoint(curveT);
      particle.mesh.position.copy(pos);

      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      const glowMaterial = particle.glow.material as THREE.MeshBasicMaterial;

      const fadeStart = 0.75;
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
  });

  /**
   * \brief Creates a single animated particle representing an I²C signal transition.
   */
  function createParticle(
    line: 'sda' | 'scl',
    reverse: boolean,
    speed: number,
    targetDevice: 'slave1' | 'slave2'
  ): Particle | null {
    const isSda = line === 'sda';
    const color = isSda ? 0x4ade80 : 0xfbbf24;

    const particleGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    particle.add(glow);

    let curve: THREE.CatmullRomCurve3;
    if (isSda) {
      curve = targetDevice === 'slave1' ? sdaSlave1Curve : sdaSlave2Curve;
    } else {
      curve = targetDevice === 'slave1' ? sclSlave1Curve : sclSlave2Curve;
    }

    const startT = reverse ? 1 : 0;
    const pos = curve.getPoint(startT);
    particle.position.copy(pos);

    return {
      mesh: particle,
      glow,
      progress: 0,
      speed: speed + Math.random() * 0.2,
      line,
      reverse,
      targetDevice,
    };
  }

  return <group ref={groupRef} />;
}
