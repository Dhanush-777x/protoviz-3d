/**
 * \file Page.tsx
 * \brief Top-level page component that orchestrates protocol selection, scenes, tutorials, and global UI overlays.
 */

'use client';

import { useState, useEffect } from 'react';
import { ProtocolType } from '@/types/protocols';
import ProtocolScene from '@/components/protocol-visualizer/ProtocolScene';
import ControlPanel from '@/components/protocol-visualizer/ControlPanel';
import ProtovizIntro from '@/components/ProtovizIntro';
import UARTBasics from '@/components/protocol-visualizer/protocols/uart/UARTBasics';
import I2CBasics from '@/components/protocol-visualizer/protocols/i2c/I2CBasics';
import FloatingNavBar from '@/components/FloatingNavBar';
import { useUARTStore } from '@/components/protocol-visualizer/protocols/uart/useUARTLogic';
import { useCommonStore } from '@/components/protocol-visualizer/CommonStore';
import { CircleQuestionMark } from 'lucide-react';

/**
 * \brief Renders the main application layout and manages protocol switching and tutorial flow.
 */
export default function Home() {
    const [currentProtocol, setCurrentProtocol] =
        useState<ProtocolType>('uart');

    const [showTutorial, setShowTutorial] = useState(false);

    const [hasSeenProtovizIntro, setHasSeenProtovizIntro] = useState(false);
    const [highlightHelp, setHighlightHelp] = useState(false);

    const showDeepDiveOverlay = useCommonStore(
        (state) => state.showDeepDiveOverlay
    );

    const handleProtocolChange = (newProtocol: ProtocolType) => {
        setCurrentProtocol(newProtocol);
        setShowTutorial(false);
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        setHasSeenProtovizIntro(
            localStorage.getItem('protoviz-intro-seen') === 'true'
        );
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const hasSeenIntro =
            localStorage.getItem('protoviz-intro-seen') === 'true';
        const hasHighlightedHelp =
            localStorage.getItem('protoviz-help-highlighted') === 'true';

        setHasSeenProtovizIntro(hasSeenIntro);

        if (hasSeenIntro && !hasHighlightedHelp) {
            setHighlightHelp(true);

            localStorage.setItem('protoviz-help-highlighted', 'true');

            const timer = setTimeout(() => {
                setHighlightHelp(false);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <main className="w-screen h-screen relative">
            <ProtovizIntro
                onClose={() => {
                    localStorage.setItem('protoviz-intro-seen', 'true');
                    setHasSeenProtovizIntro(true);
                    setHighlightHelp(true);

                    setTimeout(() => {
                        setHighlightHelp(false);
                    }, 5000);
                }}
            />
            <FloatingNavBar protocol={currentProtocol} />

            {(currentProtocol === 'uart' || currentProtocol === 'i2c') &&
                showDeepDiveOverlay && (
                    <div className="hidden lg:block fixed inset-0 z-[1200] bg-black/70 backdrop-blur-[1px] animate-dim-to-brain pointer-events-none" />
                )}

            {(currentProtocol === 'uart' || currentProtocol === 'i2c') &&
                highlightHelp && (
                    <div className="hidden lg:block fixed inset-0 z-[1200] bg-black/70 backdrop-blur-[1px] animate-dim-to-question pointer-events-none" />
                )}

            {currentProtocol === 'uart' && showTutorial && (
                <UARTBasics
                    forceOpen={showTutorial}
                    onClose={() => setShowTutorial(false)}
                />
            )}

            {currentProtocol === 'i2c' && showTutorial && (
                <I2CBasics
                    forceOpen={showTutorial}
                    onClose={() => setShowTutorial(false)}
                />
            )}

            <ProtocolScene protocol={currentProtocol} />

            <ControlPanel
                protocol={currentProtocol}
                onProtocolChange={handleProtocolChange}
            />

            <button
                onClick={() => setShowTutorial(true)}
                title={`View ${currentProtocol.toUpperCase()} Tutorial`}
                className={`fixed bottom-6 right-4 z-[1300] p-3 rounded-xl bg-bg-panel border border-primary-border backdrop-blur-md transition-all hover:scale-105 hover:shadow-glow-glass-primary-hover
                          ${highlightHelp ? 'animate-pulse shadow-glow-glass-primary animate-dim-to-question' : ''}
                `}
            >
                <CircleQuestionMark
                    className="w-5 h-5 text-text-main"
                    strokeWidth={2.5}
                />
            </button>
        </main>
    );
}
