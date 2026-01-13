/**
 * \file useI2CLogic.ts
 * \brief Zustand store managing I²C protocol state, timing, and tutorial flow.
 */

import { create } from 'zustand';

export type I2CState =
    | 'idle'
    | 'start'
    | 'address'
    | 'ack'
    | 'rw'
    | 'nack'
    | 'data'
    | 'stop';

export type TutorialStep =
    | 'disabled'
    | 'enable-pullups'
    | 'set-address'
    | 'set-data'
    | 'click-transmit'
    | 'start-condition'
    | 'address-byte'
    | 'ack-bit'
    | 'data-byte'
    | 'stop-condition'
    | 'deep-dive';

export interface TaggedBit {
    sda: 0 | 1;
    scl: 'static' | 'pulse';
    state: string;
    label?: string;
}

export type StatusType =
    | 'idle'
    | 'transmitting'
    | 'success'
    | 'error'
    | 'paused'
    | 'resumed';

interface Status {
    text: string;
    type: StatusType;
}

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

interface I2CStore {
    displayClockFrequency: number;

    internalClockFrequency: number;
    selectedSlaveAddress: number;
    busPullupEnabled: boolean;
    transmissionDirection: 'write' | 'read' | null;
    isTransmitting: boolean;
    isPaused: boolean;
    currentState: I2CState;
    currentBitIndex: number;
    bitTimer: number;
    dataToSend: number[];
    fullTaggedBitSequence: TaggedBit[];
    totalBits: number;
    totalBytes: number;
    waveformData: TaggedBit[];
    status: Status;

    tutorialEnabled: boolean;
    tutorialStep: TutorialStep;
    tutorialHold: boolean;
    tutorialWaveformStepIndex: number;

    setClockFrequency: (displayFreq: number) => void;
    setSelectedSlaveAddress: (addr: number) => void;
    setBusPullupEnabled: (enabled: boolean) => void;
    startTransmission: (data: number[], direction: 'write' | 'read') => void;
    togglePause: () => void;
    reset: () => void;
    updateTransmission: (delta: number) => void;
    advanceBit: () => void;

    setTutorialEnabled: (v: boolean) => void;
    setTutorialStep: (step: TutorialStep) => void;
    setTutorialHold: (v: boolean) => void;
}

const VALID_SLAVE_ADDRESSES = [0x68, 0x3c];

function countActualBits(sequence: TaggedBit[]): number {
    return sequence.filter((step) => step.scl === 'pulse').length;
}

export function getBitsTransferred(waveformData: TaggedBit[]): number {
    return waveformData.filter((step) => step.scl === 'pulse').length;
}

/**
 * \brief Builds the full tagged I²C bit sequence for a transaction.
 */
function buildI2CSequence(
    slaveAddr: number,
    dataBytes: number[],
    direction: 'write' | 'read'
): TaggedBit[] {
    const sequence: TaggedBit[] = [];
    const rwBit = direction === 'read' ? 1 : 0;

    sequence.push({ sda: 1, scl: 'static', state: 'start_1' });
    sequence.push({ sda: 0, scl: 'static', state: 'start_2' });

    for (let i = 6; i >= 0; i--) {
        const bit = ((slaveAddr >> i) & 1) as 0 | 1;
        sequence.push({
            sda: bit,
            scl: 'pulse',
            state: 'address_bit',
        });
    }

    sequence.push({
        sda: rwBit as 0 | 1,
        scl: 'pulse',
        state: 'rw_bit',
    });

    sequence.push({ sda: 0, scl: 'pulse', state: 'ack' });

    dataBytes.forEach((byte) => {
        for (let i = 7; i >= 0; i--) {
            const bit = ((byte >> i) & 1) as 0 | 1;
            sequence.push({ sda: bit, scl: 'pulse', state: 'data_bit' });
        }

        sequence.push({ sda: 0, scl: 'pulse', state: 'ack' });
    });

    sequence.push({ sda: 0, scl: 'static', state: 'stop_1' });
    sequence.push({ sda: 1, scl: 'static', state: 'stop_2' });

    return sequence;
}

export const useI2CStore = create<I2CStore>((set, get) => ({
    displayClockFrequency: 100000,
    internalClockFrequency: 5000,
    selectedSlaveAddress: 0x68,
    busPullupEnabled: true,
    transmissionDirection: null,
    isTransmitting: false,
    isPaused: false,
    currentState: 'idle',
    currentBitIndex: 0,
    bitTimer: 0,
    dataToSend: [],
    fullTaggedBitSequence: [],
    totalBits: 0,
    waveformData: [],
    totalBytes: 0,
    status: { text: 'Bus idle • Ready to transmit', type: 'idle' },

    tutorialEnabled: false,
    tutorialStep: 'disabled',
    tutorialHold: false,

    tutorialWaveformStepIndex: 0,

    /**
     * \brief Sets the I²C clock frequency and maps it to an internal timing value.
     */
    setClockFrequency: (displayFreq) => {
        let internalFreq = 10000;
        if (displayFreq === 100000) internalFreq = 5000;
        else if (displayFreq === 400000) internalFreq = 10000;
        else if (displayFreq === 1000000) internalFreq = 14000;
        else if (displayFreq === 3400000) internalFreq = 18000;

        set({
            displayClockFrequency: displayFreq,
            internalClockFrequency: internalFreq,
            bitTimer: 0,
        });
    },

    /**
     * \brief Updates the currently selected I²C slave address.
     */
    setSelectedSlaveAddress: (addr) => set({ selectedSlaveAddress: addr }),

    /**
     * \brief Enables or disables I²C bus pull-up resistors and updates bus status.
     */
    setBusPullupEnabled: (enabled) =>
        set({
            busPullupEnabled: enabled,
            status: enabled
                ? { text: 'Pull-ups enabled • Bus ready', type: 'idle' }
                : { text: 'ERROR: Pull-ups disabled', type: 'error' },
        }),

    /**
     * \brief Initializes and starts an I²C read or write transmission.
     */
    startTransmission: (data, direction) => {
        const {
            busPullupEnabled,
            selectedSlaveAddress,
            isTransmitting,
            isPaused,
        } = get();

        if (!busPullupEnabled) {
            set({
                status: {
                    text: 'Cannot transmit: Pull-ups disabled',
                    type: 'error',
                },
            });
            return;
        }

        if (!VALID_SLAVE_ADDRESSES.includes(selectedSlaveAddress)) {
            set({
                status: {
                    text: `No ACK: Slave 0x${selectedSlaveAddress.toString(16).toUpperCase()} not responding`,
                    type: 'error',
                },
            });
            return;
        }

        if (isTransmitting && isPaused) {
            set({
                isPaused: false,
                status: { text: 'Transmission resumed', type: 'resumed' },
            });
            return;
        }

        if (isTransmitting) {
            return;
        }

        const sequence = buildI2CSequence(
            selectedSlaveAddress,
            data,
            direction
        );

        const totalBits = countActualBits(sequence);

        console.log('I2C TX bytes:', data);
        console.log('I2C TX bit count:', totalBits);

        set({
            isTransmitting: true,
            isPaused: false,
            currentState: 'start',
            currentBitIndex: 0,
            bitTimer: 0,
            dataToSend: data,
            fullTaggedBitSequence: sequence,
            totalBytes: data.length,
            totalBits,
            waveformData: [],
            transmissionDirection: direction,
            status: {
                text: `${direction === 'write' ? 'Writing' : 'Reading'} ${
                    data.length
                } byte(s)... (bit 0/${totalBits})`,
                type: 'transmitting',
            },
        });
    },

    /**
     * \brief Toggles pause and resume state of an active I²C transmission.
     */
    togglePause: () => {
        const { isPaused, isTransmitting } = get();
        if (!isTransmitting) return;

        set({
            isPaused: !isPaused,
            status: isPaused
                ? { text: 'Transmission resumed', type: 'resumed' }
                : { text: 'Transmission paused', type: 'paused' },
        });
    },

    /**
     * \brief Resets the I²C bus, transmission state, and waveform data.
     */
    reset: () =>
        set({
            isTransmitting: false,
            isPaused: false,
            currentState: 'idle',
            currentBitIndex: 0,
            bitTimer: 0,
            fullTaggedBitSequence: [],
            totalBits: 0,
            waveformData: [],
            totalBytes: 0,
            transmissionDirection: null,
            status: { text: 'Bus idle • Ready to transmit', type: 'idle' },
        }),

    /**
     * \brief Advances I²C transmission timing based on elapsed frame time.
     */
    updateTransmission: (delta) => {
        const {
            isTransmitting,
            isPaused,
            internalClockFrequency,
            bitTimer,
            tutorialHold,
        } = get();
        if (!isTransmitting || isPaused || tutorialHold) return;

        const VISUAL_SLOWDOWN_FACTOR = 1000;
        const realBitDuration = 1 / internalClockFrequency;
        const visualBitDuration = realBitDuration * VISUAL_SLOWDOWN_FACTOR;
        const newTimer = bitTimer + delta;

        if (newTimer >= visualBitDuration) {
            get().advanceBit();
            set({ bitTimer: newTimer - visualBitDuration });
        } else {
            set({ bitTimer: newTimer });
        }
    },

    /**
     * \brief Advances the I²C state machine by one tagged bit.
     */
    advanceBit: () => {
        const {
            currentBitIndex,
            fullTaggedBitSequence,
            totalBits,
            waveformData,
            totalBytes,
            transmissionDirection,
            tutorialEnabled,
            tutorialStep,
            tutorialWaveformStepIndex,
        } = get();

        if (currentBitIndex >= fullTaggedBitSequence.length) {
            set({
                isTransmitting: false,
                isPaused: false,
                currentState: 'idle',
                bitTimer: 0,
                status: {
                    text: `Transmission complete • ${totalBytes} byte(s) transferred`,
                    type: 'success',
                },
            });
            return;
        }

        const currentBit = fullTaggedBitSequence[currentBitIndex];
        const nextIndex = currentBitIndex + 1;

        const bitsTransferredSoFar =
            waveformData.reduce(
                (count, step) => count + (step.scl === 'pulse' ? 1 : 0),
                0
            ) + (currentBit.scl === 'pulse' ? 1 : 0);

        let nextState: I2CState = 'data';

        if (currentBit.state === 'start_1' || currentBit.state === 'start_2') {
            nextState = 'start';
        } else if (
            currentBit.state === 'stop_1' ||
            currentBit.state === 'stop_2'
        ) {
            nextState = 'stop';
        } else if (currentBit.state === 'address_bit') {
            nextState = 'address';
        } else if (currentBit.state === 'rw_bit') {
            nextState = 'rw';
        } else if (currentBit.state === 'ack') {
            nextState = 'ack';
        }
        set({
            currentBitIndex: nextIndex,
            waveformData: [...waveformData, currentBit],
            currentState: nextState,
            status: {
                text: `${transmissionDirection === 'write' ? 'Writing' : 'Reading'} ${
                    totalBytes
                } byte(s)... (bit ${bitsTransferredSoFar}/${totalBits})`,
                type: 'transmitting',
            },
        });

        if (tutorialEnabled) {
            let nextHoldStep: TutorialStep | null = null;
            let pauseCondition = false;

            if (tutorialStep === 'click-transmit' && nextIndex === 1) {
                nextHoldStep = 'start-condition';
                pauseCondition = true;
            } else if (tutorialStep === 'start-condition' && nextIndex === 9) {
                nextHoldStep = 'address-byte';
                pauseCondition = true;
            } else if (tutorialStep === 'address-byte' && nextIndex === 10) {
                nextHoldStep = 'ack-bit';
                pauseCondition = true;
            } else if (tutorialStep === 'ack-bit' && nextIndex === 18) {
                nextHoldStep = 'data-byte';
                pauseCondition = true;
            } else if (
                tutorialStep === 'data-byte' &&
                nextIndex === fullTaggedBitSequence.length
            ) {
                nextHoldStep = 'stop-condition';
                pauseCondition = true;
            }

            if (pauseCondition && nextHoldStep) {
                const nextHoldStepIndex = stepOrder.indexOf(nextHoldStep);

                if (nextHoldStepIndex > tutorialWaveformStepIndex) {
                    set({
                        tutorialStep: nextHoldStep,
                        tutorialHold: true,

                        tutorialWaveformStepIndex: nextHoldStepIndex,
                    });
                    return;
                }

                if (nextHoldStepIndex === tutorialWaveformStepIndex) {
                    set({
                        tutorialStep: nextHoldStep,
                        tutorialHold: true,
                    });
                    return;
                }
            }
        }
    },

    /**
     * \brief Enables or disables the interactive I²C tutorial mode.
     */
    setTutorialEnabled: (v) => {
        const initialState = v ? 'enable-pullups' : 'disabled';
        const initialIndex = stepOrder.indexOf(initialState);
        set({
            tutorialEnabled: v,
            tutorialStep: initialState,

            tutorialWaveformStepIndex: initialIndex,
        });
    },

    /**
     * \brief Updates the current tutorial step and progression index.
     */
    setTutorialStep: (step) => {
        const stepIndex = stepOrder.indexOf(step);

        set((state) => {
            const newState: Partial<I2CStore> = { tutorialStep: step };

            if (stepIndex > state.tutorialWaveformStepIndex) {
                newState.tutorialWaveformStepIndex = stepIndex;
            }

            if (WAVEFORM_STEPS.includes(step)) {
                newState.tutorialHold = false;
            }

            return newState as I2CStore;
        });
    },

    /**
     * \brief Pauses or resumes waveform progression during tutorial checkpoints.
     */
    setTutorialHold: (v) =>
        set((state) => ({
            tutorialHold: v,
            bitTimer: v ? 0 : state.bitTimer,
        })),
}));
