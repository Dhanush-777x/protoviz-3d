/**
 * \file ProtovizIntro.tsx
 * \brief Introductory modal component guiding users through Protoviz 3D features.
 */

'use client';

import { useState, useEffect } from 'react';
import { Boxes, Cpu, BookOpen } from 'lucide-react';
import Image from 'next/image';

interface ProtovizIntroProps {
    forceOpen?: boolean;
    onClose?: () => void;
}

export default function ProtovizIntro({
    forceOpen = false,
    onClose,
}: ProtovizIntroProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (forceOpen) {
            setCurrentStep(0);
            setIsVisible(true);
            return;
        }

        if (typeof window === 'undefined') return;
        const hasSeenIntro = localStorage.getItem('protoviz-intro-seen');
        if (!hasSeenIntro) setIsVisible(true);
    }, [forceOpen]);

    const steps = [
        {
            title: 'Protoviz 3D',
            description:
                'Protoviz 3D is an interactive visualization platform for learning communication protocols. It shows how data moves on real wires using waveforms, timing, and animations.',
            icon: Boxes,
        },
        {
            title: 'Protocols Available',
            description:
                'Currently, Protoviz supports UART and I²C. Each protocol is visualized step-by-step, showing signals, timing, acknowledgments, and errors as they happen.',
            icon: Cpu,
        },
        {
            title: 'Learn the Basics',
            description:
                'Each protocol includes a guided tutorial to help you understand how it works. Use the ? icon on the bottom right corner to open it.',
            icon: BookOpen,
        },
    ];

    const handleComplete = () => {
        localStorage.setItem('protoviz-intro-seen', 'true');
        setIsVisible(false);
        onClose?.();
    };

    if (!isVisible) return null;

    const step = steps[currentStep];
    const Icon = step.icon;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
            style={{
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
        >
            <div className="relative w-full max-w-[600px] mx-4 p-8 rounded-2xl glass-panel-elevated">
                <div className="absolute inset-0 rounded-2xl pointer-events-none tutorial-banner-overlay-gradient" />

                <div className="relative">
                    <div className="mb-6 flex justify-center">
                        {currentStep === 0 ? (
                            <div className="logo-glow">
                                <Image
                                    src="/Protoviz-3d_logo.png"
                                    alt="Protoviz 3D Logo"
                                    width={120}
                                    height={120}
                                    className="animate-pulse"
                                    priority
                                />
                            </div>
                        ) : (
                            <Icon
                                size={64}
                                strokeWidth={2}
                                className="mx-auto text-primary-glow icon-glow"
                            />
                        )}
                    </div>

                    <h2 className="text-2xl font-bold mb-4 text-center text-glow-secondary">
                        {step.title}
                    </h2>

                    <p className="text-base leading-relaxed mb-8 text-center text-muted">
                        {step.description}
                    </p>

                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, index) => {
                            const isActive = index === currentStep;
                            return (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    aria-label={`Go to step ${index + 1}`}
                                    className={
                                        isActive
                                            ? 'step-dot step-dot-active'
                                            : 'step-dot'
                                    }
                                />
                            );
                        })}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleComplete}
                            className="btn-secondary flex-1 hover:brightness-110"
                        >
                            Skip
                        </button>

                        <button
                            onClick={() =>
                                currentStep < steps.length - 1
                                    ? setCurrentStep((s) => s + 1)
                                    : handleComplete()
                            }
                            className="btn-primary flex-1 hover:shadow-glow-glass-primary transition-all"
                        >
                            {currentStep < steps.length - 1
                                ? 'Next'
                                : 'Start Exploring'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
