/**
 * \file I2CScene.tsx
 * \brief Main 3D scene orchestrating the I²C protocol visualization.
 */

'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import I2CBoard from './I2CBoard';
import I2CWire from './I2CWire';
import I2CWaveform from './I2CWaveform';
import I2CParticles from './I2CParticles';
import { useI2CStore } from './useI2CLogic';
import * as THREE from 'three';
import InfoPoints from './InfoPoints';

/**
 * \brief Renders the complete I²C bus scene including devices, wires, waveform, particles, and info points.
 */
export default function I2CScene() {
    const bitDurationRef = useRef(0);
    const { busPullupEnabled } = useI2CStore();

    const i2cInfoPoints = [
        {
            position: [-6, -0.5, 1] as [number, number, number],
            title: 'I²C Master Device',
            description:
                "I'm the master controller that initiates all communication on the bus. I generate the clock signal (SCL) and control when data transfers start and stop. I can communicate with multiple slave devices by addressing them individually.",
            color: '#ff60a0',
        },

        {
            position: [-1.5, -0.5, 1] as [number, number, number],
            title: 'I²C Slave Device (0x68)',
            description:
                "I'm a slave device with address 0x68. I listen to the bus and only respond when the master addresses me. I can acknowledge data reception and send data when requested. Common examples: accelerometers, gyroscopes, RTCs.",
            color: '#60a0ff',
        },

        {
            position: [3, -0.5, 1] as [number, number, number],
            title: 'I²C Slave Device (0x3C)',
            description:
                "I'm a slave device with address 0x3C. Each slave has a unique 7-bit address, allowing up to 128 devices on the same bus (though some addresses are reserved). Common examples: OLED displays, temperature sensors, EEPROMs.",
            color: '#60a0ff',
        },

        {
            position: [-1, 1.5, -0.8] as [number, number, number],
            title: 'SDA Line (Serial Data)',
            description:
                "I'm the bidirectional data line. Both master and slaves can drive me using open-drain outputs. I carry addresses, data bytes, and acknowledgment bits. I MUST have a pull-up resistor to function - without it, I can only be pulled LOW, never HIGH!",
            color: '#4ade80',
        },

        {
            position: [-1, 1.2, 0] as [number, number, number],
            title: 'SCL Line (Serial Clock)',
            description:
                "I'm the clock line controlled by the master. I synchronize all data transfers - data on SDA is only valid when I'm stable (HIGH or LOW), and changes when I transition. Slaves can hold me LOW to pause the master (clock stretching) if they need more time to process data.",
            color: '#fbbf24',
        },

        {
            position: [0, 0.8, 0.8] as [number, number, number],
            title: 'Ground Connection (Common Reference)',
            description:
                "I'm the common ground connecting all devices. I provide the 0V reference that makes voltage levels meaningful. Without me, devices can't agree on what 'HIGH' and 'LOW' mean - I'm absolutely essential for any digital communication!",
            color: '#6b7280',
        },

        {
            position: [3, 2.2, -0.4] as [number, number, number],
            title: 'Pull-up Resistors (Critical!)',
            description:
                "I'm ESSENTIAL for I²C to work! I pull SDA and SCL HIGH to VCC (usually 3.3V or 5V) when no device is driving them LOW. All I²C devices use open-drain outputs - they can only pull LOW, never HIGH. Without me, the bus stays at 0V and communication fails. Typical values: 4.7kΩ for 100kHz, 2.2kΩ for 400kHz. Too high = slow rise times and communication errors. Too low = excessive current draw.",
            color: '#ef4444',
        },

        {
            position: [-6, -0.5, 0] as [number, number, number],
            title: 'Master Microcontroller',
            description:
                "I'm the brain of the master device. I contain the I²C peripheral hardware that generates START/STOP conditions, transmits addresses and data, and handles the protocol timing. I typically run at 16MHz-400MHz but generate much slower I²C clock speeds (100kHz-3.4MHz).",
            color: '#9370ad',
        },

        {
            position: [-1.5, -0.5, 0] as [number, number, number],
            title: 'Slave Sensor Chip',
            description:
                "I'm a sensor chip with built-in I²C hardware. I constantly monitor the SDA line for my address (0x68). When I hear it, I wake up and participate in the communication. I might be a temperature sensor, accelerometer, or any other I²C peripheral.",
            color: '#60a5d4',
        },

        {
            position: [0, -0.3, -0.8] as [number, number, number],
            title: 'Connection Pins',
            description:
                "I'm one of the physical connector pins on the board. Green pins are for SDA (data), yellow for SCL (clock), and gray for GND (ground). These pins allow easy connection and disconnection of I²C devices without soldering.",
            color: '#4ade80',
        },
    ];

    const sdaPoints = [
        new THREE.Vector3(-4.5, 1.5, -0.8),
        new THREE.Vector3(-4.5, 1.5, -0.8),
        new THREE.Vector3(-1, 1.5, -0.8),
        new THREE.Vector3(0, 1.5, -0.8),
        new THREE.Vector3(3.5, 1.5, -0.8),
        new THREE.Vector3(4.5, 1.5, -0.8),
        new THREE.Vector3(4.5, 1.5, -0.8),
    ];

    const sclPoints = [
        new THREE.Vector3(-4.5, 1.2, 0),
        new THREE.Vector3(-4.5, 1.2, 0),
        new THREE.Vector3(-1, 1.2, 0),
        new THREE.Vector3(0, 1.2, 0),
        new THREE.Vector3(3.5, 1.2, 0),
        new THREE.Vector3(4.5, 1.2, 0),
        new THREE.Vector3(4.5, 1.2, 0),
    ];

    const gndPoints = [
        new THREE.Vector3(-4.5, 0.8, 0.8),
        new THREE.Vector3(-4.5, 0.8, 0.8),
        new THREE.Vector3(-1, 0.8, 0.8),
        new THREE.Vector3(0, 0.8, 0.8),
        new THREE.Vector3(3.5, 0.8, 0.8),
        new THREE.Vector3(4.5, 0.8, 0.8),
        new THREE.Vector3(4.5, 0.8, 0.8),
    ];

    const masterSdaDrop = [
        new THREE.Vector3(-4.5, -0.5, -0.8),
        new THREE.Vector3(-4.5, 0.5, -0.8),
        new THREE.Vector3(-4.5, 1.5, -0.8),
    ];
    const masterSclDrop = [
        new THREE.Vector3(-4.5, -0.5, 0),
        new THREE.Vector3(-4.5, 0.35, 0),
        new THREE.Vector3(-4.5, 1.2, 0),
    ];
    const masterGndDrop = [
        new THREE.Vector3(-4.5, -0.5, 0.8),
        new THREE.Vector3(-4.5, 0.15, 0.8),
        new THREE.Vector3(-4.5, 0.8, 0.8),
    ];

    const slave1SdaDrop = [
        new THREE.Vector3(0, -0.5, -0.8),
        new THREE.Vector3(0, 0.5, -0.8),
        new THREE.Vector3(0, 1.5, -0.8),
    ];
    const slave1SclDrop = [
        new THREE.Vector3(0, -0.5, 0),
        new THREE.Vector3(0, 0.35, 0),
        new THREE.Vector3(0, 1.2, 0),
    ];
    const slave1GndDrop = [
        new THREE.Vector3(0, -0.5, 0.8),
        new THREE.Vector3(0, 0.15, 0.8),
        new THREE.Vector3(0, 0.8, 0.8),
    ];

    const slave2SdaDrop = [
        new THREE.Vector3(4.5, -0.5, -0.8),
        new THREE.Vector3(4.5, 0.5, -0.8),
        new THREE.Vector3(4.5, 1.5, -0.8),
    ];
    const slave2SclDrop = [
        new THREE.Vector3(4.5, -0.5, 0),
        new THREE.Vector3(4.5, 0.35, 0),
        new THREE.Vector3(4.5, 1.2, 0),
    ];
    const slave2GndDrop = [
        new THREE.Vector3(4.5, -0.5, 0.8),
        new THREE.Vector3(4.5, 0.15, 0.8),
        new THREE.Vector3(4.5, 0.8, 0.8),
    ];

    return (
        <group>
            <I2CBoard type="master" position={[-6, -0.85, 0]} label="MASTER" />

            <I2CBoard
                type="slave"
                position={[-1.5, -0.85, 0]}
                label="SLAVE"
                address="0x68"
            />

            <I2CBoard
                type="slave"
                position={[3, -0.85, 0]}
                label="SLAVE"
                address="0x3C"
            />

            <I2CWire points={sdaPoints} color={0x4ade80} label="SDA" />
            <I2CWire points={sclPoints} color={0xfbbf24} label="SCL" />
            <I2CWire points={gndPoints} color={0x6b7280} label="GND" />

            <I2CWire points={masterSdaDrop} color={0x4ade80} />
            <I2CWire points={masterSclDrop} color={0xfbbf24} />
            <I2CWire points={masterGndDrop} color={0x6b7280} />

            <I2CWire points={slave1SdaDrop} color={0x4ade80} />
            <I2CWire points={slave1SclDrop} color={0xfbbf24} />
            <I2CWire points={slave1GndDrop} color={0x6b7280} />

            <I2CWire points={slave2SdaDrop} color={0x4ade80} />
            <I2CWire points={slave2SclDrop} color={0xfbbf24} />
            <I2CWire points={slave2GndDrop} color={0x6b7280} />

            {busPullupEnabled && (
                <group position={[3, 2.5, 0]}>
                    <mesh
                        position={[0, -0.5, -0.8]}
                        rotation={[0, 0, Math.PI / 2]}
                    >
                        <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
                        <meshStandardMaterial
                            color={0xd4a574}
                            roughness={0.4}
                        />
                    </mesh>
                    <mesh
                        position={[0, -0.5, 0]}
                        rotation={[0, 0, Math.PI / 2]}
                    >
                        <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
                        <meshStandardMaterial
                            color={0xd4a574}
                            roughness={0.4}
                        />
                    </mesh>
                    <mesh position={[0, -0.37, -0.4]}>
                        <boxGeometry args={[0.3, 0.1, 1]} />
                        <meshStandardMaterial
                            color={0xef4444}
                            emissive={0xef4444}
                            emissiveIntensity={0.3}
                        />
                    </mesh>
                    <mesh position={[0, -0.8, -0.8]} rotation={[0, 0, 0]}>
                        <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
                        <meshStandardMaterial color={0x4ade80} />
                    </mesh>
                    <mesh position={[0, -0.9, 0]} rotation={[0, 0, 0]}>
                        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
                        <meshStandardMaterial color={0xfbbf24} />
                    </mesh>
                </group>
            )}

            <I2CParticles />

            <I2CWaveform position={[0, 6, -2]} />

            <InfoPoints
                points={i2cInfoPoints}
                busPullupEnabled={busPullupEnabled}
            />
        </group>
    );
}
