/**
 * \file UARTBasics.tsx
 * \brief Introductory walkthrough explaining UART fundamentals and usage.
 */

'use client';

import { useState, useEffect } from 'react';
import { Plug, Radio, Zap, Gamepad2 } from 'lucide-react';

interface UARTBasicsProps {
    forceOpen?: boolean;
    onClose?: () => void;
}

/**
 * \brief Displays a guided modal walkthrough introducing UART basics.
 */
export default function UARTBasics({
    forceOpen = false,
    onClose,
}: UARTBasicsProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (forceOpen) {
            setCurrentStep(0);
            setIsVisible(true);
            return;
        }
        if (typeof window === 'undefined') return;

        const seen = localStorage.getItem('uart-basics-seen') === 'true';
        if (!seen) {
            setCurrentStep(0);
            setIsVisible(true);
        }
    }, [forceOpen]);

    const steps = [
        {
            title: 'UART',
            description:
                'UART (Universal Asynchronous Receiver-Transmitter) is a simple serial communication protocol that transfers data one bit at a time.',
            icon: Plug,
        },

        {
            title: 'How it Works',
            description:
                'Data flows from transmitter to receiver. Each byte is wrapped with a START bit (0), 8 data bits, and a STOP bit (1). The line stays HIGH when idle.',
            icon: Radio,
        },
        {
            title: 'Baud Rate Matters',
            description:
                'Both devices must use the same baud rate (bits per second). Common rates: 9600, 19200, 38400, 115200. Higher = faster transmission!',
            icon: Zap,
        },
        {
            title: 'Try It Yourself!',
            description:
                'Enter text, select a baud rate, and hit transmit. Watch the waveform scroll and particles flow. Try shorting the wires to see errors!',
            icon: Gamepad2,
        },
    ];

    /**
     * \brief Advances the tutorial to the next step or completes it.
     */
    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep((s) => s + 1);
        } else {
            handleComplete();
        }
    };

    /**
     * \brief Skips the UART basics tutorial and completes it immediately.
     */
    const handleSkip = () => {
        handleComplete();
    };

    /**
     * \brief Finalizes the UART basics tutorial and stores completion state.
     */
    const handleComplete = () => {
        localStorage.setItem('uart-basics-seen', 'true');
        setIsVisible(false);
        onClose?.();
    };

    if (!isVisible) return null;

    const step = steps[currentStep];

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
            style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }}
        >
            <div className="relative w-full max-w-[600px] mx-4 p-8 rounded-2xl glass-panel-elevated">
                <div className="absolute inset-0 rounded-2xl pointer-events-none tutorial-banner-overlay-gradient" />

                <div className="relative">
                    <div className="text-6xl mb-4 text-center">
                        {(() => {
                            const Icon = step.icon;
                            return (
                                <Icon
                                    size={64}
                                    strokeWidth={2}
                                    className="mx-auto text-primary-glow icon-glow"
                                />
                            );
                        })()}
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
                                    className={`h-2 rounded-full transition-all ${isActive ? 'w-8 bg-glass-gradient-primary shadow-glow-glass-primary' : 'w-2 bg-primary/30 hover:bg-primary/60'}`}
                                />
                            );
                        })}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSkip}
                            className="btn-secondary flex-1"
                        >
                            Skip
                        </button>

                        <button
                            onClick={handleNext}
                            className="btn-primary flex-1"
                        >
                            {currentStep < steps.length - 1
                                ? 'Next'
                                : 'Get Started!'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
