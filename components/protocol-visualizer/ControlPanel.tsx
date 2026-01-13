/**
 * \file ControlPanel.tsx
 * \brief Protocol-specific control panel with animated protocol switching.
 */

'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ProtocolType } from '@/types/protocols';
import { useUARTStore } from '@/components/protocol-visualizer/protocols/uart/useUARTLogic';
import { useI2CStore } from '@/components/protocol-visualizer/protocols/i2c/useI2CLogic';
import UARTControlPanel from './protocols/uart/UARTControlPanel';
import I2CControlPanel from './protocols/i2c/I2CControlPanel';

interface ControlPanelProps {
    protocol: ProtocolType;
    onProtocolChange?: (protocol: ProtocolType) => void;
}

const PROTOCOL_INFO = {
    uart: {
        short: 'UART',
        full: 'Universal Asynchronous Receiver Transmitter',
        color: '#9370ad',
    },
    i2c: {
        short: 'I²C',
        full: 'Inter-Integrated Circuit',
        color: '#60a0ff',
    },
} as const;

const AVAILABLE_PROTOCOLS: ProtocolType[] = ['uart', 'i2c'];

/**
 * \brief Renders the main control panel and handles protocol switching logic.
 */
export default function ControlPanel({
    protocol,
    onProtocolChange,
}: ControlPanelProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [isFading, setIsFading] = useState(false);
    const [displayProtocol, setDisplayProtocol] =
        useState<ProtocolType>(protocol);

    const buttonRefs = useRef<HTMLButtonElement[]>([]);
    const [indicatorStyle, setIndicatorStyle] = useState({
        left: 0,
        width: 0,
    });

    useEffect(() => {
        if (protocol === displayProtocol) return;

        useUARTStore.getState().resetTransmission();
        useI2CStore.getState().reset();

        setIsFading(true);

        const timer = setTimeout(() => {
            setDisplayProtocol(protocol);
            setIsFading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [protocol, displayProtocol]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.code !== 'Space') return;

            e.preventDefault();

            if (protocol === 'i2c') {
                const store = useI2CStore.getState();
                if (store.isTransmitting) {
                    store.togglePause();
                }
            }

            if (protocol === 'uart') {
                const store = useUARTStore.getState();
                if (store.isTransmitting) {
                    store.togglePause();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [protocol]);

    useLayoutEffect(() => {
        const index = AVAILABLE_PROTOCOLS.indexOf(protocol);
        const btn = buttonRefs.current[index];

        if (btn) {
            setIndicatorStyle({
                left: btn.offsetLeft,
                width: btn.offsetWidth,
            });
        }
    }, [protocol]);

    return (
        <>
            {onProtocolChange && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000]">
                    <div
                        className="glass-panel-elevated rounded-xl border border-[rgba(166,174,204,0.25)] p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                        style={{
                            backdropFilter: 'blur(20px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        }}
                    >
                        <div className="relative flex gap-1">
                            <div
                                className="absolute top-0 bottom-0 rounded-lg transition-all duration-300 ease-out pointer-events-none"
                                style={{
                                    left: indicatorStyle.left,
                                    width: indicatorStyle.width,
                                    background: `linear-gradient(135deg, ${PROTOCOL_INFO[protocol].color}40, ${PROTOCOL_INFO[protocol].color}20)`,
                                    border: `1.5px solid ${PROTOCOL_INFO[protocol].color}60`,
                                    boxShadow: `0 0 16px ${PROTOCOL_INFO[protocol].color}40`,
                                }}
                            />

                            {AVAILABLE_PROTOCOLS.map((p, i) => {
                                const info = PROTOCOL_INFO[p];
                                const isActive = p === protocol;

                                return (
                                    <button
                                        key={p}
                                        ref={(el) => {
                                            if (el) buttonRefs.current[i] = el;
                                        }}
                                        onClick={() => onProtocolChange(p)}
                                        className={[
                                            'relative z-10 min-w-[60px] px-4 py-1 rounded-lg',
                                            'font-bold text-sm transition-all duration-300',
                                            !isActive &&
                                                'text-[rgba(232,235,242,0.6)]',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        style={
                                            isActive
                                                ? {
                                                      color: info.color,
                                                      textShadow: `0 0 8px ${info.color}`,
                                                  }
                                                : undefined
                                        }
                                    >
                                        {info.short}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div
                className="transition-opacity duration-300 ease-in-out"
                style={{
                    opacity: isFading ? 0 : 1,
                }}
            >
                {displayProtocol === 'uart' && (
                    <UARTControlPanel isOpen={isOpen} setIsOpen={setIsOpen} />
                )}

                {displayProtocol === 'i2c' && (
                    <I2CControlPanel isOpen={isOpen} setIsOpen={setIsOpen} />
                )}

                {!['uart', 'i2c'].includes(displayProtocol) && (
                    <div
                        className="fixed left-1/2 bottom-0 w-full max-w-[1100px] -translate-x-1/2 z-[1000]"
                        style={{
                            transform: isOpen
                                ? 'translate(-50%, 0)'
                                : 'translate(-50%, 100%)',
                        }}
                    >
                        <div className="relative overflow-hidden rounded-t-2xl border border-[rgba(166,174,204,0.2)] border-b-0 p-8 text-center bg-[rgba(18,20,30,0.75)]">
                            <h2 className="text-lg font-bold text-[#e8ebf2] mb-2">
                                {PROTOCOL_INFO[displayProtocol]?.short ||
                                    displayProtocol.toUpperCase()}
                            </h2>
                            <p className="text-[rgba(232,235,242,0.7)]">
                                Coming soon! This protocol is under development.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
