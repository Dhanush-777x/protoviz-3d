/**
 * \file FloatingNavBar.tsx
 * \brief Floating navigation bar component providing quick actions and overlays.
 */

'use client';

import { useState } from 'react';
import { Menu, X, Github, Info, Brain } from 'lucide-react';
import { useUARTStore } from './protocol-visualizer/protocols/uart/useUARTLogic';
import { useI2CStore } from './protocol-visualizer/protocols/i2c/useI2CLogic';
import DeepDive from '@/components/protocol-visualizer/DeepDive';
import { ProtocolType } from '@/types/protocols';

const GITHUB_URL = 'https://github.com/dhanush777x/protoviz-3d.git';

interface FloatingNavBarProps {
    protocol: ProtocolType;
}

/**
 * \brief Renders a floating navigation bar with project info, deep dive, and GitHub access.
 */
export default function FloatingNavBar({ protocol }: FloatingNavBarProps) {
    const [open, setOpen] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showDeepDive, setShowDeepDive] = useState(false);

    const uartTutorialStep = useUARTStore((s) => s.tutorialStep);
    const i2cTutorialStep = useI2CStore((s) => s.tutorialStep);

    const tutorialStepByProtocol: Record<ProtocolType, string> = {
        uart: uartTutorialStep,
        i2c: i2cTutorialStep,
    };

    const tutorialStep = tutorialStepByProtocol[protocol];

    return (
        <>
            <div className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-[1500] flex-col gap-4">
                <button
                    onClick={() => setShowAbout(true)}
                    className="p-3 rounded-xl bg-bg-panel border border-primary-border hover:scale-105 transition-all backdrop-blur-md shadow-glow-glass-primary hover:shadow-glow-glass-primary-hover"
                >
                    <Info className="w-5 h-5 text-text-main" />
                </button>
                <div className="relative z-[1300]">
                    <button
                        onClick={() => setShowDeepDive(true)}
                        className={`p-3 rounded-xl bg-bg-panel border border-primary-border hover:scale-105 transition-all backdrop-blur-md shadow-glow-glass-primary hover:shadow-glow-glass-primary-hover
                                  ${tutorialStep === 'deep-dive' ? 'animate-tutorial-pulse' : ''}`}
                    >
                        <Brain className="w-5 h-5 text-text-main" />
                    </button>
                </div>

                <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-bg-panel border border-primary-border hover:scale-105 transition-all backdrop-blur-md shadow-glow-glass-primary hover:shadow-glow-glass-primary-hover"
                >
                    <Github className="w-5 h-5 text-text-main" />
                </a>
            </div>

            <button
                onClick={() => setOpen(true)}
                className="lg:hidden fixed top-4 right-4 z-[1500] p-3 rounded-xl bg-bg-panel border border-primary-border"
            >
                <Menu className="w-5 h-5 text-text-main" />
            </button>

            {open && (
                <div
                    className="lg:hidden fixed inset-0 z-[1600] bg-black/50 backdrop-blur-lg"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="absolute top-0 right-0 w-64 h-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 right-0 w-64 h-full bg-bg-panel border-l border-primary-border p-4">
                            <div className="flex justify-between items-center mb-4">
                                <div className="absolute inset-0 rounded-2xl pointer-events-none tutorial-banner-overlay-gradient" />
                                <h3 className="font-bold text-text-main">
                                    Menu
                                </h3>
                                <button onClick={() => setOpen(false)}>
                                    <X className="w-5 h-5 text-text-main" />
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setShowAbout(true);
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-primary-dim backdrop-blur-md bg-white/5"
                            >
                                <Info className="w-4 h-4" />
                                About Project
                            </button>

                            <button
                                onClick={() => {
                                    setShowDeepDive(true);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-primary-dim mt-2
                                          ${tutorialStep === 'deep-dive' ? 'animate-tutorial-pulse' : ''}`}
                            >
                                <Brain className="w-4 h-4 text-text-main" />
                                Deep Dive
                            </button>

                            <a
                                href={GITHUB_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-primary-dim mt-2"
                            >
                                <Github className="w-4 h-4" />
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {showAbout && (
                <div className="fixed inset-0 z-[1700] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div
                        className="w-[92%] max-w-lg lg:max-w-xl rounded-2xl glass-panel-elevated p-6 animate-modal-in"
                        style={{
                            backdropFilter: 'blur(20px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        }}
                    >
                        <div className="tutorial-banner-overlay-gradient" />
                        <h3 className="text-lg font-bold text-text-main mb-2">
                            About This Project
                        </h3>

                        <p className="text-sm text-text-muted leading-relaxed mb-4">
                            Protoviz 3D is an interactive learning tool for
                            students, embedded engineers, and electronics
                            enthusiasts. It visually explains how communication
                            protocols work at the bit level, including baud
                            rates, timing, framing, and real-world error
                            behavior.
                        </p>

                        <p className="text-sm text-text-muted leading-relaxed mb-4">
                            The goal is to make communication protocols
                            intuitive and observable, helping you understand
                            what actually happens on the wire beyond theory and
                            textbooks.
                        </p>

                        <p className="text-sm text-text-muted leading-relaxed mb-4">
                            Your feedback is highly valuable. If you have ideas,
                            suggestions, or find issues, feel free to share them
                            on the project's GitHub Discussions or Issues page.
                        </p>

                        <p className="text-sm text-text-muted leading-relaxed mb-4">
                            If you'd like to support future development such as
                            new protocols, deeper simulations, or enhanced
                            tutorials. Any contribution is greatly appreciated.
                        </p>

                        <p className="text-sm text-text-muted leading-relaxed mb-4">
                            I hope this tool helps you learn and experiment with
                            confidence. Enjoy exploring!
                        </p>

                        <p className="text-xs text-text font-bold mt-3 italic mt-8">
                            ~ Dhanush S M
                        </p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => setShowAbout(false)}
                                className="px-4 py-2 rounded-lg bg-glass-gradient-primary text-text-dark font-semibold hover:shadow-glow-glass-primary transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DeepDive
                protocol={protocol}
                isOpen={showDeepDive}
                onClose={() => setShowDeepDive(false)}
            />
        </>
    );
}
