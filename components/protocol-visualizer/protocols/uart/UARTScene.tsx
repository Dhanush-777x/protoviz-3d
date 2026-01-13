/**
 * \file UARTScene.tsx
 * \brief Composes the complete 3D UART scene including boards, wires, waveform, and effects.
 */

'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import UARTBoard from './UARTBoard';
import UARTWire from './UARTWire';
import UARTWaveform from './UARTWaveform';
import UARTParticles from './UARTParticles';
import { useUARTStore } from './useUARTLogic';
import * as THREE from 'three';
import InfoPoints from './InfoPoints';
import { Environment } from '@react-three/drei';

/**
 * \brief Renders the full UART 3D scene and advances transmission timing.
 */
export default function UARTScene() {
    const bitDurationRef = useRef(0);
    const {
        baudRate,
        isTransmitting,
        wireShorted,
        advanceBit,
        currentBit,
        resetKey,
    } = useUARTStore();

    const uartInfoPoints = [
        {
            position: [-4.5, -0.25, -0.5] as [number, number, number],
            title: 'TX Pin (Transmitter)',
            description:
                "I'm the transmit pin of the TX device. I send serial data as electrical signals (HIGH/LOW) to the receiver.",
            color: '#fbbf24',
        },

        {
            position: [-4.5, -0.25, 0.5] as [number, number, number],
            title: 'GND Pin (Transmitter)',
            description:
                "I'm the ground reference pin. I provide a common voltage reference (0V) for reliable signal interpretation.",
            color: '#6b7280',
        },

        {
            position: [4.5, -0.25, 0.5] as [number, number, number],
            title: 'RX Pin (Receiver)',
            description:
                "I'm the receive pin of the RX device. I listen for incoming serial data signals from the transmitter.",
            color: '#fbbf24',
        },

        {
            position: [4.5, -0.25, -0.5] as [number, number, number],
            title: 'GND Pin (Receiver)',
            description:
                "I'm the ground reference pin. I share a common ground with the transmitter to ensure accurate signal levels.",
            color: '#6b7280',
        },

        {
            position: [-1.5, 1.6, -0.3] as [number, number, number],
            title: 'Signal Wire (TX → RX)',
            description:
                'I carry the UART data signal from TX to RX. I transmit HIGH (idle/stop/1) and LOW (start/0) voltage levels.',
            color: '#ef4444',
        },

        {
            position: [-0.5, 1.3, 0.1] as [number, number, number],
            title: 'Ground Wire (Common Reference)',
            description:
                "I connect both GND pins. Without me, the receiver can't tell if the signal wire is HIGH or LOW. I'm essential!",
            color: '#3b82f6',
        },
    ];

    useEffect(() => {
        if (!isTransmitting || wireShorted) {
            bitDurationRef.current = 0;
        }
    }, [isTransmitting, wireShorted]);

    useEffect(() => {
        if (currentBit === 0) {
            bitDurationRef.current = 0;
        }
    }, [currentBit]);

    useFrame((state, delta) => {
        if (isTransmitting && !wireShorted) {
            const bitTime = (1 / baudRate) * 2000;

            bitDurationRef.current += delta;

            if (bitDurationRef.current >= bitTime) {
                bitDurationRef.current = 0;
                advanceBit();
            }
        }
    });

    return (
        <group>
            <UARTBoard type="tx" position={[-6, -0.85, 0]} />

            <UARTBoard type="rx" position={[6, -0.85, 0]} />

            {wireShorted ? (
                <>
                    <UARTWire
                        start={new THREE.Vector3(-4.5, -0.5, -0.5)}
                        end={new THREE.Vector3(4.5, -0.5, -0.5)}
                        color={0xff6b6b}
                        yOffset={0.3}
                    />
                    <UARTWire
                        start={new THREE.Vector3(-4.5, -0.5, 0.5)}
                        end={new THREE.Vector3(4.5, -0.5, 0.5)}
                        color={0x6c8cff}
                        yOffset={0}
                    />
                </>
            ) : (
                <>
                    <UARTWire
                        start={new THREE.Vector3(-4.5, -0.5, -0.5)}
                        end={new THREE.Vector3(4.5, -0.5, 0.5)}
                        color={0xff6b6b}
                        yOffset={0.3}
                    />
                    <UARTWire
                        start={new THREE.Vector3(-4.5, -0.5, 0.5)}
                        end={new THREE.Vector3(4.5, -0.5, -0.5)}
                        color={0x6c8cff}
                        yOffset={0}
                    />
                </>
            )}

            <UARTParticles />

            <UARTWaveform position={[0, 6, -2]} key={resetKey} />

            <InfoPoints points={uartInfoPoints} wireShorted={wireShorted} />
        </group>
    );
}
