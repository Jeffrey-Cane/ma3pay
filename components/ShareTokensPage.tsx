import React, { useState } from 'react';
import { ArrowLeft, User, Coins, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { wallet } from '../services/api';

interface ShareTokensPageProps {
  onBack: () => void;
  onTransfer: (amount: number, recipient: string) => void;
  balance: number;
  isDark: boolean;
  lang: 'en' | 'sw';
}

export const ShareTokensPage: React.FC<ShareTokensPageProps> = ({ onBack, onTransfer, balance, isDark, lang }) => {
  const t = TRANSLATIONS[lang];
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleTransfer = async () => {
    const val = parseInt(amount);
    if (!recipient || recipient.length < 9) {
        setErrorMsg("Invalid phone number"); 
        return;
    }
    if (!val || val <= 0) {
        setErrorMsg("Invalid amount");
        return;
    }
    if (val > balance) {
        setErrorMsg(t.insufficientFunds);
        alert(t.insufficientFunds);
        return;
    }

    setErrorMsg('');
    setStatus('processing');
    
    try {
        await wallet.transfer(recipient, val);
        setStatus('success');
        // Trigger parent callback to update UI state
        onTransfer(val, recipient);
        
        setTimeout(() => {
            onBack();
        }, 2000);
    } catch (err: any) {
        console.error(err);
        setStatus('error');
        const msg = err.response?.data?.error || err.message || "Transfer failed. Please check connection.";
        setErrorMsg(msg);
        alert(`Transfer Failed: ${msg}`);
    }
  };

  if (status === 'success') {
      return (
        <div className={`h-full flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in zoom-in ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-center">{t.transferSuccess}</h2>
            <p className="text-gray-500">KES {amount} sent to {recipient}</p>
        </div>
      );
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`flex items-center gap-4 p-6 shadow-sm ${isDark ? 'bg-gray-800 border-b border-gray-700' : 'bg-white'}`}>
        <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}>
          <ArrowLeft />
        </button>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.shareTokens}</h2>
      </div>

      <div className="p-6 flex-1 space-y-6">
        {/* Balance Card */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-black text-white'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{t.balance}</p>
            <h3 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-white'}`}>KES {balance}</h3>
        </div>

        <div className="space-y-4">
            <div>
                <label className={`text-sm font-medium ml-1 block mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.recipientPhone}</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="tel"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="07XX XXX XXX"
                        className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                            isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-black'
                        }`}
                    />
                </div>
            </div>

            <div>
                <label className={`text-sm font-medium ml-1 block mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.enterAmount}</label>
                <div className="relative">
                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="KES 100"
                        className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                            isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-black'
                        }`}
                    />
                </div>
            </div>
        </div>

        {errorMsg && (
            <div className="bg-red-100 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm animate-pulse">
                <AlertCircle size={16} />
                {errorMsg}
            </div>
        )}

        <button
            onClick={handleTransfer}
            disabled={status === 'processing'}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
        >
             {status === 'processing' ? (
                 <Loader2 className="animate-spin" />
             ) : (
                <>
                    <Send size={18} />
                    <span>{t.transfer}</span>
                </>
             )}
        </button>
      </div>
    </div>
  );
};