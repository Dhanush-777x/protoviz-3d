/**
 * \file ProtocolScene.tsx
 * \brief 3D scene container for protocol visualizations.
 *
 * Sets up the Three.js canvas, camera, lighting, controls,
 * and renders the selected protocol scene with its control panel.
 */

'use client';

import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from '@react-three/drei';
import UARTScene from './protocols/uart/UARTScene';
import ControlPanel from './ControlPanel';
import { ProtocolType } from '@/types/protocols';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * \brief Properties for ProtocolScene.
 *
 * \param protocol Selected protocol type to visualize.
 */
interface ProtocolSceneProps {
  protocol: ProtocolType;
}

/**
 * \brief Responsive camera controller.
 *
 * Adjusts camera position and field-of-view dynamically
 * based on viewport aspect ratio to ensure optimal framing
 * across mobile, tablet, and desktop screens.
 *
 * \return null (camera side-effects only).
 */
function ResponsiveCamera() {
  const { camera, size } = useThree();

  /**
   * \brief Updates camera parameters on viewport resize.
   *
   * Ensures the protocol scene remains properly framed
   * by adapting camera distance and FOV to screen size.
   */
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const aspect = size.width / size.height;

    if (aspect < 0.75) {
      // Small mobile (portrait)
      cam.position.set(0, 4.5, 20);
      cam.fov = 70;
    } else if (aspect < 1.2) {
      // Tablet / small screens
      cam.position.set(0, 4, 19);
      cam.fov = 65;
    } else {
      // Desktop
      cam.position.set(0, 3, 18);
      cam.fov = 60;
    }

    cam.lookAt(0, 2, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

/**
 * \brief Protocol visualization scene.
 *
 * Responsibilities:
 * - Initializes Three.js canvas and renderer
 * - Configures lighting, fog, and background
 * - Renders protocol-specific 3D scenes
 * - Attaches orbit controls and UI control panel
 *
 * \param protocol Selected protocol to render.
 * \return JSX element containing the full visualization scene.
 */
export default function ProtocolScene({ protocol }: ProtocolSceneProps) {
  return (
    <div className="relative w-full h-full">
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

        {/* Lighting */}
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
        <pointLight position={[-10, 8, -5]} intensity={0.6} color="#ffffff" />
        <pointLight position={[10, 6, 5]} intensity={0.4} color="#ffffff" />
        <pointLight
          position={[0, 20, 0]}
          intensity={0.8}
          distance={50}
          color="#ffffff"
        />

        {/* Protocol-specific scene */}
        {protocol === 'uart' && <UARTScene />}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={6}
          maxDistance={40}
          target={[0, 2, 0]}
          enablePan={false}
        />
      </Canvas>

      <ControlPanel protocol={protocol} />
    </div>
  );
}
