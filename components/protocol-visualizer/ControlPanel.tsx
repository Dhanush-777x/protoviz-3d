/**
 * \file ControlPanel.tsx
 * \brief UART control panel with interactive tutorial and transmission controls.
 *
 * This file implements the main ControlPanel component and a UART-specific
 * control panel with step-by-step tutorial guidance, TX/RX simulation,
 * baud mismatch corruption modeling, and waveform-driven interaction.
 */

'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ProtocolType } from '@/types/protocols';
import { useUARTStore } from './protocols/uart/useUARTLogic';
import type { TutorialStep } from './protocols/uart/useUARTLogic';
import {
  LucideIcon,
  Play,
  Pause,
  Zap,
  Wrench,
  BookOpen,
  Lightbulb,
  Radio,
  SendHorizontal,
  Pencil,
  Circle,
  Binary,
  SquareDot,
  Activity,
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

/**
 * \interface ControlPanelProps
 * \brief Props for the top-level ControlPanel component.
 *
 * \param protocol Selected protocol type (e.g., UART).
 */
interface ControlPanelProps {
  protocol: ProtocolType;
}

/**
 * \typedef AllowedAction
 * \brief All user actions that can be conditionally enabled by the tutorial.
 */
type AllowedAction = 'data' | 'baud' | 'transmit' | 'pause' | 'wire';

type TutorialContent = {
  title: string;
  description: string;
  highlight?: string;
  icon?: LucideIcon;
  iconColor?: string;
};

/**
 * \brief Top-level protocol control panel selector.
 *
 * Renders the appropriate protocol control panel based on the selected
 * protocol type.
 *
 * \param protocol Selected protocol.
 * \return JSX.Element or null if protocol is unsupported.
 */
export default function ControlPanel({ protocol }: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (protocol === 'uart') {
    return <UARTControlPanel isOpen={isOpen} setIsOpen={setIsOpen} />;
  }

  return null;
}

/**
 * \brief Mapping between tutorial steps and allowed UI actions.
 *
 * Used to disable user interaction outside the current tutorial focus.
 */
const tutorialAllowedActions: Record<TutorialStep, AllowedAction[]> = {
  disabled: ['data', 'baud', 'transmit', 'pause', 'wire'],

  'set-text': ['data'],
  'set-baud': ['baud'],
  'click-transmit': ['transmit'],

  'start-bit': [],
  'data-bits': [],
  'stop-bit': [],
  'idle-state': [],
  'deep-dive': [],
};

const STATUS_ICON_MAP = {
  idle: Info,
  transmitting: Radio,
  success: CheckCircle,
  error: AlertTriangle,
  paused: Pause,
  resumed: Play,
} as const;

/**
 * \brief UART-specific control panel with tutorial and simulation.
 *
 * Handles UART data entry, baud rate configuration, TX/RX simulation,
 * tutorial flow control, waveform pausing, and visual feedback.
 *
 * \param isOpen Panel open state.
 * \param setIsOpen Panel visibility setter.
 * \return JSX.Element
 */
function UARTControlPanel({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const {
    data,
    setData,
    baudRate,
    setBaudRate,
    isTransmitting,
    wireShorted,
    status,
    currentBit,
    totalBits,
    startOrToggleTransmission,
    toggleWireShort,
    togglePause,
    isPaused,
    tutorialHold,
  } = useUARTStore();

  const [rxBaudRate, setRxBaudRate] = useState(baudRate);
  const [rxLatched, setRxLatched] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [backwardDebt, setBackwardDebt] = useState(0);

  /**
   * \brief Generates corrupted RX characters.
   *
   * Used to simulate baud mismatch corruption.
   *
   * \param len Number of characters to generate.
   * \return Corrupted string.
   */
  function generateGarbage(len: number) {
    const chars = '�';
    return Array.from(
      { length: len },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  /**
   * \brief Computes the received character based on baud-rate mismatch.
   *
   * Models UART timing drift where RX sampling may land on wrong bit edges,
   * resulting in corrupted characters.
   *
   * \param txChar Transmitted character.
   * \param txBaud Transmitter baud rate.
   * \param rxBaud Receiver baud rate.
   * \return Received character (valid or corrupted).
   */
  const computeRXChar = useCallback(
    (txChar: string, txBaud: number, rxBaud: number) => {
      if (!txChar) return '';

      const mismatch = Math.abs(txBaud - rxBaud) / ((txBaud + rxBaud) / 2);

      if (mismatch < 0.01) {
        return txChar;
      }

      let errorProbability = 0;

      if (mismatch < 0.02) {
        errorProbability = 0.1;
      } else if (mismatch < 0.03) {
        errorProbability = 0.3;
      } else if (mismatch < 0.05) {
        errorProbability = 0.6;
      } else {
        errorProbability = 0.9;
      }

      return Math.random() < errorProbability ? generateGarbage(1) : txChar;
    },
    []
  );

  function isActionAllowed(action: AllowedAction) {
    if (!tutorialEnabled) return true;
    return tutorialAllowedActions[tutorialStep]?.includes(action);
  }

  const { tutorialStep, setTutorialStep, tutorialEnabled, setTutorialEnabled } =
    useUARTStore();

  const [tutorialTextSet, setTutorialTextSet] = useState(false);
  const [tutorialBaudSet, setTutorialBaudSet] = useState(false);

  const tutorialContent: Record<TutorialStep, TutorialContent> = {
    disabled: { title: '', description: '' },

    'set-text': {
      icon: Pencil,
      iconColor: 'white',
      title: 'Step 1: Enter Your Text',
      description:
        'Type some text in the "Data" input field. This is the message that will be transmitted via UART.',
      highlight: 'data-input',
    },

    'set-baud': {
      icon: Zap,
      iconColor: 'yellow',
      title: 'Step 2: Select Baud Rate',
      description:
        'Choose a baud rate from the dropdown. The baud rate determines how fast data is transmitted.',
      highlight: 'baud-select',
    },

    'click-transmit': {
      icon: SendHorizontal,
      iconColor: 'white',
      title: 'Step 3: Start Transmission',
      description: 'Click the Transmit button to begin sending your data.',
      highlight: 'transmit-button',
    },

    'start-bit': {
      icon: Circle,
      iconColor: 'green',
      title: 'Start Bit',
      description:
        'The start bit is always LOW (0) and signals the beginning of a UART frame.',
      highlight: 'waveform',
    },

    'data-bits': {
      icon: Circle,
      iconColor: 'yellow',
      title: 'Data Bits',
      description:
        'The 8 data bits carry the actual character. UART sends LSB first.',
      highlight: 'waveform',
    },

    'stop-bit': {
      icon: Circle,
      iconColor: 'red',
      title: 'Stop Bit',
      description:
        'The stop bit is always HIGH (1) and marks the end of a frame.',
      highlight: 'waveform',
    },

    'idle-state': {
      icon: Activity,
      iconColor: 'white',
      title: 'Idle State',
      description:
        'When idle, the UART line stays HIGH until a new start bit begins.',
      highlight: 'waveform',
    },

    'deep-dive': {
      icon: Brain,
      iconColor: 'white',
      title: 'Want to Go Deeper?',
      description:
        'Real systems fail due to timing drift, clock mismatch, and sampling errors. Tap the 🧠 icon in the Nav Panel to explore deeper explanations',
      highlight: 'brain-icon',
    },
  };

  const stepOrder: TutorialStep[] = [
    'set-text',
    'set-baud',
    'click-transmit',
    'start-bit',
    'data-bits',
    'stop-bit',
    'idle-state',
    'deep-dive',
  ];

  const bitsPerChar = 10;

  const txCharsVisible = Math.min(
    Math.ceil(currentBit / bitsPerChar),
    data.length
  );

  const txDisplay = txCharsVisible > 0 ? data.slice(0, txCharsVisible) : '';

  /**
   * \brief RX character latch logic.
   *
   * Appends a received character once a full UART frame
   * (1 start + 8 data + 1 stop) has been transmitted.
   */
  useEffect(() => {
    if (!isTransmitting && currentBit < totalBits) return;

    // UART: 1 start + 8 data + 1 stop = 10 bits
    const completedChars = Math.floor(currentBit / bitsPerChar);

    if (completedChars <= rxLatched.length) return;

    const txChar = data[completedChars - 1];

    let rxChar = '';
    if (tutorialEnabled) {
      rxChar = txChar;
    }
    if (wireShorted) {
      rxChar = '#';
    } else {
      rxChar = computeRXChar(txChar, baudRate, rxBaudRate);
    }

    setRxLatched((prev) => prev + rxChar);
  }, [
    currentBit,
    baudRate,
    rxBaudRate,
    wireShorted,
    isTransmitting,
    data,
    rxLatched.length,
  ]);

  useEffect(() => {
    // New transmission just started
    if (isTransmitting && currentBit === 0) {
      setRxLatched('');
    }
  }, [isTransmitting, currentBit]);

  useEffect(() => {
    if (status.type !== 'idle') return;

    const timer = setTimeout(() => {
      setRxLatched('');
      // setData('');
    }, 5000);

    return () => clearTimeout(timer);
  }, [status.type]);

  useEffect(() => {
    if (!tutorialEnabled) return;
    setRxBaudRate(baudRate);
  }, [tutorialEnabled, baudRate]);

  const rxDisplay = rxLatched;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 640px)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Handle tutorial progression
  useEffect(() => {
    if (!tutorialEnabled) return;

    // -----------------------------
    // STEP 1: Text entered
    // -----------------------------
    if (
      tutorialStep === 'set-text' &&
      data.trim().length > 0 &&
      !tutorialTextSet
    ) {
      setTutorialTextSet(true);
    }

    // -----------------------------
    // STEP 2: Baud selected
    // -----------------------------
    if (tutorialStep === 'set-baud' && !tutorialBaudSet) {
      setTutorialBaudSet(true);
    }

    // -----------------------------
    // STEP 3 → START BIT
    // -----------------------------
    if (
      tutorialStep === 'click-transmit' &&
      isTransmitting &&
      currentBit === 1
    ) {
      setTutorialStep('start-bit');
    }

    // -----------------------------
    // DATA BITS
    // -----------------------------
    if (tutorialStep === 'data-bits' && isTransmitting && currentBit === 9) {
      // purely informational step
      // no hold logic here
    }

    // -----------------------------
    // STOP BIT
    // -----------------------------
    if (tutorialStep === 'stop-bit' && isTransmitting && currentBit === 10) {
      // purely informational step
      // no hold logic here
    }

    // -----------------------------
    // IDLE STATE
    // -----------------------------
    if (tutorialStep === 'idle-state' && !isTransmitting) {
      // allow UART to run freely again
      useUARTStore.getState().setTutorialHold(false);
    }
  }, [
    tutorialStep,
    data,
    isTransmitting,
    tutorialEnabled,
    tutorialTextSet,
    tutorialBaudSet,
    currentBit,
  ]);

  const canProceedNext = useMemo(() => {
    if (!tutorialEnabled) return true;

    if (tutorialStep === 'set-text') {
      return data.trim().length > 0;
    }

    if (tutorialStep == 'click-transmit') {
      return isTransmitting;
    }

    return true;
  }, [tutorialEnabled, tutorialStep, data]);

  /**
   * \brief Enables or disables the interactive UART tutorial.
   *
   * Resets tutorial state and safely pauses or resumes transmission
   * when entering or exiting tutorial mode.
   */
  const handleTutorialToggle = () => {
    if (!tutorialEnabled) {
      // ENABLE TUTORIAL (clean slate)
      setTutorialEnabled(true);
      setTutorialStep('set-text');
      setTutorialTextSet(false);
      setTutorialBaudSet(false);
      setBackwardDebt(0);

      useUARTStore.getState().setTutorialHold(false);

      // Reset transmission if active
      const store = useUARTStore.getState();
      if (store.isTransmitting) {
        store.resetTransmission();
      }
    } else {
      // DISABLE TUTORIAL (cleanup)
      setTutorialEnabled(false);
      setTutorialStep('disabled');
      setTutorialTextSet(false);
      setTutorialBaudSet(false);
      setBackwardDebt(0);

      // Clear any tutorial-induced freeze
      useUARTStore.getState().setTutorialHold(false);

      // Resume normal UART only if it was paused normally
      if (isPaused && isTransmitting) {
        togglePause();
      }
    }
  };

  /**
   * \brief Advances the tutorial to the next step.
   *
   * Handles special cases where waveform execution must resume
   * and pause automatically for explanation.
   */

  const handleTutorialNext = () => {
    const currentIndex = stepOrder.indexOf(tutorialStep);

    if (!canProceedNext) return;

    useUARTStore.getState().setTutorialHold(false);

    const nextStep = stepOrder[currentIndex + 1];

    // Consume backward navigation debt
    if (backwardDebt > 0) {
      setBackwardDebt((d) => d - 1);

      // Navigation only — NO UART side effects
      if (currentIndex < stepOrder.length - 1) {
        setTutorialStep(nextStep);
      }
      return;
    }

    // Only here UART is allowed to resume
    if (tutorialStep === 'start-bit') {
      if (isPaused) togglePause();
    }

    if (tutorialStep === 'data-bits') {
      if (isPaused) togglePause();
    }

    if (tutorialStep === 'stop-bit') {
      if (isPaused) togglePause();
    }

    if (currentIndex < stepOrder.length - 1) {
      setTutorialStep(nextStep);
    } else {
      // Tutorial complete
      setTutorialEnabled(false);
      setTutorialStep('disabled');

      if (isPaused && isTransmitting) {
        togglePause();
      }
    }
  };

  /**
   * \brief Moves the tutorial to the previous step.
   *
   * Ensures waveform is paused when navigating back
   * to bit-level explanation steps.
   */
  const handleTutorialPrev = () => {
    const currentIndex = stepOrder.indexOf(tutorialStep);

    setBackwardDebt((d) => d + 1);

    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      setTutorialStep(prevStep);

      // Ensure paused for waveform steps
      if (
        (prevStep === 'start-bit' ||
          prevStep === 'data-bits' ||
          prevStep === 'stop-bit') &&
        !isPaused &&
        isTransmitting
      ) {
        togglePause();
      }
    }
  };

  const currentTutorial = tutorialContent[tutorialStep];
  const Icon = currentTutorial.icon;
  const iconColor = currentTutorial.iconColor ?? '#e8ebf2';
  const isFirstStep = tutorialStep === 'set-text';
  const isLastStep = tutorialStep === 'deep-dive';
  const hasValidData = data.trim().length > 0;
  const StatusIcon = STATUS_ICON_MAP[status.type];
  const rxMatchesSoFar =
    rxDisplay.length === 0 ||
    txDisplay.slice(0, rxDisplay.length) === rxDisplay;

  return (
    <>
      {/* Tutorial Overlay */}
      {tutorialEnabled && tutorialStep !== 'disabled' && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[2000] w-[92%] max-w-[500px] top-2 sm:top-4 md:top-4 lg:top-4 xl:top-4"
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

          {/* Tutorial Header */}
          <div className="mb-3">
            <h3
              className="text-md flex justify-start items-center gap-2 font-bold mb-1.5"
              style={{
                color: '#e8ebf2',
                textShadow: '0 0 12px rgba(147, 112, 173, 0.6)',
              }}
            >
              {Icon && <Icon size={18} color={iconColor} strokeWidth="2.5" />}
              {currentTutorial.title}
            </h3>
            <p
              className="text-sm leading-snug"
              style={{ color: 'rgba(232, 235, 242, 0.9)' }}
            >
              {currentTutorial.description}
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2 justify-between mt-3">
            <button
              onClick={handleTutorialPrev}
              disabled={isFirstStep}
              className="px-4 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: isFirstStep
                  ? 'rgba(51, 51, 51, 0.5)'
                  : 'rgba(42, 47, 69, 0.9)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#e8ebf2',
                border: '1.5px solid rgba(166, 174, 204, 0.4)',
              }}
            >
              <span className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                Previous
              </span>
            </button>

            <div
              className="text-xs self-center"
              style={{ color: 'rgba(232, 235, 242, 0.6)' }}
            >
              Step{' '}
              {[
                'set-text',
                'set-baud',
                'click-transmit',
                'start-bit',
                'data-bits',
                'stop-bit',
                'idle-state',
                'deep-dive',
              ].indexOf(tutorialStep) + 1}{' '}
              of 8
            </div>

            <button
              onClick={handleTutorialNext}
              disabled={!canProceedNext}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-30 ${!canProceedNext ? 'bg-[rgba(51,51,51,0.5)] cursor-not-allowed' : 'bg-glass-gradient-primary hover:brightness-110'}`}
              style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: !canProceedNext ? '#e8ebf2' : '#0b0d12',
                border: '1.5px solid rgba(166, 174, 204, 0.4)',
                boxShadow: !canProceedNext
                  ? 'none'
                  : '0 4px 12px rgba(147, 112, 173, 0.4)',
              }}
            >
              {isLastStep ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                  Finish
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Next
                  <ArrowRight
                    className="w-4 h-4 animate-pulse"
                    strokeWidth={2.5}
                  />
                </span>
              )}
            </button>
          </div>
        </div>
      )}
      <div
        className="fixed left-1/2 bottom-0 w-full max-w-[1100px] transition-transform duration-300 ease-in-out z-[1000]"
        style={{
          transform: isOpen ? 'translate(-50%, 0)' : 'translate(-50%, 100%)',
        }}
      >
        {/* Toggle Handle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -top-[26px] left-1/2 -translate-x-1/2 w-14 h-[26px] flex items-center justify-center text-lg font-bold cursor-pointer select-none rounded-t-xl border-none shadow-[0_-4px_12px_rgba(0,0,0,0.3)] transition-transform hover:scale-105"
          style={{
            background: 'rgba(166, 174, 204, 0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#0b0d12',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>

        {/* Glass Panel */}
        <div
          className="relative overflow-hidden rounded-t-2xl p-5"
          style={{
            background: 'rgba(18, 20, 30, 0.75)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(166, 174, 204, 0.2)',
            borderBottom: 'none',
            boxShadow: `
            0 -8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05)
          `,
          }}
        >
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(166, 174, 204, 0.08) 0%, transparent 50%, rgba(147, 112, 173, 0.05) 100%)',
            }}
          />

          <div className="flex flex-wrap gap-3.5 items-end justify-center">
            {/* Title with Tutorial Toggle */}
            <div className="w-full flex items-center justify-center gap-4 mb-1.5">
              <h2
                className="text-center text-xl font-bold"
                style={{
                  color: '#e8ebf2',
                  textShadow: '0 0 12px rgba(166, 174, 204, 0.6)',
                }}
              >
                Universal Asynchronous Receiver Transmitter
              </h2>

              {/* Tutorial Toggle Button */}
              <button
                onClick={handleTutorialToggle}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: tutorialEnabled
                    ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.9), rgba(255, 152, 0, 0.9))'
                    : 'rgba(42, 47, 69, 0.8)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: tutorialEnabled ? '#0b0d12' : '#e8ebf2',
                  border: tutorialEnabled
                    ? 'none'
                    : '1.5px solid rgba(166, 174, 204, 0.4)',
                  boxShadow: tutorialEnabled
                    ? '0 0 12px rgba(255, 193, 7, 0.5)'
                    : 'none',
                }}
              >
                {tutorialEnabled ? (
                  <span className="flex items-center gap-2">
                    <BookOpen size={18} fill="currentColor" stroke="none" />
                    Tutorial ON
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lightbulb size={18} fill="yellow" stroke="2.5" />
                    Start Tutorial
                  </span>
                )}
              </button>
            </div>

            <div className="grid grid-cols-[1fr_2fr_2fr] gap-3 w-full mb-3 max-sm:grid-cols-1">
              {/* STATUS */}
              <div
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md"
                style={{
                  background: 'rgba(166,174,204,0.15)',
                  textAlign: 'center',
                  minHeight: '38px',
                  border:
                    status.type === 'error'
                      ? '1px solid rgba(255, 107, 107, 0.4)'
                      : '1px solid rgba(166, 174, 204, 0.25)',
                  color: status.type === 'error' ? '#ff6b6b' : '#e8ebf2',
                }}
              >
                <StatusIcon className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                <span>{status.text}</span>
              </div>

              {/* TX */}
              <div className="flex flex-col">
                <div className="text-[11px] opacity-60 mb-0.5">TX (Sent)</div>
                <div
                  className="px-2 py-1 rounded bg-black/30 font-mono text-xs"
                  style={{ minHeight: '32px' }}
                >
                  {txDisplay || '—'}
                </div>
              </div>

              {/* RX */}
              <div className="flex flex-col">
                <div className="text-[11px] opacity-60 mb-0.5">
                  RX (Received)
                </div>
                <div
                  className="px-2 py-1 rounded bg-black/30 font-mono text-xs"
                  style={{
                    minHeight: '32px',
                    color: rxMatchesSoFar ? '#b4f8c8' : '#ff9b9b',
                  }}
                >
                  {rxDisplay || '—'}
                </div>
              </div>
            </div>

            {/* Data Input */}
            <div
              className="flex flex-col min-w-[160px] flex-1 max-w-[300px]"
              data-highlight={tutorialStep === 'set-text' ? 'data-input' : ''}
              style={{
                position: 'relative',
                borderRadius: '8px',
              }}
            >
              <label className="text-xs mb-1 font-bold text-[rgba(232,235,242,0.8)]">
                Data
              </label>
              <input
                type="text"
                value={data}
                onChange={(e) => setData(e.target.value)}
                maxLength={50}
                placeholder="Enter text..."
                className={`p-2.5 rounded-md text-sm outline-none transition-all"
    ${tutorialStep === 'set-text' ? 'animate-tutorial-pulse' : ''}
    ${!hasValidData ? 'animate-pulse-error' : ''}`}
                disabled={isTransmitting || !isActionAllowed('data')}
                style={{
                  background: 'rgba(24, 29, 45, 0.8)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(147, 112, 173, 0.35)',
                  color: '#e8ebf2',
                  opacity: isTransmitting || !isActionAllowed('data') ? 0.5 : 1,
                  cursor:
                    isTransmitting || !isActionAllowed('data')
                      ? 'not-allowed'
                      : 'text',
                  boxShadow:
                    tutorialStep === 'set-text'
                      ? '0 0 20px rgba(147, 112, 173, 0.8)'
                      : 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
                }}
                onFocus={(e) => {
                  if (isTransmitting || !isActionAllowed('data')) return;
                  e.target.style.borderColor = 'rgba(147, 112, 173, 0.8)';
                  e.target.style.boxShadow =
                    '0 0 0 3px rgba(147, 112, 173, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(147, 112, 173, 0.35)';
                  e.target.style.boxShadow =
                    'inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                }}
              />
            </div>

            {/* Baud Rate */}
            <div
              className="flex flex-col min-w-[160px] flex-1 max-w-[300px]"
              style={{
                position: 'relative',
                borderRadius: '8px',
              }}
            >
              <label className="text-xs mb-1 font-bold text-[rgba(232,235,242,0.8)]">
                TX Baud Rate
              </label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                className={`p-2.5 rounded-md text-sm outline-none transition-all"
  ${tutorialStep === 'set-baud' ? 'animate-tutorial-pulse' : ''}`}
                disabled={isTransmitting || !isActionAllowed('baud')}
                style={{
                  background: 'rgba(24, 29, 45, 0.8)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(147, 112, 173, 0.35)',
                  color: '#e8ebf2',
                  opacity: isTransmitting || !isActionAllowed('baud') ? 0.5 : 1,
                  cursor:
                    isTransmitting || !isActionAllowed('baud')
                      ? 'not-allowed'
                      : 'pointer',
                  boxShadow:
                    tutorialStep === 'set-baud'
                      ? '0 0 20px rgba(147, 112, 173, 0.8)'
                      : 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
                }}
                onFocus={(e) => {
                  if (isTransmitting || !isActionAllowed('baud')) return;
                  e.target.style.borderColor = 'rgba(147, 112, 173, 0.8)';
                  e.target.style.boxShadow =
                    '0 0 0 3px rgba(147, 112, 173, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(147, 112, 173, 0.35)';
                  e.target.style.boxShadow =
                    'inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                }}
              >
                <option value={9600}>9600</option>
                <option value={19200}>19200</option>
                <option value={38400}>38400</option>
                <option value={115200}>115200</option>
              </select>
            </div>

            {/* RX Baud Rate (Custom Input) */}
            <div
              className="flex flex-col min-w-[160px] flex-1 max-w-[300px]"
              style={{
                position: 'relative',
                borderRadius: '8px',
              }}
            >
              <label className="text-xs mb-1 font-bold text-[rgba(232,235,242,0.8)]">
                RX Baud Rate
              </label>

              <input
                type="number"
                value={rxBaudRate}
                onChange={(e) => setRxBaudRate(Number(e.target.value))}
                disabled={isTransmitting || tutorialEnabled}
                min={300}
                step={1}
                placeholder="Enter RX baud..."
                className="p-2.5 rounded-md text-sm outline-none transition-all"
                style={{
                  background: 'rgba(24, 29, 45, 0.8)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(147, 112, 173, 0.35)',
                  color: '#e8ebf2',
                  opacity: isTransmitting || tutorialEnabled ? 0.5 : 1,
                  cursor:
                    isTransmitting || tutorialEnabled ? 'not-allowed' : 'text',
                }}
                onFocus={(e) => {
                  if (isTransmitting || tutorialEnabled) return;
                  e.target.style.borderColor = 'rgba(147, 112, 173, 0.8)';
                  e.target.style.boxShadow =
                    '0 0 0 3px rgba(147, 112, 173, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(147, 112, 173, 0.35)';
                  e.target.style.boxShadow =
                    'inset 0 1px 3px rgba(0, 0, 0, 0.4)';
                }}
              />
            </div>

            {/* Transmit Button */}
            <button
              onClick={() => {
                startOrToggleTransmission();
                if (isMobile) {
                  setIsOpen(false);
                }
              }}
              disabled={
                isTransmitting || wireShorted || !isActionAllowed('transmit')
              }
              className={`px-4 py-3 rounded-lg font-bold text-sm min-w-[160px] border-none transition-all disabled:opacity-50
                        ${tutorialStep === 'click-transmit' ? 'animate-tutorial-pulse' : ''}
                        ${
                          isTransmitting || wireShorted || !hasValidData
                            ? ' bg-[rgba(51,51,51,0.8)] cursor-not-allowed'
                            : ' bg-glass-gradient-primary hover:brightness-110 active:scale-95 cursor-pointer'
                        }`}
              style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color:
                  isTransmitting || wireShorted || !hasValidData
                    ? '#666'
                    : '#0b0d12',
                border: '1.5px solid rgba(166, 174, 204, 0.4)',
                boxShadow:
                  tutorialStep === 'click-transmit'
                    ? '0 0 20px rgba(147, 112, 173, 0.8)'
                    : isTransmitting || wireShorted || !hasValidData
                      ? 'none'
                      : '0 4px 12px rgba(147, 112, 173, 0.3)',
                opacity: isActionAllowed('transmit') ? 1 : 0.35,
                cursor: isActionAllowed('transmit') ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={(e) => {
                if (!isTransmitting && !wireShorted && hasValidData) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow =
                    '0 6px 16px rgba(147, 112, 173, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  isTransmitting || wireShorted || !hasValidData
                    ? 'none'
                    : '0 4px 12px rgba(147, 112, 173, 0.3)';
              }}
            >
              {isTransmitting ? (
                <span className="flex justify-center items-center gap-2">
                  <Radio size={18} strokeWidth="2.5" />
                  Transmitting {currentBit}/{totalBits}
                </span>
              ) : (
                <span className="flex justify-center items-center gap-2">
                  <SendHorizontal size={18} strokeWidth="2.5" />
                  Transmit
                </span>
              )}
            </button>

            {/* Pause / Resume Button */}
            <button
              onClick={togglePause}
              disabled={!isTransmitting || tutorialEnabled}
              className="px-4 py-3 flex items-center justify-center rounded-lg font-bold text-sm min-w-[60px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:
                  isPaused || tutorialHold
                    ? 'linear-gradient(135deg, rgba(147, 112, 173, 0.9), rgba(166, 174, 204, 0.9))'
                    : 'linear-gradient(135deg, rgba(255, 120, 120, 0.85), rgba(255, 160, 160, 0.85))',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#e8ebf2',
                border: '1.5px solid rgba(166, 174, 204, 0.4)',
                boxShadow:
                  isPaused || tutorialHold
                    ? '0 0 14px rgba(100, 200, 255, 0.5)'
                    : 'inset 0 1px 3px rgba(0, 0, 0, 0.35)',
              }}
            >
              {isPaused || tutorialHold ? (
                <Play size={22} fill="black" stroke="none" />
              ) : (
                <Pause size={22} fill="black" stroke="none" />
              )}
            </button>

            {/* Short Wire Button */}
            <button
              onClick={toggleWireShort}
              className={`px-4 py-3 rounded-lg font-bold text-sm min-w-[160px] text-white transition-all ${
                wireShorted ? 'animate-pulse' : ''
              }`}
              disabled={!isActionAllowed('wire')}
              style={{
                background: wireShorted
                  ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.95), rgba(216, 76, 76, 0.95))'
                  : 'rgba(42, 47, 69, 0.8)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: wireShorted
                  ? 'none'
                  : '1.5px solid rgba(58, 64, 96, 0.8)',
                boxShadow: wireShorted
                  ? '0 0 20px rgba(255, 107, 107, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
                opacity: isActionAllowed('wire') ? 1 : 0.35,
                pointerEvents: isActionAllowed('wire') ? 'auto' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!wireShorted) {
                  e.currentTarget.style.background = 'rgba(50, 58, 82, 0.9)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!wireShorted) {
                  e.currentTarget.style.background = 'rgba(42, 47, 69, 0.8)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {wireShorted ? (
                <span className="flex items-center justify-center gap-2">
                  <Zap size={18} fill="yellow" stroke="none" />
                  Wires Shorted
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Wrench size={18} fill="currentColor" stroke="none" />
                  Short Wires
                </span>
              )}
            </button>

            {/* Info Text */}
            <div
              className="w-full text-center text-xs pt-2 mt-1"
              style={{
                borderTop: '1px solid rgba(232, 235, 242, 0.15)',
                color: 'rgba(232, 235, 242, 0.7)',
              }}
            >
              8N1 • 1 start • 8 data • 1 stop • LSB first • Idle HIGH
            </div>
          </div>
        </div>
      </div>

      {/* Floating Pause Button (Mobile Only) */}
      {isMobile && isTransmitting && !isOpen && !tutorialEnabled && (
        <button
          onClick={togglePause}
          className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-[1500]
               w-14 h-14 rounded-lg flex items-center justify-center
               font-bold text-lg transition-all active:scale-95 ${isPaused ? 'shadow-glow-glass-primary' : 'shadow-[0_10px_28px_rgba(0,0,0,0.5)]'}`}
          style={{
            background: isPaused
              ? 'linear-gradient(135deg, rgba(147, 112, 173, 0.9), rgba(166, 174, 204, 0.9))'
              : 'linear-gradient(135deg, rgba(255, 120, 120, 0.85), rgba(255, 160, 160, 0.85))',
            color: '#0b0d12',
          }}
        >
          {isPaused ? (
            <Play size={22} fill="currentColor" stroke="none" />
          ) : (
            <Pause size={22} fill="currentColor" stroke="none" />
          )}
        </button>
      )}
    </>
  );
}
