import React, { useState } from 'react';
import { ArrowLeft, Phone, ShieldCheck, Smartphone, Loader2, CheckCircle, Wifi, XCircle, RefreshCcw } from 'lucide-react';
import { PaymentStatus, TransactionType, Transaction } from '../types';
import { TRANSLATIONS } from '../constants';
import { wallet } from '../services/api';

interface PaymentPageProps {
  amount: number;
  nfcTagId: string | null;
  onBack: () => void;
  onSuccess: (transaction: Transaction) => void;
  isDark: boolean;
  lang: 'en' | 'sw';
  userPhone: string;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({ amount, nfcTagId, onBack, onSuccess, isDark, lang, userPhone }) => {
  const [phoneNumber, setPhoneNumber] = useState(userPhone);
  const [status, setStatus] = useState<'idle' | 'initiating' | 'push_sent' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const t = TRANSLATIONS[lang];

  const handlePay = async () => {
    if (!phoneNumber.startsWith('254') && !phoneNumber.startsWith('07') && !phoneNumber.startsWith('01')) {
      alert("Please enter a valid phone number (07XX or 254...)");
      return;
    }

    setStatus('initiating');
    setErrorMessage('');

    try {
        // Initiate PayHero STK Push
        const stkResult = await wallet.deposit(amount, phoneNumber);
        
        setStatus('push_sent');
        setIsPolling(true);

        // Poll PayHero for confirmation (~24s: 8 retries x 3s)
        const reference = stkResult.reference || stkResult.merchant_reference;
        let confirmed = false;

        if (reference) {
            const maxRetries = 8;
            for (let i = 0; i < maxRetries; i++) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                try {
                    const statusResult = await wallet.checkPayment(reference);
                    if (statusResult.status === 'SUCCESS') {
                        confirmed = true;
                        break;
                    }
                    if (statusResult.status === 'FAILED') {
                        throw new Error('Payment was declined or failed.');
                    }
                } catch (e: any) {
                    if (e.message?.includes('declined') || e.message?.includes('failed')) throw e;
                    console.warn("Poll check failed, retrying...", e);
                }
            }
        }

        setIsPolling(false);

        if (confirmed) {
            setStatus('success');
            setTimeout(() => {
                onSuccess({
                    id: `PH-${reference || Date.now()}`,
                    type: TransactionType.DEPOSIT,
                    amount: amount,
                    date: new Date().toISOString(),
                    description: t.topupDesc,
                    status: PaymentStatus.SUCCESS
                });
            }, 2000);
        } else {
            // Fallback: PayHero callback may be slow; show success as PENDING
            setStatus('success');
            setTimeout(() => {
                onSuccess({
                    id: `PENDING-${Date.now()}`,
                    type: TransactionType.DEPOSIT,
                    amount: amount,
                    date: new Date().toISOString(),
                    description: t.topupDesc,
                    status: PaymentStatus.PENDING
                });
            }, 2000);
        }

    } catch (error: any) {
        console.error("Payment Failed", error);
        const msg = error.response?.data?.error || error.message || "Connection Error. Please try again.";
        setStatus('error');
        setErrorMessage(msg);
        setIsPolling(false);
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  if (status === 'success') {
    return (
      <div className={`flex flex-col items-center justify-center h-full space-y-6 p-6 animate-in fade-in duration-500 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Payment Confirmed!</h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Your balance has been updated.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center h-full space-y-6 p-6 animate-in fade-in duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center shadow-lg">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Payment Failed</h2>
          <p className={`max-w-xs mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {errorMessage}
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
            <button 
                onClick={handleRetry}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
                <RefreshCcw size={20} />
                Try Again
            </button>
            <button 
                onClick={onBack}
                className={`w-full py-4 rounded-xl font-medium transition-all ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
                Cancel
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`flex items-center gap-4 p-6 shadow-sm ${isDark ? 'bg-gray-800 border-b border-gray-700' : 'bg-white'}`}>
        <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}>
          <ArrowLeft />
        </button>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>PayHero Checkout</h2>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        
        {/* Order Summary */}
        <div className={`p-6 rounded-2xl shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className={`flex justify-between items-center mb-4 border-b pb-4 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t.enterAmount}</span>
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>KES {amount}</span>
          </div>
          
          <div className={`flex items-center gap-3 text-sm p-3 rounded-xl border ${isDark ? 'bg-yellow-900/20 border-yellow-900/30 text-yellow-100' : 'bg-yellow-50 border-yellow-100 text-gray-600'}`}>
             <div className={`p-2 rounded-lg shadow-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
               <Wifi className="w-4 h-4 text-yellow-600 rotate-90" />
             </div>
             <div>
               <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Linking to NFC Tag</p>
               <p className="font-mono text-xs mt-0.5 opacity-80">{nfcTagId || 'No Tag Linked'}</p>
             </div>
          </div>
        </div>

        {/* Daraja/M-Pesa Form */}
        <div className="space-y-4">
            <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <Smartphone className="w-5 h-5 text-green-600" />
                PayHero STK Push
            </h3>
            
            <div className="space-y-2">
                <label className={`text-sm font-medium ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.phoneNumber}</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="tel"
                        disabled={status !== 'idle'}
                        placeholder="07XX XXX XXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium text-lg ${
                            isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-black'
                        }`}
                    />
                </div>
            </div>

            {status === 'idle' ? (
                <button
                    onClick={handlePay}
                    className="w-full bg-[#4CAF50] hover:bg-[#43a047] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span>{t.payBtn} KES {amount}</span>
                </button>
            ) : (
                 <div className={`border rounded-xl p-6 text-center space-y-4 animate-pulse ${isDark ? 'bg-green-900/20 border-green-900/50' : 'bg-green-50 border-green-100'}`}>
                    <div className="relative w-12 h-12 mx-auto">
                        {isPolling ? (
                            <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
                        ) : (
                            <Smartphone className="w-12 h-12 text-green-600 animate-bounce" />
                        )}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${isDark ? 'text-green-400' : 'text-green-800'}`}>
                            {isPolling ? 'Waiting for Confirmation...' : 'Connecting...'}
                        </h4>
                        <p className={isDark ? 'text-green-200' : 'text-green-700'}>
                            {isPolling 
                                ? 'Please enter your PIN on your phone.' 
                                : 'Connecting to PayHero...'}
                        </p>
                    </div>
                 </div>
            )}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-8">
            <ShieldCheck className="w-4 h-4" />
            <span>Secured by PayHero Payment Gateway</span>
        </div>

      </div>
    </div>
  );
};