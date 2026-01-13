/**
 * \file ProtocolScene.tsx
 * \brief Three.js scene wrapper that renders protocol-specific 3D visualizations.
 */

'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { PerspectiveCamera } from 'three';
import { useEffect, useState } from 'react';

import UARTScene from './protocols/uart/UARTScene';
import I2CScene from './protocols/i2c/I2CScene';
import { ProtocolType } from '@/types/protocols';

interface ProtocolSceneProps {
    protocol: ProtocolType;
}

/**
 * \brief Adjusts camera position and field-of-view based on viewport aspect ratio.
 */
function ResponsiveCamera() {
    const { camera, size } = useThree();

    useEffect(() => {
        const cam = camera as PerspectiveCamera;

        if (size.height === 0) return;
        const aspect = size.width / size.height;

        if (aspect < 0.75) {
            cam.position.set(0, 4.5, 20);
            cam.fov = 70;
        } else if (aspect < 1.2) {
            cam.position.set(0, 4, 19);
            cam.fov = 65;
        } else {
            cam.position.set(0, 3, 18);
            cam.fov = 60;
        }

        cam.lookAt(0, 2, 0);
        cam.updateProjectionMatrix();
    }, [camera, size]);

    return null;
}

/**
 * \brief Renders the active protocol 3D scene with smooth transition effects.
 */
export default function ProtocolScene({ protocol }: ProtocolSceneProps) {
    const [isFading, setIsFading] = useState(false);
    const [displayProtocol, setDisplayProtocol] =
        useState<ProtocolType>(protocol);

    useEffect(() => {
        if (protocol === displayProtocol) return;

        setIsFading(true);

        const timer = setTimeout(() => {
            setDisplayProtocol(protocol);

            setIsFading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [protocol, displayProtocol]);

    return (
        <div
            className="relative w-full h-full transition-all duration-300 ease-in-out"
            style={{
                opacity: isFading ? 0 : 1,
                filter: isFading ? 'blur(3px)' : 'blur(0)',
                transform: isFading ? 'scale(0.98)' : 'scale(1)',
            }}
        >
            <Canvas
                camera={{ position: [0, 3, 15], fov: 60 }}
                shadows
                gl={{
                    antialias: true,
                    toneMapping: 2,
                    toneMappingExposure: 1.2,
                }}
            >
                <ResponsiveCamera />

                <color attach="background" args={['#141825']} />
                <fog attach="fog" args={['#0f1220', 40, 100]} />

                <ambientLight intensity={0.9} color="#ffffff" />
                <directionalLight
                    position={[5, 15, 5]}
                    intensity={1.8}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-left={-20}
                    shadow-camera-right={20}
                    shadow-camera-top={20}
                    shadow-camera-bottom={-20}
                />
                <pointLight position={[-10, 8, -5]} intensity={0.6} />
                <pointLight position={[10, 6, 5]} intensity={0.4} />
                <pointLight
                    position={[0, 20, 0]}
                    intensity={0.8}
                    distance={50}
                />

                {displayProtocol === 'uart' && <UARTScene />}
                {displayProtocol === 'i2c' && <I2CScene />}

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={6}
                    maxDistance={40}
                    target={[0, 2, 0]}
                    enablePan={false}
                />
            </Canvas>
        </div>
    );
}
