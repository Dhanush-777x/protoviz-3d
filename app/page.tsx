/**
 * \file page.tsx
 * \brief Application entry page for the protocol visualizer.
 *
 * Hosts the main 3D protocol scene, tutorial overlays,
 * and global navigation components.
 */

'use client';

import { useState } from 'react';
import ProtocolScene from '@/components/protocol-visualizer/ProtocolScene';
import UARTTutorial from '@/components/protocol-visualizer/protocols/uart/UARTTutorial';
import FloatingNavBar from '@/components/FloatingNavBar';
import { useUARTStore } from '@/components/protocol-visualizer/protocols/uart/useUARTLogic';
import { CircleQuestionMark } from 'lucide-react';

/**
 * \brief Home page component.
 *
 * Responsibilities:
 * - Hosts the main protocol visualization scene
 * - Integrates UART tutorial flow and deep-dive mode
 * - Renders global floating navigation
 * - Provides quick-access help entry point
 *
 * \return Root application layout.
 */
export default function Home() {
  /**
   * \brief Controls manual opening of the UART tutorial panel.
   *
   * Used by the floating help button to force the tutorial UI open.
   */
  const [showTutorial, setShowTutorial] = useState(false);

  /**
   * \brief Current tutorial step and enable state.
   *
   * Used to coordinate global UI effects such as
   * deep-dive background dimming.
   */
  const tutorialStep = useUARTStore((state) => state.tutorialStep);
  const tutorialEnabled = useUARTStore((state) => state.tutorialEnabled);

  return (
    <main className="w-screen h-screen relative">
      <FloatingNavBar />

      {tutorialEnabled && tutorialStep === 'deep-dive' && (
        <div className="hidden lg:block fixed inset-0 z-[1200] bg-black/70 backdrop-blur-[1px] animate-dim-to-brain pointer-events-none" />
      )}
      {/* Tutorial */}
      <UARTTutorial
        forceOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      {/* Main scene */}
      <ProtocolScene protocol="uart" />

      {/* Help button */}
      <button
        onClick={() => setShowTutorial(true)}
        title="View UART Tutorial"
        className="fixed bottom-6 right-4 z-[1300] p-3 rounded-xl bg-bg-panel border border-primary-border backdrop-blur-md shadow-glow-glass-primary transition-all hover:scale-105 hover:shadow-glow-glass-primary-hover"
      >
        <CircleQuestionMark
          className="w-5 h-5 text-text-main"
          strokeWidth={2.5}
        />
      </button>
    </main>
  );
}
