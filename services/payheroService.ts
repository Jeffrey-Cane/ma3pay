import axios from 'axios';

/**
 * PayHero Payment Gateway Service
 * Handles STK Push initiation and transaction status checks via PayHero API.
 * Docs: https://payhero.co.ke/docs
 */

const PAYHERO_BASE_URL = 'https://backend.payhero.co.ke/api/v2';
const PAYHERO_USERNAME = 'JpFhOsjxAZ8sb9MFlnRi';
const PAYHERO_ID = '4626';

// Basic Auth header: base64(username:id)
const PAYHERO_AUTH = btoa(`${PAYHERO_USERNAME}:${PAYHERO_ID}`);

const payheroApi = axios.create({
    baseURL: PAYHERO_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${PAYHERO_AUTH}`,
    },
});

export interface PayHeroSTKRequest {
    amount: number;
    phone_number: string;       // Format: 07XXXXXXXX or 254XXXXXXXX
    channel_id: number;         // PayHero channel ID
    provider: 'm-pesa';        // Payment provider
    external_reference: string; // Unique reference for the transaction
    callback_url: string;       // URL to receive payment notifications
}

export interface PayHeroSTKResponse {
    success: boolean;
    status: string;
    reference?: string;
    merchant_reference?: string;
    checkout_request_id?: string;
    error?: string;
    message?: string;
}

export interface PayHeroStatusResponse {
    success: boolean;
    status: string;                // 'QUEUED' | 'SUCCESS' | 'FAILED' | 'PENDING'
    amount?: number;
    phone_number?: string;
    provider_reference?: string;   // M-Pesa receipt number
    error?: string;
}

/**
 * Normalise phone to 2547XXXXXXXX format for PayHero
 */
function normalisePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-]/g, '');
    if (cleaned.startsWith('07') || cleaned.startsWith('01')) {
        cleaned = '254' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned;
    }
    return cleaned;
}

/**
 * Initiate an STK Push via PayHero
 */
export async function initiateSTKPush(
    amount: number,
    phone: string,
    channelId: number = 1258,
    callbackUrl: string = 'https://example.com/callback'
): Promise<PayHeroSTKResponse> {
    const reference = `MA3PAY-${Date.now()}`;
    const payload: PayHeroSTKRequest = {
        amount,
        phone_number: normalisePhone(phone),
        channel_id: channelId,
        provider: 'm-pesa',
        external_reference: reference,
        callback_url: callbackUrl,
    };

    try {
        const response = await payheroApi.post('/payments', payload);
        return {
            success: true,
            status: response.data.status || 'QUEUED',
            reference: response.data.reference,
            merchant_reference: reference,
            checkout_request_id: response.data.checkout_request_id,
        };
    } catch (error: any) {
        console.error('PayHero STK Push Error:', error.response?.data || error.message);
        return {
            success: false,
            status: 'FAILED',
            error: error.response?.data?.error_message
                || error.response?.data?.message
                || error.message
                || 'Failed to initiate payment',
        };
    }
}

/**
 * Check the status of a PayHero transaction by reference
 */
export async function checkTransactionStatus(reference: string): Promise<PayHeroStatusResponse> {
    try {
        const response = await payheroApi.get(`/payments?reference=${encodeURIComponent(reference)}`);

        return {
            success: true,
            status: response.data.status || 'PENDING',
            amount: response.data.amount,
            phone_number: response.data.phone_number,
            provider_reference: response.data.provider_reference,
        };
    } catch (error: any) {
        console.error('PayHero Status Check Error:', error.response?.data || error.message);
        return {
            success: false,
            status: 'FAILED',
            error: error.response?.data?.message || error.message || 'Status check failed',
        };
    }
}
