/**
 * \file UARTTutorial.tsx
 * \brief Introductory tutorial overlay for UART communication.
 *
 * Presents a short, step-by-step walkthrough explaining
 * UART fundamentals before users interact with the simulation.
 */

'use client';

import { useState, useEffect } from 'react';
import { Plug, Radio, Zap, Gamepad2, PlugZap } from 'lucide-react';

/**
 * \brief Properties for the UART tutorial component.
 *
 * \param forceOpen Forces the tutorial to open regardless of prior completion.
 * \param onClose Optional callback invoked when the tutorial is dismissed.
 */
interface UARTTutorialProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

/**
 * \brief UART onboarding tutorial.
 *
 * Responsibilities:
 * - Introduces UART concepts in simple steps
 * - Persists completion state using localStorage
 * - Allows skipping or replaying the tutorial
 *
 * \param forceOpen Force tutorial visibility.
 * \param onClose Callback invoked on completion or skip.
 * \return Tutorial overlay or null.
 */
export default function UARTTutorial({
  forceOpen = false,
  onClose,
}: UARTTutorialProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  /**
   * \brief Controls tutorial visibility.
   *
   * Automatically opens on first visit and
   * respects manual force-open requests.
   */
  useEffect(() => {
    if (forceOpen) {
      setIsVisible(true);
      return;
    }

    const hasSeenTutorial = localStorage.getItem('uart-tutorial-seen');
    if (!hasSeenTutorial) {
      setIsVisible(true);
    }
  }, [forceOpen]);

  /**
   * \brief Tutorial step definitions.
   *
   * Each step provides a title, description,
   * and icon for progressive learning.
   */
  const steps = [
    {
      title: 'Welcome to Protoviz 3D!',
      description:
        'An interactive, web-based 3D communication protocol visualizer designed to help students, embedded engineers, and electronics enthusiasts understand what actually happens on the wire.',
      icon: PlugZap,
    },
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
   * \brief Advances to the next tutorial step.
   *
   * Completes the tutorial when the last step is reached.
   */
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  /**
   * \brief Skips the tutorial entirely.
   */
  const handleSkip = () => {
    handleComplete();
  };

  /**
   * \brief Marks the tutorial as completed.
   *
   * Persists completion state and closes the overlay.
   */
  const handleComplete = () => {
    localStorage.setItem('uart-tutorial-seen', 'true');
    setIsVisible(false);
    onClose?.();
  };

  /**
   * \brief Tutorial modal overlay.
   *
   * Blocks interaction with the underlying application
   * while guiding the user through UART basics.
   */
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
      {/* Tutorial Card */}
      <div
        className="relative w-full max-w-[600px] mx-4 p-8 rounded-2xl"
        style={{
          padding: '16px 20px',
          background: 'rgba(18, 20, 30, 0.75)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(166, 174, 204, 0.2)',
          borderRadius: '12px',
          boxShadow: `
            0 -8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05)
          `,
        }}
      >
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(147, 112, 173, 0.1) 0%, transparent 50%, rgba(166, 174, 204, 0.05) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative">
          {/* Icon */}
          <div
            className="text-6xl mb-4 text-center"
            style={{
              textShadow: '0 0 20px rgba(147, 112, 173, 0.6)',
            }}
          >
            {(() => {
              const Icon = step.icon;
              return (
                <Icon
                  size={64}
                  strokeWidth={2}
                  className="mx-auto text-primary"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(147, 112, 173, 0.6))',
                  }}
                />
              );
            })()}
          </div>

          {/* Title */}
          <h2
            className="text-2xl font-bold mb-4 text-center"
            style={{
              color: '#e8ebf2',
              textShadow: '0 0 12px rgba(166, 174, 204, 0.6)',
            }}
          >
            {step.title}
          </h2>

          {/* Description */}
          <p
            className="text-base leading-relaxed mb-8 text-center"
            style={{
              color: 'rgba(232, 235, 242, 0.85)',
            }}
          >
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => {
              const isActive = index === currentStep;

              return (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  aria-label={`Go to step ${index + 1}`}
                  className="rounded-full transition-all focus:outline-none"
                  style={{
                    width: isActive ? '32px' : '8px',
                    height: '8px',
                    cursor: 'pointer',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(147, 112, 173, 0.9), rgba(166, 174, 204, 0.9))'
                      : 'rgba(166, 174, 204, 0.3)',
                    boxShadow: isActive
                      ? '0 0 12px rgba(147, 112, 173, 0.6)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background =
                        'rgba(166, 174, 204, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background =
                        'rgba(166, 174, 204, 0.3)';
                    }
                  }}
                />
              );
            })}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: 'rgba(42, 47, 69, 0.8)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1.5px solid rgba(58, 64, 96, 0.8)',
                color: 'rgba(232, 235, 242, 0.8)',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(50, 58, 82, 0.9)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(42, 47, 69, 0.8)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Skip
            </button>

            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all bg-glass-gradient-primary"
              style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#0b0d12',
                boxShadow: '0 4px 12px rgba(147, 112, 173, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px rgba(147, 112, 173, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(147, 112, 173, 0.3)';
              }}
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Get Started!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
