/**
 * \file I2CControlPanel.tsx
 * \brief Interactive control panel and tutorial flow for I²C protocol visualization.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useI2CStore, getBitsTransferred } from './useI2CLogic';
import { useCommonStore } from '@/components/protocol-visualizer/CommonStore';
import type { TutorialStep } from './useI2CLogic';
import {
    Info,
    Radio,
    CheckCircle,
    AlertTriangle,
    Pause,
    Play,
    Send,
    Download,
    Zap,
    BookOpen,
    Lightbulb,
    ArrowRight,
    ArrowLeft,
    Network,
    Binary,
    ThumbsUp,
    PackagePlus,
    StopCircle,
    Brain,
    Circle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface I2CControlPanelProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
}

const STATUS_ICON_MAP = {
    idle: Info,
    transmitting: Radio,
    success: CheckCircle,
    error: AlertTriangle,
    paused: Pause,
    resumed: Play,
} as const;

type AllowedAction = 'pullup' | 'address' | 'data' | 'transmit' | 'pause';

const tutorialAllowedActions: Record<TutorialStep, AllowedAction[]> = {
    disabled: ['pullup', 'address', 'data', 'transmit', 'pause'],
    'enable-pullups': ['pullup'],
    'set-address': ['address'],
    'set-data': ['data'],
    'click-transmit': ['transmit'],
    'start-condition': [],
    'address-byte': [],
    'ack-bit': [],
    'data-byte': [],
    'stop-condition': [],
    'deep-dive': [],
};

type TutorialContent = {
    title: string;
    description: string;
    icon?: React.ComponentType<{
        size?: number;
        color?: string;
        strokeWidth?: string | number;
    }>;
    iconColor?: string;
};

const UI_SETUP_STEPS: TutorialStep[] = [
    'enable-pullups',
    'set-address',
    'set-data',
    'click-transmit',
];
const WAVEFORM_STEPS: TutorialStep[] = [
    'start-condition',
    'address-byte',
    'ack-bit',
    'data-byte',
    'stop-condition',
];
const stepOrder: TutorialStep[] = [
    ...UI_SETUP_STEPS,
    ...WAVEFORM_STEPS,
    'deep-dive',
];

function getStepType(step: TutorialStep): 'ui' | 'waveform' | 'final' {
    if (UI_SETUP_STEPS.includes(step)) return 'ui';
    if (WAVEFORM_STEPS.includes(step)) return 'waveform';
    if (step === 'deep-dive') return 'final';
    return 'final';
}

export default function I2CControlPanel({
    isOpen,
    setIsOpen,
}: I2CControlPanelProps) {
    const store = useI2CStore();
    const {
        displayClockFrequency,
        setClockFrequency,
        selectedSlaveAddress,
        setSelectedSlaveAddress,
        busPullupEnabled,
        setBusPullupEnabled,
        isTransmitting,
        isPaused,
        currentState,
        currentBitIndex,
        fullTaggedBitSequence,
        totalBits,
        status,
        startTransmission,
        togglePause,
        reset,
        tutorialEnabled,
        tutorialStep,
        setTutorialEnabled,
        setTutorialStep,
        tutorialHold,
        transmissionDirection,
    } = store;

    const [dataInput, setDataInput] = useState('0x42');
    const [addressInput, setAddressInput] = useState('0x68');
    const [isMobile, setIsMobile] = useState(false);

    const [showClockMenu, setShowClockMenu] = useState(false);
    const [openClockUpwards, setOpenClockUpwards] = useState(false);
    const clockButtonRef = useRef<HTMLButtonElement>(null);

    const toggleClockMenu = () => {
        if (!clockButtonRef.current) return;

        const rect = clockButtonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        setOpenClockUpwards(spaceBelow < 220 && spaceAbove > spaceBelow);
        setShowClockMenu((v) => !v);
    };

    const parseDataInput = () => {
        try {
            const dataBytes = dataInput
                .split(',')
                .map((s) => parseInt(s.trim(), 16))
                .filter((n) => !isNaN(n) && n >= 0 && n <= 255);
            return dataBytes;
        } catch {
            return [];
        }
    };

    const handleSendData = (direction: 'write' | 'read') => {
        const dataBytes = parseDataInput();
        if (dataBytes.length === 0) {
            alert('Please enter valid hex values (e.g., 0x42, 0xFF)');
            return;
        }

        startTransmission(dataBytes, direction);
        if (isMobile) {
            setIsOpen(false);
        }
    };

    const handleAddressChange = (value: string) => {
        setAddressInput(value);
        try {
            const addr = parseInt(value, 16);
            if (addr >= 0 && addr <= 0x7f) {
                setSelectedSlaveAddress(addr);
            }
        } catch {
            /* Catch Block */
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(max-width: 640px)');
        const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        setIsMobile(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    function isActionAllowed(action: AllowedAction) {
        if (!tutorialEnabled) return true;
        return tutorialAllowedActions[tutorialStep]?.includes(action);
    }

    const tutorialContent: Record<TutorialStep, TutorialContent> = {
        disabled: { title: '', description: '' },
        'enable-pullups': {
            icon: Zap,
            iconColor: '#4ade80',
            title: 'Step 1: Enable Pull-up Resistors',
            description:
                'I²C requires pull-up resistors! Click "Pull-ups OFF" to enable them. Without pull-ups, the bus cannot work because I²C uses open-drain outputs.',
        },
        'set-address': {
            icon: Network,
            iconColor: '#60a5fa',
            title: 'Step 2: Select Slave Address',
            description:
                'Choose which slave device to communicate with. Valid addresses are 0x68 and 0x3C. Each I²C device has a unique 7-bit address.',
        },
        'set-data': {
            icon: Binary,
            iconColor: '#a78bfa',
            title: 'Step 3: Enter Data Bytes',
            description:
                'Type the data you want to send in hexadecimal format (e.g., 0x42, 0xFF). Separate multiple bytes with commas.',
        },
        'click-transmit': {
            icon: Send,
            iconColor: '#ffffff',
            title: 'Step 4: Start Transmission',
            description:
                'Click "Write Data" or "Read Data" to begin the I²C transaction. Watch the waveform as the master sends the START condition, address, data, and STOP condition.',
        },
        'start-condition': {
            icon: Circle,
            iconColor: '#4ade80',
            title: 'START Condition',
            description:
                'The START condition signals the beginning of I²C communication. SDA falls from HIGH to LOW while SCL is HIGH. This alerts all slaves that a transaction is beginning.',
        },
        'address-byte': {
            icon: Circle,
            iconColor: '#3b82f6',
            title: 'Address Byte',
            description:
                'The master sends a 7-bit slave address (MSB first) followed by a R/W bit (0=write, 1=read). Only the device with this address will respond.',
        },
        'ack-bit': {
            icon: Circle,
            iconColor: '#22d3ee',
            title: 'ACK (Acknowledgment)',
            description:
                "After the address (and after each data byte), the slave pulls SDA LOW during the 9th clock pulse to acknowledge receipt. No ACK means the slave isn't responding!",
        },
        'data-byte': {
            icon: Circle,
            iconColor: '#fde047',
            title: 'Data Byte',
            description:
                'Each data byte is 8 bits sent MSB first. After each byte, the receiver sends an ACK. Multiple bytes can be sent in one transaction.',
        },
        'stop-condition': {
            icon: Circle,
            iconColor: '#ef4444',
            title: 'STOP Condition',
            description:
                'The STOP condition ends I²C communication. SDA rises from LOW to HIGH while SCL is HIGH. The bus is now idle and ready for the next transaction.',
        },
        'deep-dive': {
            icon: Brain,
            iconColor: '#ffffff',
            title: 'Want to Go Deeper?',
            description:
                'Explore clock stretching, multi-master arbitration, and why pull-up resistor values matter. Tap the 🧠 icon in the Nav Panel for detailed technical explanations!',
        },
    };

    const handlePullupToggle = () => {
        const store = useI2CStore.getState();

        if (tutorialEnabled && tutorialStep === 'enable-pullups') {
            if (!busPullupEnabled) {
                store.setBusPullupEnabled(true);
                store.reset();
                return;
            }
        }

        store.setBusPullupEnabled(!busPullupEnabled);
        store.reset();
    };

    const canProceedNext = useMemo(() => {
        if (!tutorialEnabled) return true;

        if (tutorialStep === 'enable-pullups') return busPullupEnabled;
        if (tutorialStep === 'set-data') return parseDataInput().length > 0;

        if (tutorialStep === 'click-transmit') return isTransmitting;

        if (WAVEFORM_STEPS.includes(tutorialStep)) return tutorialHold;

        return true;
    }, [
        tutorialEnabled,
        tutorialStep,
        busPullupEnabled,
        dataInput,
        isTransmitting,
        tutorialHold,
    ]);

    const handleTutorialToggle = () => {
        const store = useI2CStore.getState();

        if (!tutorialEnabled) {
            setTutorialEnabled(true);
            setTutorialStep('enable-pullups');
            store.setTutorialHold(false);

            store.reset();
        } else {
            setTutorialEnabled(false);
            setTutorialStep('disabled');
            store.setTutorialHold(false);

            store.reset();
        }
    };

    const handleTutorialNext = () => {
        const currentIndex = stepOrder.indexOf(tutorialStep);
        if (!canProceedNext || currentIndex >= stepOrder.length - 1) {
            return;
        }

        const currentStepType = getStepType(tutorialStep);
        const nextStep = stepOrder[currentIndex + 1];

        if (currentStepType === 'waveform') {
            if (tutorialStep === 'stop-condition') {
                useI2CStore.getState().setTutorialHold(false);
                setTutorialStep(nextStep);

                return;
            }
            useI2CStore.getState().setTutorialHold(false);
            return;
        }

        setTutorialStep(nextStep);
    };

    const handleTutorialFinish = () => {
        const store = useI2CStore.getState();
        const commonStore = useCommonStore.getState();

        commonStore.setShowDeepDiveOverlay(true);

        setTimeout(() => {
            commonStore.setShowDeepDiveOverlay(false);

            setTutorialEnabled(false);
            setTutorialStep('disabled');
            store.setTutorialHold(false);

            if (isPaused && store.isTransmitting) {
                togglePause();
            }
        }, 800);
    };

    const handleTutorialPrev = () => {
        const currentIndex = stepOrder.indexOf(tutorialStep);
        if (currentIndex <= 0) return;

        const prevStep = stepOrder[currentIndex - 1];

        setTutorialStep(prevStep);
        useI2CStore.getState().setTutorialHold(false);
    };

    const currentTutorial = tutorialContent[tutorialStep];
    const ADDRESS_WRITE_COLOR = '#ff60a0';
    const ADDRESS_READ_COLOR = '#60a5fa';
    const Icon = currentTutorial.icon;
    const iconColor = currentTutorial.iconColor ?? '#e8ebf2';
    const isFirstStep = tutorialStep === 'enable-pullups';
    const isLastStep = tutorialStep === 'deep-dive';
    const hasValidData = parseDataInput().length > 0;
    const StatusIcon = STATUS_ICON_MAP[status.type];

    const resolvedIconColor = useMemo(() => {
        if (tutorialStep === 'address-byte') {
            return transmissionDirection === 'read'
                ? ADDRESS_READ_COLOR
                : ADDRESS_WRITE_COLOR;
        }

        return iconColor;
    }, [tutorialStep, transmissionDirection, iconColor]);

    return (
        <>
            {tutorialEnabled && tutorialStep !== 'disabled' && (
                <div
                    className="tutorial-banner-container"
                    style={{
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    }}
                >
                    <div className="tutorial-banner-overlay-gradient" />

                    <div className="mb-3">
                        <h3 className="text-md flex justify-start items-center gap-2 font-bold mb-1.5 text-main text-glow-primary">
                            {Icon && (
                                <Icon
                                    size={18}
                                    color={resolvedIconColor}
                                    strokeWidth="2.5"
                                />
                            )}
                            {currentTutorial.title}
                        </h3>
                        <p className="text-sm leading-snug text-tutorial-desc">
                            {currentTutorial.description}
                        </p>
                    </div>

                    <div className="flex gap-2 justify-between mt-3">
                        <button
                            onClick={handleTutorialPrev}
                            disabled={
                                isFirstStep ||
                                isTransmitting ||
                                tutorialStep == 'deep-dive'
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

                        <div className="text-xs self-center text-tutorial-step">
                            Step {stepOrder.indexOf(tutorialStep) + 1} of{' '}
                            {stepOrder.length}
                        </div>

                        <button
                            onClick={
                                isLastStep
                                    ? handleTutorialFinish
                                    : handleTutorialNext
                            }
                            disabled={!canProceedNext}
                            className="btn-tutorial-next"
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
                                        className={`w-4 h-4 ${WAVEFORM_STEPS.includes(tutorialStep) ? '' : 'animate-pulse'}`}
                                        strokeWidth={2.5}
                                    />
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div
                className="control-panel-wrapper"
                style={{
                    transform: isOpen
                        ? 'translate(-50%, 0)'
                        : 'translate(-50%, 100%)',
                }}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="btn-toggle-tab"
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
                    className="control-panel"
                    style={{
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    }}
                >
                    <div className="control-panel-content">
                        <div className="w-full flex items-center justify-center gap-4 mb-1.5">
                            <h2 className="text-xl font-bold text-main text-glow-secondary">
                                Inter-Integrated Circuit (I²C)
                            </h2>

                            <button
                                onClick={handleTutorialToggle}
                                className={`btn-tutorial-toggle ${tutorialEnabled ? 'active' : ''}`}
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

                        <div className="control-grid">
                            <div
                                className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md bg-status-bg text-center min-h-[38px] ${
                                    status.type === 'error'
                                        ? 'border border-error text-error'
                                        : 'border border-status-border text-text-main'
                                }`}
                            >
                                <StatusIcon size={16} strokeWidth={2.5} />
                                <span>{status.text}</span>
                            </div>

                            <div className="transmission-info">
                                {isTransmitting ? (
                                    <>
                                        Bit:
                                        {getBitsTransferred(store.waveformData)}
                                        /{totalBits} • State: {currentState}
                                    </>
                                ) : (
                                    <>Waiting for START condition</>
                                )}
                            </div>

                            <button
                                onClick={handlePullupToggle}
                                disabled={
                                    isTransmitting || !isActionAllowed('pullup')
                                }
                                className={`btn-pullup hover:brightness-110 transition-all ${busPullupEnabled ? 'enabled' : 'disabled'} ${
                                    tutorialStep === 'enable-pullups' &&
                                    !busPullupEnabled
                                        ? 'animate-tutorial-pulse '
                                        : ''
                                }${!busPullupEnabled ? 'animate-pulse' : ''}`}
                            >
                                <Zap size={18} strokeWidth={2.5} />
                                {busPullupEnabled
                                    ? 'Pull-ups ON'
                                    : 'Pull-ups OFF'}
                            </button>
                        </div>

                        <div className="control-inputs">
                            <div className="input-group relative">
                                <label className="input-label">
                                    Clock Frequency (SCL)
                                </label>

                                <button
                                    ref={clockButtonRef}
                                    type="button"
                                    disabled={isTransmitting}
                                    onClick={toggleClockMenu}
                                    className={` input-select flex justify-between items-center
                                              ${isTransmitting ? 'opacity-50 cursor-not-allowed' : ''} `}
                                >
                                    <span>
                                        {displayClockFrequency === 100000 &&
                                            '100 kHz (Standard)'}
                                        {displayClockFrequency === 400000 &&
                                            '400 kHz (Fast)'}
                                        {displayClockFrequency === 1000000 &&
                                            '1 MHz (Fast Plus)'}
                                        {displayClockFrequency === 3400000 &&
                                            '3.4 MHz (High-speed)'}
                                    </span>
                                    {showClockMenu ? (
                                        <ChevronUp size={16} />
                                    ) : (
                                        <ChevronDown size={16} />
                                    )}
                                </button>

                                {showClockMenu && !isTransmitting && (
                                    <div
                                        className={` absolute w-full dropdown-panel rounded-lg z-[1200] overflow-hidden
                                                  ${openClockUpwards ? 'bottom-full mb-2' : 'top-full mt-2'} `}
                                    >
                                        {[
                                            {
                                                value: 100000,
                                                label: '100 kHz (Standard)',
                                            },
                                            {
                                                value: 400000,
                                                label: '400 kHz (Fast)',
                                            },
                                            {
                                                value: 1000000,
                                                label: '1 MHz (Fast Plus)',
                                            },
                                            {
                                                value: 3400000,
                                                label: '3.4 MHz (High-speed)',
                                            },
                                        ].map(({ value, label }) => (
                                            <button
                                                key={value}
                                                onClick={() => {
                                                    setClockFrequency(value);
                                                    setShowClockMenu(false);
                                                }}
                                                className={` w-full px-4 py-2 text-left text-sm transition hover:bg-white/10 
                                                          ${displayClockFrequency === value ? 'text-glow-primary' : ''} `}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="input-group">
                                <label className="input-label">
                                    Target Slave Address (7-bit)
                                </label>
                                <input
                                    type="text"
                                    value={addressInput}
                                    onChange={(e) =>
                                        handleAddressChange(e.target.value)
                                    }
                                    disabled={
                                        isTransmitting ||
                                        !isActionAllowed('address')
                                    }
                                    placeholder="0x68"
                                    className={`input-box ${
                                        tutorialStep === 'set-address'
                                            ? 'tutorial-active'
                                            : ''
                                    }`}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">
                                    Data Bytes (hex, comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={dataInput}
                                    onChange={(e) =>
                                        setDataInput(e.target.value)
                                    }
                                    disabled={
                                        isTransmitting ||
                                        !isActionAllowed('data')
                                    }
                                    placeholder="0x42, 0xFF"
                                    className={`input-box ${
                                        tutorialStep === 'set-data'
                                            ? 'tutorial-active'
                                            : ''
                                    }`}
                                />
                            </div>

                            <button
                                onClick={() => handleSendData('write')}
                                disabled={
                                    isTransmitting ||
                                    !busPullupEnabled ||
                                    !hasValidData ||
                                    !isActionAllowed('transmit')
                                }
                                className={`btn-transmit write hover:shadow-glow-glass-primary transition-all ${
                                    tutorialStep === 'click-transmit'
                                        ? 'tutorial-active'
                                        : ''
                                }`}
                            >
                                <span className="flex justify-center items-center gap-2">
                                    <Send size={18} strokeWidth={2.5} />
                                    Write Data
                                </span>
                            </button>

                            <button
                                onClick={() => handleSendData('read')}
                                disabled={
                                    isTransmitting ||
                                    !busPullupEnabled ||
                                    !hasValidData ||
                                    !isActionAllowed('transmit')
                                }
                                className="btn-transmit read hover:shadow-glow-glass-primary transition-all"
                            >
                                <span className="flex justify-center items-center gap-2">
                                    <Download size={18} strokeWidth={2.5} />
                                    Read Data
                                </span>
                            </button>

                            {isTransmitting && (
                                <button
                                    onClick={togglePause}
                                    disabled={tutorialEnabled}
                                    className={`btn-pause ${isPaused || tutorialHold ? 'paused' : 'active'}`}
                                >
                                    {isPaused || tutorialHold ? (
                                        <Play
                                            size={22}
                                            fill="black"
                                            stroke="none"
                                        />
                                    ) : (
                                        <Pause
                                            size={22}
                                            fill="black"
                                            stroke="none"
                                        />
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="control-footer">
                            7-bit addressing • Open-drain • Multi-master capable
                            • Pull-up required
                        </div>
                    </div>
                </div>
            </div>
            {isMobile && isTransmitting && !isOpen && !tutorialEnabled && (
                <button
                    onClick={togglePause}
                    className={`fab-mobile-pause ${isPaused ? 'paused' : ''}`}
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
