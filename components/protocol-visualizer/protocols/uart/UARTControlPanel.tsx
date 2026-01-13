/**
 * \file UARTControlPanel.tsx
 * \brief Interactive control panel managing UART transmission, status, and tutorial flow.
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useUARTStore } from './useUARTLogic';
import { useCommonStore } from '@/components/protocol-visualizer/CommonStore';
import type { TutorialStep } from './useUARTLogic';
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
    Activity,
    Brain,
    AlertTriangle,
    CheckCircle,
    Info,
    ArrowRight,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface UARTControlPanelProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
}

type AllowedAction = 'data' | 'baud' | 'transmit' | 'pause' | 'wire';

type TutorialContent = {
    title: string;
    description: string;
    icon?: LucideIcon;
    iconColor?: string;
};

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

const tutorialContent: Record<TutorialStep, TutorialContent> = {
    disabled: { title: '', description: '' },
    'set-text': {
        icon: Pencil,
        iconColor: 'white',
        title: 'Step 1: Enter Your Text',
        description:
            'Type some text in the "Data" input field. This is the message that will be transmitted via UART.',
    },
    'set-baud': {
        icon: Zap,
        iconColor: 'yellow',
        title: 'Step 2: Select Baud Rate',
        description:
            'Choose a baud rate from the dropdown. The baud rate determines how fast data is transmitted.',
    },
    'click-transmit': {
        icon: SendHorizontal,
        iconColor: 'white',
        title: 'Step 3: Start Transmission',
        description: 'Click the Transmit button to begin sending your data.',
    },
    'start-bit': {
        icon: Circle,
        iconColor: 'green',
        title: 'Start Bit',
        description:
            'The start bit is always LOW (0) and signals the beginning of a UART frame.',
    },
    'data-bits': {
        icon: Circle,
        iconColor: 'yellow',
        title: 'Data Bits',
        description:
            'The 8 data bits carry the actual character. UART sends LSB first.',
    },
    'stop-bit': {
        icon: Circle,
        iconColor: 'red',
        title: 'Stop Bit',
        description:
            'The stop bit is always HIGH (1) and marks the end of a frame.',
    },
    'idle-state': {
        icon: Activity,
        iconColor: 'white',
        title: 'Idle State',
        description:
            'When idle, the UART line stays HIGH until a new start bit begins.',
    },
    'deep-dive': {
        icon: Brain,
        iconColor: 'white',
        title: 'Want to Go Deeper?',
        description:
            'Real systems fail due to timing drift, clock mismatch, and sampling errors. Tap the 🧠 icon in the Nav Panel to explore deeper explanations',
    },
};

export default function UARTControlPanel({
    isOpen,
    setIsOpen,
}: UARTControlPanelProps) {
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
        tutorialStep,
        setTutorialStep,
        tutorialEnabled,
        setTutorialEnabled,
        setTutorialHold,
        resetTransmission,
    } = useUARTStore();

    const [rxBaudRate, setRxBaudRate] = useState(baudRate);
    const [rxLatched, setRxLatched] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [backwardDebt, setBackwardDebt] = useState(0);
    const [showBaudMenu, setShowBaudMenu] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const [openUpwards, setOpenUpwards] = useState(false);

    const toggleMenu = () => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        setOpenUpwards(spaceBelow < 200 && spaceAbove > spaceBelow);

        setShowBaudMenu((v) => !v);
    };

    function generateGarbage(len: number) {
        const chars = '�';
        return Array.from(
            { length: len },
            () => chars[Math.floor(Math.random() * chars.length)]
        ).join('');
    }

    const computeRXChar = useCallback(
        (txChar: string, txBaud: number, rxBaud: number) => {
            if (!txChar) return '';

            const mismatch =
                Math.abs(txBaud - rxBaud) / ((txBaud + rxBaud) / 2);

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

            return Math.random() < errorProbability
                ? generateGarbage(1)
                : txChar;
        },
        []
    );

    function isActionAllowed(action: AllowedAction) {
        if (!tutorialEnabled) return true;
        return tutorialAllowedActions[tutorialStep]?.includes(action);
    }

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

    useEffect(() => {
        if (!isTransmitting && currentBit < totalBits) return;

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
        if (isTransmitting && currentBit === 0) {
            setRxLatched('');
        }
    }, [isTransmitting, currentBit]);

    useEffect(() => {
        if (status.type !== 'idle') return;

        const timer = setTimeout(() => {
            setRxLatched('');
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

    useEffect(() => {
        if (!tutorialEnabled) return;

        if (
            tutorialStep === 'click-transmit' &&
            isTransmitting &&
            currentBit === 1
        ) {
            setTutorialStep('start-bit');
        }

        if (tutorialStep === 'idle-state' && !isTransmitting) {
            setTutorialHold(false);
        }
    }, [
        tutorialEnabled,
        tutorialStep,
        isTransmitting,
        currentBit,
        setTutorialStep,
        setTutorialHold,
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

    const handleTutorialToggle = () => {
        if (!tutorialEnabled) {
            setTutorialEnabled(true);
            setTutorialStep('set-text');
            setBackwardDebt(0);
            setTutorialHold(false);
            resetTransmission();
        } else {
            setTutorialEnabled(false);
            setTutorialStep('disabled');
            setBackwardDebt(0);
            setTutorialHold(false);
            resetTransmission();
        }
    };

    const handleTutorialFinish = () => {
        const commonStore = useCommonStore.getState();

        commonStore.setShowDeepDiveOverlay(true);

        setTimeout(() => {
            commonStore.setShowDeepDiveOverlay(false);

            setTutorialEnabled(false);
            setTutorialStep('disabled');
            setBackwardDebt(0);
            setTutorialHold(false);

            if (isPaused && isTransmitting) {
                togglePause();
            }
        }, 800);
    };

    const handleTutorialNext = () => {
        const currentIndex = stepOrder.indexOf(tutorialStep);

        if (!canProceedNext) return;

        setTutorialHold(false);

        const nextStep = stepOrder[currentIndex + 1];

        if (backwardDebt > 0) {
            setBackwardDebt((d) => d - 1);

            if (currentIndex < stepOrder.length - 1) {
                setTutorialStep(nextStep);
            }
            return;
        }

        if (tutorialStep === 'start-bit') {
            if (isPaused) togglePause();
        }

        if (tutorialStep === 'data-bits') {
            if (isPaused) togglePause();
        }

        if (tutorialStep === 'stop-bit') {
            if (isPaused) togglePause();
        }

        if (tutorialStep === 'idle-state') {
            setTutorialStep('deep-dive');
            return;
        }

        if (currentIndex < stepOrder.length - 1) {
            setTutorialStep(nextStep);
        } else {
            setTutorialEnabled(false);
            setTutorialStep('disabled');

            if (isPaused && isTransmitting) {
                togglePause();
            }
        }
    };

    const handleTutorialPrev = () => {
        const currentIndex = stepOrder.indexOf(tutorialStep);

        setBackwardDebt((d) => d + 1);

        if (currentIndex > 0) {
            const prevStep = stepOrder[currentIndex - 1];
            setTutorialStep(prevStep);

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
    const canTransmit =
        !isTransmitting &&
        !wireShorted &&
        hasValidData &&
        isActionAllowed('transmit');
    const canShortWire = isActionAllowed('wire');

    return (
        <>
            {tutorialEnabled && tutorialStep !== 'disabled' && (
                <div
                    className="fixed left-1/2 -translate-x-1/2 z-[2000] w-[92%] max-w-[500px] top-2 sm:top-4 md:top-4 lg:top-4 xl:top-4 tutorial-banner-container p-4 rounded-xl"
                    style={{
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    }}
                >
                    <div className="absolute inset-0 rounded-2xl pointer-events-none tutorial-banner-overlay" />

                    <div className="mb-3">
                        <h3 className="text-md flex justify-start items-center gap-2 font-bold mb-1.5 text-text-main text-glow-primary">
                            {Icon && (
                                <Icon
                                    size={18}
                                    color={iconColor}
                                    strokeWidth="2.5"
                                />
                            )}
                            {currentTutorial.title}
                        </h3>
                        <p className="text-sm leading-snug text-text-main/90">
                            {currentTutorial.description}
                        </p>
                    </div>

                    <div className="flex gap-2 justify-between mt-3">
                        <button
                            onClick={handleTutorialPrev}
                            disabled={
                                isFirstStep ||
                                isTransmitting ||
                                tutorialStep === 'idle-state'
                            }
                            className="btn-tutorial-prev hover:brightness-110"
                        >
                            <span className="flex items-center gap-2">
                                <ArrowLeft
                                    className="w-4 h-4"
                                    strokeWidth={2.5}
                                />
                                Previous
                            </span>
                        </button>

                        <div className="text-xs self-center text-text-main/60">
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
                            onClick={
                                isLastStep
                                    ? handleTutorialFinish
                                    : handleTutorialNext
                            }
                            disabled={!canProceedNext}
                            className={`relative px-4 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-30 btn-glass btn-tutorial-next ${
                                !canProceedNext
                                    ? 'cursor-not-allowed text-text-main'
                                    : 'text-text-dark hover:brightness-110'
                            }`}
                        >
                            {isLastStep ? (
                                <span className="flex items-center gap-2 hover:shadow-glow-glass-primary">
                                    <CheckCircle
                                        className="w-4 h-4"
                                        strokeWidth={2.5}
                                    />
                                    Finish
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 hover:shadow-glow-glass-primary">
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
                    transform: isOpen
                        ? 'translate(-50%, 0)'
                        : 'translate(-50%, 100%)',
                }}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className=" absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-14 h-[26px] flex items-center justify-center text-lg text-black font-bold cursor-pointer select-none rounded-t-xl border-none transition-transform btn-toggle-tab "
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
                            transform: isOpen
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                            transition: 'transform 0.3s ease',
                        }}
                    >
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                </button>

                <div
                    className="relative overflow-hidden rounded-t-2xl p-5 control-panel"
                    style={{
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    }}
                >
                    <div className="absolute inset-0 pointer-events-none control-panel-overlay" />

                    <div className="flex flex-wrap gap-3.5 items-end justify-center">
                        <div className="w-full flex items-center justify-center gap-4 mb-1.5">
                            <h2 className="text-center text-xl font-bold text-text-main text-glow-secondary">
                                Universal Asynchronous Receiver Transmitter
                            </h2>

                            <button
                                onClick={handleTutorialToggle}
                                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-tutorial-toggle ${
                                    tutorialEnabled
                                        ? 'active text-text-dark'
                                        : 'text-text-main'
                                }`}
                            >
                                {tutorialEnabled ? (
                                    <span className="flex items-center gap-2">
                                        <BookOpen
                                            size={18}
                                            fill="currentColor"
                                            stroke="none"
                                        />
                                        Tutorial ON
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 hover:brightness-110">
                                        <Lightbulb
                                            size={18}
                                            fill="yellow"
                                            stroke="2.5"
                                        />
                                        Start Tutorial
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-[1fr_2fr_2fr] gap-3 w-full mb-3 max-sm:grid-cols-1">
                            <div
                                className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md bg-status-bg text-center min-h-[38px] ${
                                    status.type === 'error'
                                        ? 'border border-error text-error'
                                        : 'border border-status-border text-text-main'
                                }`}
                            >
                                <StatusIcon
                                    className="w-4 h-4 shrink-0"
                                    strokeWidth={2.5}
                                />
                                <span>{status.text}</span>
                            </div>

                            <div className="flex flex-col">
                                <div className="text-[11px] opacity-60 mb-0.5">
                                    TX (Sent)
                                </div>
                                <div className="px-2 py-1 rounded bg-black/30 font-mono text-xs min-h-[32px]">
                                    {txDisplay || '—'}
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <div className="text-[11px] opacity-60 mb-0.5">
                                    RX (Received)
                                </div>
                                <div
                                    className={`px-2 py-1 rounded bg-black/30 font-mono text-xs min-h-[32px] ${
                                        rxMatchesSoFar
                                            ? 'text-[#b4f8c8]'
                                            : 'text-[#ff9b9b]'
                                    }`}
                                >
                                    {rxDisplay || '—'}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col min-w-[160px] flex-1 max-w-[300px] relative rounded-lg">
                            <label className="text-xs mb-1 font-bold text-text-main/80">
                                Data
                            </label>
                            <input
                                type="text"
                                value={data}
                                onChange={(e) => setData(e.target.value)}
                                maxLength={50}
                                placeholder="Enter text..."
                                className={`p-2.5 rounded-md text-sm outline-none transition-all input-box text-text-main ${
                                    tutorialStep === 'set-text'
                                        ? 'animate-tutorial-pulse tutorial-active'
                                        : ''
                                } ${!hasValidData ? 'animate-pulse-error' : ''}`}
                                disabled={
                                    isTransmitting || !isActionAllowed('data')
                                }
                                style={{
                                    opacity:
                                        isTransmitting ||
                                        !isActionAllowed('data')
                                            ? 0.5
                                            : 1,
                                    cursor:
                                        isTransmitting ||
                                        !isActionAllowed('data')
                                            ? 'not-allowed'
                                            : 'text',
                                }}
                            />
                        </div>

                        <div className="flex flex-col min-w-[160px] flex-1 max-w-[300px] relative">
                            <label className="text-xs mb-1 font-bold text-text-main/80">
                                TX Baud Rate
                            </label>

                            <button
                                ref={buttonRef}
                                type="button"
                                disabled={
                                    isTransmitting || !isActionAllowed('baud')
                                }
                                onClick={toggleMenu}
                                className={` input-box flex justify-between items-center
                                          ${tutorialStep === 'set-baud' ? 'animate-tutorial-pulse tutorial-active' : ''}
                                          ${isTransmitting || !isActionAllowed('baud') ? 'opacity-50 cursor-not-allowed' : ''} `}
                            >
                                <span>{baudRate}</span>
                                {showBaudMenu ? (
                                    <ChevronUp size={16} />
                                ) : (
                                    <ChevronDown size={16} />
                                )}
                            </button>

                            {showBaudMenu &&
                                !isTransmitting &&
                                isActionAllowed('baud') && (
                                    <div
                                        className={`absolute w-full dropdown-panel rounded-lg z-[1200] overflow-hidden
                                                  ${openUpwards ? 'bottom-full' : 'top-full'} `}
                                    >
                                        {[9600, 19200, 38400, 115200].map(
                                            (rate) => (
                                                <button
                                                    key={rate}
                                                    onClick={() => {
                                                        setBaudRate(rate);
                                                        setShowBaudMenu(false);
                                                    }}
                                                    className={` w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition
                                                              ${baudRate === rate ? 'text-glow-primary' : ''} `}
                                                >
                                                    {rate}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                        </div>

                        <div className="flex flex-col min-w-[160px] flex-1 max-w-[300px] relative rounded-lg">
                            <label className="text-xs mb-1 font-bold text-text-main/80">
                                RX Baud Rate
                            </label>
                            <input
                                type="number"
                                value={rxBaudRate}
                                onChange={(e) =>
                                    setRxBaudRate(Number(e.target.value))
                                }
                                disabled={isTransmitting || tutorialEnabled}
                                min={300}
                                step={1}
                                placeholder="Enter RX baud..."
                                className="p-2.5 rounded-md text-sm outline-none transition-all input-box text-text-main"
                                style={{
                                    opacity:
                                        isTransmitting || tutorialEnabled
                                            ? 0.5
                                            : 1,
                                    cursor:
                                        isTransmitting || tutorialEnabled
                                            ? 'not-allowed'
                                            : 'text',
                                }}
                            />
                        </div>

                        <button
                            onClick={() => {
                                startOrToggleTransmission();
                                if (isMobile) {
                                    setIsOpen(false);
                                }
                            }}
                            disabled={
                                isTransmitting ||
                                wireShorted ||
                                !isActionAllowed('transmit') ||
                                !canTransmit
                            }
                            className={`relative px-4 py-3 min-w-[160px] rounded-lg font-bold text-sm border-none transition-all duration-200 disabled:opacity-50 btn-glass btn-transmit write ${
                                tutorialStep === 'click-transmit'
                                    ? 'animate-tutorial-pulse tutorial-active'
                                    : ''
                            } ${
                                canTransmit
                                    ? 'cursor-pointer hover:shadow-glow-glass-primary text-text-dark'
                                    : 'cursor-not-allowed text-[#666]'
                            }`}
                        >
                            {isTransmitting ? (
                                <span className="flex justify-center items-center gap-2">
                                    <Radio size={18} strokeWidth="2.5" />
                                    Transmitting {currentBit}/{totalBits}
                                </span>
                            ) : (
                                <span className="flex justify-center items-center gap-2">
                                    <SendHorizontal
                                        size={18}
                                        strokeWidth="2.5"
                                    />
                                    Transmit
                                </span>
                            )}
                        </button>

                        <button
                            onClick={togglePause}
                            disabled={!isTransmitting || tutorialEnabled}
                            className={`relative px-4 py-3 flex items-center justify-center rounded-lg font-bold text-sm min-w-[60px] transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-pause text-text-main ${
                                isPaused || tutorialHold ? 'paused' : 'active'
                            }`}
                        >
                            {isPaused || tutorialHold ? (
                                <Play size={22} fill="black" stroke="none" />
                            ) : (
                                <Pause size={22} fill="black" stroke="none" />
                            )}
                        </button>

                        <button
                            onClick={toggleWireShort}
                            className={`relative px-4 py-3 min-w-[160px] rounded-lg font-bold text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 btn-short-wire ${
                                wireShorted ? 'animate-pulse shorted' : ''
                            }`}
                            disabled={!isActionAllowed('wire')}
                            style={{
                                opacity: canShortWire ? 1 : 0.35,
                            }}
                        >
                            {wireShorted ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Zap
                                        size={18}
                                        fill="yellow"
                                        stroke="none"
                                    />
                                    Wires Shorted
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Wrench
                                        size={18}
                                        fill="currentColor"
                                        stroke="none"
                                    />
                                    Short Wires
                                </span>
                            )}
                        </button>

                        <div className="w-full text-center text-xs pt-2 mt-1 border-t border-text-main/15 text-text-main/70">
                            8N1 • 1 start • 8 data • 1 stop • LSB first • Idle
                            HIGH
                        </div>
                    </div>
                </div>
            </div>

            {isMobile && isTransmitting && !isOpen && !tutorialEnabled && (
                <button
                    onClick={togglePause}
                    className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-[1500] w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg transition-all active:scale-95 text-text-dark fab-mobile-pause ${
                        isPaused ? 'paused' : ''
                    }`}
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
