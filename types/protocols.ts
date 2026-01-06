export type ProtocolType = 'uart' | 'i2c' | 'spi';

export interface UARTConfig {
  baudRate: number;
  dataBits: 8; // Fixed for now
  stopBits: 1; // Fixed for now
  parity: 'none'; // Fixed for now
}

export interface TransmissionState {
  isTransmitting: boolean;
  currentBit: number;
  totalBits: number;
  data: string;
  bitStream: number[];
  waveformData: number[];
}

export interface WireState {
  isShorted: boolean;
}
