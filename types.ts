export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  PAYMENT = 'FARE_PAYMENT', // Mapped to backend enum
  TRANSFER_OUT = 'TRANSFER', // Mapped to backend enum (logic determines in/out)
  TRANSFER_IN = 'TRANSFER_IN', // UI only helper
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  route?: string;
  status: PaymentStatus;
}

export interface UserProfile {
  name: string;
  phoneNumber: string;
  balance: number;
  nfcTagId: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Route {
  id: string;
  name: string;
  standardPrice: number;
  peakPrice: number;
}

export type Language = 'en' | 'sw';

// API Responses
export interface AuthResponse {
    message: string;
    token: string;
    user: {
        name: string;
        balance: number;
    }
}
