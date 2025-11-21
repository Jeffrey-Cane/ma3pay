import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle, Loader2, X } from 'lucide-react';
import { TransactionType, PaymentStatus } from '../types';

interface MpesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess: (transaction: any) => void;
}

export const MpesaModal: React.FC<MpesaModalProps> = ({ isOpen, onClose, amount, onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setPhoneNumber('');
    }
  }, [isOpen]);

  const handlePay = () => {
    if (!phoneNumber.startsWith('254') && !phoneNumber.startsWith('07') && !phoneNumber.startsWith('01')) {
        alert("Please enter a valid phone number");
        return;
    }
    
    setStatus('processing');
    
    // Simulate API delay
    setTimeout(() => {
      setStatus('success');
      // Simulate STK Push confirmation delay
      setTimeout(() => {
        onSuccess({
            id: `MP${Math.floor(Math.random() * 1000000)}`,
            type: TransactionType.DEPOSIT,
            amount: amount,
            date: new Date().toISOString(),
            description: 'M-Pesa Top Up',
            status: PaymentStatus.SUCCESS
        });
        onClose();
      }, 1500);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all scale-100">
        <div className="bg-[#4CAF50] p-6 text-white text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
                <X size={24} />
            </button>
          <h2 className="text-2xl font-bold tracking-tight">Lipa na M-Pesa</h2>
          <p className="text-sm opacity-90 mt-1">Paybill: 522522</p>
        </div>

        <div className="p-6 space-y-6">
          {status === 'idle' && (
            <>
              <div className="text-center">
                <p className="text-gray-500 text-sm uppercase tracking-wide">Amount to Pay</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">KES {amount}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    placeholder="0712 345 678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handlePay}
                className="w-full bg-[#4CAF50] hover:bg-[#43a047] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-95"
              >
                Pay KES {amount}
              </button>
            </>
          )}

          {status === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                 <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-[#4CAF50] rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Check your phone</h3>
                <p className="text-gray-500 text-sm mt-1">Enter your M-Pesa PIN to complete the transaction.</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Payment Successful!</h3>
                <p className="text-gray-500 text-sm mt-1">Your tokens have been added.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
