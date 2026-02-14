import axios from 'axios';
import { Transaction, TransactionType, PaymentStatus } from '../types';
import { initiateSTKPush, checkTransactionStatus } from './payheroService';

// Use localhost for local development.
// The backend runs on port 5000 (Vite uses 3000 for the frontend).
// Change this to your ngrok URL if testing on a real device/mobile.
const API_URL = 'https://51bf-41-89-164-2.ngrok-free.app';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    },
});

// Add JWT to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ma3pay_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const auth = {
    login: async (phone: string, pin: string) => {
        const response = await api.post('/auth/login', { phone, pin });
        return response.data;
    },
    signup: async (name: string, phone: string, pin: string) => {
        const response = await api.post('/auth/signup', { name, phone, pin });
        return response.data;
    },
};

export const wallet = {
    /**
     * Initiate a deposit via PayHero STK Push.
     * Returns the PayHero response with reference for status polling.
     */
    deposit: async (amount: number, phone: string) => {
        // 1. Call PayHero STK Push directly from the frontend
        const stkResult = await initiateSTKPush(amount, phone);
        if (!stkResult.success) {
            throw new Error(stkResult.error || 'PayHero STK Push failed');
        }
        // 2. Also notify our backend so it records the pending deposit
        try {
            await api.post('/wallet/deposit', { amount });
        } catch (e) {
            console.warn('Backend deposit notification failed (non-blocking):', e);
        }
        return stkResult;
    },
    /**
     * Poll PayHero for transaction confirmation by reference
     */
    checkPayment: async (reference: string) => {
        return await checkTransactionStatus(reference);
    },
    transfer: async (recipientPhone: string, amount: number) => {
        const response = await api.post('/wallet/transfer', { recipientPhone, amount });
        return response.data;
    },
    getActivity: async (): Promise<Transaction[]> => {
        const response = await api.get('/wallet/activity');
        
        // Safety Check: Ensure response is an array
        // This prevents crashes if the server returns HTML (e.g., 404 page, ngrok error)
        if (!Array.isArray(response.data)) {
            console.error("Invalid API Response:", response.data);
            return [];
        }

        // Map backend transaction format to frontend interface
        return response.data.map((tx: any) => ({
            id: tx.id.toString(),
            type: tx.type as TransactionType, // Backend returns DEPOSIT, TRANSFER, FARE_PAYMENT
            amount: Math.abs(tx.amount), // Ensure positive for display, sign handled by type
            date: tx.createdAt,
            description: tx.description,
            status: PaymentStatus.SUCCESS, // Assumed success if in history
            // Logic to determine if a transfer is IN or OUT based on amount sign
            // Backend logic: OUT is negative, IN is positive
            isNegative: tx.amount < 0
        })).map((tx: any) => {
             // Refine Transfer types
             let finalType = tx.type;
             if(tx.type === 'TRANSFER') {
                 finalType = tx.isNegative ? TransactionType.TRANSFER_OUT : TransactionType.TRANSFER_IN;
             }
             return {
                 ...tx,
                 type: finalType
             };
        });
    },
};

export const matatus = {
    getAll: async () => {
        const response = await api.get('/matatus');
        return response.data;
    },
    postReview: async (matatuId: string, rating: number, comment: string, tags: string) => {
        const response = await api.post(`/matatus/${matatuId}/reviews`, { rating, comment, tags });
        return response.data;
    }
};

export default api;