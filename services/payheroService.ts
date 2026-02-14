import axios from 'axios';

/**
 * PayHero Payment Gateway Service
 * Handles STK Push initiation and transaction status checks via PayHero API.
 * Docs: https://docs.payhero.co.ke
 *
 * When SANDBOX_MODE is true the service simulates successful STK pushes
 * locally so development can continue while the merchant account is activated.
 */

const PAYHERO_BASE_URL = 'https://backend.payhero.co.ke/api/v2';

// Auth token from PayHero dashboard → API Settings
// Format: Basic <base64-encoded-credentials>
const PAYHERO_AUTH_TOKEN = 'a2pKbndjTHhtNWYybzk3WUhLY1Q6c0YzUUd0OTNmQkhoMjFKRTh6eHBOMWl0TkxhT2JSOGpVMTE4Tjd5cA==';

// Set to false once your PayHero merchant account is activated and
// you have a registered payment channel.
const SANDBOX_MODE = true;

const payheroApi = axios.create({
    baseURL: PAYHERO_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${PAYHERO_AUTH_TOKEN}`,
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
 * In sandbox mode, simulates the STK push flow.
 */
export async function initiateSTKPush(
    amount: number,
    phone: string,
    channelId: number = 133,
    callbackUrl: string = 'https://example.com/callback'
): Promise<PayHeroSTKResponse> {
    const reference = `MA3PAY-${Date.now()}`;

    // ── Sandbox simulation ──────────────────────────────────────────
    if (SANDBOX_MODE) {
        console.log('[PayHero Sandbox] Simulating STK Push:', { amount, phone: normalisePhone(phone), reference });
        await new Promise(r => setTimeout(r, 1500)); // Simulate network delay
        // Store in session so checkTransactionStatus can find it
        sessionStorage.setItem(`ph_${reference}`, JSON.stringify({
            status: 'QUEUED',
            amount,
            phone: normalisePhone(phone),
            created: Date.now(),
        }));
        return {
            success: true,
            status: 'QUEUED',
            reference,
            merchant_reference: reference,
            checkout_request_id: `ws_CO_SANDBOX_${Date.now()}`,
        };
    }

    // ── Live PayHero API ────────────────────────────────────────────
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
            checkout_request_id: response.data.CheckoutRequestID,
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
 * Check the status of a PayHero transaction by reference.
 * Endpoint: GET /transaction-status?reference=...
 * In sandbox mode, simulates confirmation after a short delay.
 */
export async function checkTransactionStatus(reference: string): Promise<PayHeroStatusResponse> {
    // ── Sandbox simulation ──────────────────────────────────────────
    if (SANDBOX_MODE) {
        const stored = sessionStorage.getItem(`ph_${reference}`);
        if (stored) {
            const data = JSON.parse(stored);
            const elapsed = Date.now() - data.created;
            // Simulate: QUEUED for first 5s, then SUCCESS
            if (elapsed > 5000) {
                console.log('[PayHero Sandbox] Transaction confirmed:', reference);
                return {
                    success: true,
                    status: 'SUCCESS',
                    amount: data.amount,
                    phone_number: data.phone,
                    provider_reference: `SANDBOX_${reference}`,
                };
            }
            return { success: true, status: 'QUEUED' };
        }
        return { success: false, status: 'FAILED', error: 'Reference not found in sandbox' };
    }

    // ── Live PayHero API ────────────────────────────────────────────
    try {
        const response = await payheroApi.get(`/transaction-status?reference=${encodeURIComponent(reference)}`);

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
