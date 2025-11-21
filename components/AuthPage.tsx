import React, { useState } from 'react';
import { Bus, User, Phone, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { TRANSLATIONS } from '../constants';
import { auth } from '../services/api';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
  isDark: boolean;
  lang: 'en' | 'sw';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, isDark, lang }) => {
  const t = TRANSLATIONS[lang];
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (isLoginMode) {
            // Real Login
            const data = await auth.login(phone, pin);
            
            localStorage.setItem('ma3pay_token', data.token);
            
            // Construct user profile from response
            const userProfile: UserProfile = {
                name: data.user.name,
                phoneNumber: phone,
                balance: data.user.balance,
                nfcTagId: null // We will fetch/simulate this later as backend doesn't return it in login
            };
            
            onLogin(userProfile);
        } else {
            // Real Signup
            const signupRes = await auth.signup(name, phone, pin);
            if(signupRes.userId) {
                // Auto login after signup
                 const loginRes = await auth.login(phone, pin);
                 localStorage.setItem('ma3pay_token', loginRes.token);
                 
                 const userProfile: UserProfile = {
                    name: name,
                    phoneNumber: phone,
                    balance: 0,
                    nfcTagId: null
                };
                onLogin(userProfile);
            }
        }
    } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || "Authentication failed. Please check your connection.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-yellow-50 text-gray-900'}`}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl ${isDark ? 'bg-yellow-500 text-black' : 'bg-black text-yellow-500'}`}>
            <Bus size={40} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Ma3Pay Eldoret</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {lang === 'en' ? 'Seamless travel in the City of Champions' : 'Usafiri rahisi mjini Eldoret'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={`p-8 rounded-3xl shadow-2xl space-y-6 transition-colors duration-300 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{isLoginMode ? t.loginTitle : t.registerTitle}</h2>
              <button 
                type="button"
                onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setError('');
                    setName('');
                    setPin('');
                }}
                className="text-xs text-yellow-600 hover:text-yellow-500 font-medium mt-2"
              >
                  {isLoginMode ? t.switchRegister : t.switchLogin}
              </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-pulse">
                <AlertCircle size={16} />
                {error}
            </div>
          )}
          
          <div className="space-y-4">
            {/* Name Field - Only show in Register Mode */}
            {!isLoginMode && (
                <div className="relative animate-in fade-in slide-in-from-top-2">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder={t.name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-yellow-500 transition-all ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                    required={!isLoginMode}
                />
                </div>
            )}

            {/* Phone Field */}
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                placeholder={t.phoneNumber}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-yellow-500 transition-all ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
                required
              />
            </div>

            {/* PIN Field */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                placeholder={t.pin}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-yellow-500 transition-all ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-yellow-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
                <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>{t.processing}</span>
                </>
            ) : (
                <>
                    <span>{isLoginMode ? t.login : t.register}</span>
                    <ArrowRight size={18} />
                </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
