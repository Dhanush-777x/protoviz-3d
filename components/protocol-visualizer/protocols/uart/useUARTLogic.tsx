/**
 * \file useUARTLogic.tsx
 * \brief Global UART state management and transmission logic.
 *
 * This file implements the core UART simulation logic using Zustand.
 * It manages transmission state, bit-level timing, waveform generation,
 * tutorial flow control, and error scenarios such as wire shorting.
 */

import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type TutorialStep =
  | 'disabled'
  | 'set-text'
  | 'set-baud'
  | 'click-transmit'
  | 'start-bit'
  | 'data-bits'
  | 'stop-bit'
  | 'idle-state'
  | 'deep-dive';

export type StatusType =
  | 'idle'
  | 'transmitting'
  | 'success'
  | 'error'
  | 'paused'
  | 'resumed';

interface UARTStatus {
  text: string;
  type: StatusType;
}

interface UARTState {
  baudRate: number;
  data: string;
  previewData?: string;
  isTransmitting: boolean;
  isPaused: boolean;
  currentBit: number;
  totalBits: number;
  bitStream: number[];
  waveformData: number[];
  wireShorted: boolean;
  status: UARTStatus;
  bitTimer: number;

  tutorialEnabled: boolean;
  tutorialStep: TutorialStep;
  tutorialHold: boolean;

  setData: (data: string) => void;
  setBaudRate: (baudRate: number) => void;
  setTutorialStep: (step: TutorialStep) => void;
  setTutorialEnabled: (v: boolean) => void;
  setTutorialHold: (v: boolean) => void;
  startOrToggleTransmission: () => void;
  toggleWireShort: () => void;
  togglePause: () => void;
  pauseTransmission: () => void;
  resumeTransmission: () => void;
  advanceBit: () => void;
  updateTransmission: (delta: number) => void;
  resetTransmission: () => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function stringToBitStream(str: string): number[] {
  const bitStream: number[] = [];

  for (let charIndex = 0; charIndex < str.length; charIndex++) {
    const byte = str.charCodeAt(charIndex);

    bitStream.push(0); // Start bit
    for (let i = 0; i < 8; i++) {
      bitStream.push((byte >> i) & 1); // Data bits
    }
    bitStream.push(1); // Stop bit
  }

  return bitStream;
}

function truncateText(text: string, maxLength = 10) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

export const useUARTStore = create<UARTState>((set, get) => ({
  baudRate: 9600,
  data: '',
  previewData: undefined,
  isTransmitting: false,
  isPaused: false,
  currentBit: 0,
  totalBits: 0,
  bitStream: [],
  waveformData: [],
  wireShorted: false,
  bitTimer: 0,

  status: { text: 'Ready to transmit', type: 'idle' },

  tutorialEnabled: false,
  tutorialStep: 'disabled',
  tutorialHold: false,

  /* ---------------- Settings ---------------- */

  setBaudRate: (rate) => {
    set({
      baudRate: rate,
      status: { text: `Baud rate set to ${rate} bps`, type: 'idle' },
    });
  },

  setData: (data) => {
    set({ data: data ?? '' });
  },

  setTutorialEnabled: (v) => {
    set({
      tutorialEnabled: v,
      tutorialStep: v ? 'set-text' : 'disabled',
    });
  },

  setTutorialStep: (step) => {
    set({ tutorialStep: step });
  },

  setTutorialHold: (v) =>
    set((state) => ({
      tutorialHold: v,
      bitTimer: v ? 0 : state.bitTimer,
    })),

  /* ---------------- Transmission ---------------- */

  startOrToggleTransmission: () => {
    const { isTransmitting, isPaused, wireShorted } = get();
    const data = get().data.trim();

    if (wireShorted) {
      set({
        status: {
          text: 'Cannot transmit: wires are shorted',
          type: 'error',
        },
      });
      return;
    }

    if (data.length === 0) {
      set({
        status: {
          text: 'Enter text to transmit',
          type: 'error',
        },
      });
      return;
    }

    const previewData = truncateText(data);

    if (!isTransmitting) {
      const bitStream = stringToBitStream(data);

      set({
        bitStream,
        totalBits: bitStream.length,
        currentBit: 0,
        waveformData: [],
        isTransmitting: true,
        isPaused: false,
        bitTimer: 0,
        previewData,
        status: {
          text: `Transmitting "${previewData}" (0/${bitStream.length})`,
          type: 'transmitting',
        },
      });
      return;
    }

    if (isTransmitting && !isPaused) {
      set({
        isPaused: true,
        status: { text: 'Transmission paused', type: 'paused' },
      });
      return;
    }

    if (isTransmitting && isPaused) {
      set({
        isPaused: false,
        status: { text: 'Transmission resumed', type: 'resumed' },
      });
    }
  },

  toggleWireShort: () => {
    const { wireShorted, isTransmitting } = get();
    const newShortedState = !wireShorted;

    if (newShortedState && isTransmitting) {
      set({
        wireShorted: true,
        isTransmitting: false,
        isPaused: false,
        currentBit: 0,
        totalBits: 0,
        bitStream: [],
        waveformData: [],
        bitTimer: 0,
        previewData: undefined,
        status: {
          text: 'ERROR: Wires shorted',
          type: 'error',
        },
      });
    } else {
      set({
        wireShorted: newShortedState,
        status: newShortedState
          ? { text: 'ERROR: Wires shorted', type: 'error' }
          : { text: 'Ready to transmit', type: 'idle' },
      });
    }
  },

  advanceBit: () => {
    const {
      isTransmitting,
      isPaused,
      tutorialHold,
      tutorialEnabled,
      tutorialStep,
      currentBit,
      totalBits,
      bitStream,
      waveformData,
      previewData,
    } = get();

    if (!isTransmitting || isPaused || tutorialHold) return;

    if (currentBit < totalBits) {
      const bit = bitStream[currentBit];
      const nextBit = currentBit + 1;

      set({
        currentBit: nextBit,
        waveformData: [...waveformData, bit],
        status: {
          text: `Transmitting "${previewData}" (${nextBit}/${totalBits})`,
          type: 'transmitting',
        },
      });

      if (tutorialEnabled) {
        if (tutorialStep === 'click-transmit' && nextBit === 1)
          set({ tutorialHold: true });

        if (tutorialStep === 'data-bits' && nextBit === 9)
          set({ tutorialHold: true });

        if (tutorialStep === 'stop-bit' && nextBit === 10)
          set({ tutorialHold: true });
      }

      return;
    }

    set({
      isTransmitting: false,
      isPaused: false,
      previewData: undefined,
      status: {
        text: 'Transmission complete',
        type: 'success',
      },
    });
  },

  updateTransmission: (delta) => {
    const { isTransmitting, isPaused, baudRate, bitTimer, tutorialHold } =
      get();

    if (!isTransmitting || isPaused || tutorialHold) return;

    const VISUAL_SLOWDOWN = 1000;
    const bitDuration = 1 / baudRate;
    const visualBitDuration = bitDuration * VISUAL_SLOWDOWN;

    const newTimer = bitTimer + delta;

    if (newTimer >= visualBitDuration) {
      get().advanceBit();
      set({ bitTimer: newTimer - visualBitDuration });
    } else {
      set({ bitTimer: newTimer });
    }
  },

  pauseTransmission: () => {
    set({
      isPaused: true,
      status: { text: 'Transmission paused', type: 'paused' },
    });
  },

  resumeTransmission: () => {
    set({
      isPaused: false,
      status: { text: 'Transmission resumed', type: 'resumed' },
    });
  },

  togglePause: () => {
    const { isPaused } = get();
    set({
      isPaused: !isPaused,
      status: isPaused
        ? { text: 'Transmission resumed', type: 'resumed' }
        : { text: 'Transmission paused', type: 'paused' },
    });
  },

  resetTransmission: () => {
    set({
      isTransmitting: false,
      isPaused: false,
      currentBit: 0,
      totalBits: 0,
      bitStream: [],
      waveformData: [],
      bitTimer: 0,
      previewData: undefined,
      status: { text: 'Ready to transmit', type: 'idle' },
    });
  },
}));
