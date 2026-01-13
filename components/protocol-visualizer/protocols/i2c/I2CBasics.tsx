/**
 * \file I2CBasics.tsx
 * \brief Introductory modal explaining I²C fundamentals through step-by-step UI.
 */

'use client';

import { useState, useEffect } from 'react';
import { Network, Zap, Radio, Send, Gamepad2 } from 'lucide-react';

interface I2CBasicsProps {
    forceOpen?: boolean;
    onClose?: () => void;
}

/**
 * \brief Displays a step-by-step introductory overlay explaining I²C basics.
 */
export default function I2CBasics({
    forceOpen = false,
    onClose,
}: I2CBasicsProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (forceOpen) {
            setIsVisible(true);
            return;
        }
    }, [forceOpen]);

    const steps = [
        {
            title: 'I²C',
            description:
                'I²C (Inter-Integrated Circuit) is a multi-master, multi-slave serial communication protocol that allows multiple devices to communicate on the same bus using only two wires.',
            icon: Network,
        },
        {
            title: 'Two-Wire Protocol',
            description:
                'I²C uses just two lines: SDA (Serial Data) for bidirectional data transfer and SCL (Serial Clock) for synchronization. Both lines require pull-up resistors to function!',
            icon: Zap,
        },
        {
            title: 'How It Works',
            description:
                'The master initiates communication by sending a START condition, then transmits a 7-bit slave address with a R/W bit. The addressed slave responds with an ACK, then data bytes are transferred with ACK after each byte.',
            icon: Radio,
        },
        {
            title: 'Pull-up Resistors Are Critical',
            description:
                'I²C devices use open-drain outputs - they can only pull the lines LOW, never HIGH. Pull-up resistors (typically 4.7kΩ) pull the lines HIGH when not driven. Without them, I²C cannot work!',
            icon: Send,
        },
        {
            title: 'Try It Yourself!',
            description:
                'Enable pull-ups, enter data bytes in hex format, select a slave address, and transmit. Watch the START/STOP conditions, address transmission, ACK bits, and data flow on the waveform!',
            icon: Gamepad2,
        },
    ];

    /**
     * \brief Advances to the next tutorial step or completes the tutorial.
     */
    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    /**
     * \brief Skips the I²C basics tutorial and closes the overlay.
     */
    const handleSkip = () => {
        handleComplete();
    };

    /**
     * \brief Marks the tutorial as seen and closes the modal.
     */
    const handleComplete = () => {
        localStorage.setItem('i2c-basics-seen', 'true');
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
            {/* I2C Basics Card */}
            <div className="relative w-full max-w-[600px] mx-4 p-8 rounded-2xl glass-panel-elevated">
                {/* Gradient overlay */}
                <div className="absolute inset-0 rounded-2xl pointer-events-none tutorial-banner-overlay-gradient" />

                {/* Content */}
                <div className="relative">
                    {/* Icon */}
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

                    {/* Buttons */}
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
