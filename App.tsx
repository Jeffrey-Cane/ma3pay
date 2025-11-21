import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  CreditCard, 
  MapPin, 
  History, 
  User, 
  Plus, 
  Wifi, 
  ArrowRight,
  Wallet,
  Scan,
  QrCode,
  Keyboard,
  Moon,
  Sun,
  Languages,
  LogOut,
  Bus,
  CheckCircle,
  AlertCircle,
  Shield,
  Star,
  Share2,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ROUTES, MOCK_NFC_IDS, TRANSLATIONS } from './constants';
import { UserProfile, Transaction, TransactionType, PaymentStatus, Language } from './types';
import { TransactionHistory } from './components/TransactionHistory';
import { Assistant } from './components/Assistant';
import { PaymentPage } from './components/PaymentPage';
import { AuthPage } from './components/AuthPage';
import { RatingPage } from './components/RatingPage';
import { ShareTokensPage } from './components/ShareTokensPage';
import { wallet } from './services/api';

enum View {
  HOME,
  TOPUP,
  PAYMENT,
  SCAN,
  HISTORY,
  AUTH,
  ENROLL,
  RATING,
  SHARE
}

export default function App() {
  const [view, setView] = useState<View>(View.AUTH);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  
  // Global Settings
  const [isDark, setIsDark] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];
  
  // Top Up State
  const [selectedTopUpAmount, setSelectedTopUpAmount] = useState(0);

  // Scan/Redeem State
  const [scannedId, setScannedId] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'matched' | 'error'>('idle');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'qr' | 'code'>('qr'); // Only for discovery now
  const [manualCode, setManualCode] = useState('');
  
  // Enrollment State
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  // Fetch latest data from backend
  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
        const txs = await wallet.getActivity();
        setHistory(txs);
        // Note: Since the backend snippet doesn't have a dedicated "get profile" endpoint 
        // to fetch the exact current balance, we rely on optimistic local updates 
        // for the balance in the UI.
    } catch (e) {
        console.error("Failed to fetch history", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        refreshData();
    }
  }, [user, refreshData]);

  // Calculate spending data dynamically from history
  const spendingData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Initialize with 0
    const dataMap = new Map(days.map(day => [day, 0]));

    // Sum up payments from the last 7 days
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    history.forEach(tx => {
      if (tx.type === TransactionType.PAYMENT && tx.status === PaymentStatus.SUCCESS) {
        const txDate = new Date(tx.date);
        if (txDate >= oneWeekAgo && txDate <= now) {
          const dayName = days[txDate.getDay()];
          dataMap.set(dayName, (dataMap.get(dayName) || 0) + tx.amount);
        }
      }
    });

    // Format for Recharts (Mon-Sun order)
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return orderedDays.map(day => ({
      name: day,
      amount: dataMap.get(day) || 0
    }));
  }, [history]);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    setView(View.HOME);
  };

  const handleLogout = () => {
    localStorage.removeItem('ma3pay_token');
    setUser(null);
    setView(View.AUTH);
  };

  const handleTopUpSuccess = (transaction: Transaction) => {
    if (user) {
      // Optimistically update balance locally so the user sees the effect immediately
      setUser(prev => prev ? ({ ...prev, balance: prev.balance + transaction.amount }) : null);
      refreshData(); // Fetch latest history
      setView(View.HOME);
    }
  };

  const handleEnrollScan = () => {
    setEnrollStatus('scanning');
    setTimeout(() => {
      const newTagId = MOCK_NFC_IDS[Math.floor(Math.random() * MOCK_NFC_IDS.length)];
      if (user) {
        setUser({...user, nfcTagId: newTagId});
      }
      setEnrollStatus('success');
      setTimeout(() => {
        setView(View.HOME);
        setEnrollStatus('idle');
      }, 2000);
    }, 2000);
  }

  const handleTransferSuccess = (amount: number, recipient: string) => {
      if (!user) return;
      // Optimistic update: Subtract funds locally
      setUser(prev => prev ? ({ ...prev, balance: prev.balance - amount }) : null);
      refreshData();
  }

  // Discovery Scan (QR/Code)
  const handleDiscoverySimulate = () => {
    setScanStatus('scanning');
    setTimeout(() => {
      // Simulate finding a route
      const randomRoute = ROUTES[Math.floor(Math.random() * ROUTES.length)];
      setSelectedRouteId(randomRoute.id);
      setScanStatus('matched'); // Matatu found
    }, 1500);
  };

  const handleCodeSubmit = () => {
    if(manualCode.length === 3) {
        setScanStatus('scanning');
        setTimeout(() => {
            const randomRoute = ROUTES[Math.floor(Math.random() * ROUTES.length)];
            setSelectedRouteId(randomRoute.id);
            setScanStatus('matched');
        }, 1000);
    }
  }

  // Payment Authorization Scan (NFC)
  const handlePaymentAuthScan = () => {
    setScanStatus('scanning');
    setTimeout(() => {
        // 80% chance of matching the correct user tag for demo purposes
        const scannedTag = Math.random() > 0.2 ? user?.nfcTagId : 'WRONG_TAG';
        
        if (scannedTag === user?.nfcTagId) {
            handleRedeemToken();
        } else {
            setScanStatus('error');
        }
    }, 2000);
  }

  const handleRedeemToken = () => {
    const route = ROUTES.find(r => r.id === selectedRouteId);
    if (!route || !user) return;

    // Determine price (Simulate peak hours randomly for demo)
    const isPeak = Math.random() > 0.7;
    const price = isPeak ? route.peakPrice : route.standardPrice;

    if (user.balance < price) {
      alert("Insufficient balance! Please top up.");
      setScanStatus('matched');
      return;
    }

    const tx: Transaction = {
      id: `TR${Date.now()}`,
      type: TransactionType.PAYMENT,
      amount: price,
      date: new Date().toISOString(),
      description: `${t.trip} ${route.name.split('-')[1]}`,
      route: route.name,
      status: PaymentStatus.SUCCESS
    };

    // Optimistic update: Subtract fare locally
    setUser(prev => prev ? ({ ...prev, balance: prev.balance - price }) : null);
    setHistory(prev => [tx, ...prev]);
    
    setView(View.HOME);
    setScannedId('');
    setSelectedRouteId(null);
    setScanStatus('idle');
    setManualCode('');
  };

  // Only render auth page if no user
  if (!user || view === View.AUTH) {
    return <AuthPage onLogin={handleLogin} isDark={isDark} lang={lang} />;
  }

  const renderEnroll = () => (
    <div className="flex flex-col h-full p-6">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView(View.HOME)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-200 text-black'}`}>
                <ArrowRight className="rotate-180" />
            </button>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.enrollTag}</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
            {enrollStatus === 'idle' && (
                <>
                    <div className={`w-64 h-64 rounded-full border-4 border-dashed flex items-center justify-center animate-pulse ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                        <Wifi className={`w-24 h-24 rotate-90 ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`} />
                    </div>
                    <div>
                        <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.enrollTag}</h3>
                        <p className="text-gray-500">{t.enrollDesc}</p>
                    </div>
                    <button 
                        onClick={handleEnrollScan}
                        className="bg-yellow-500 text-black px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-yellow-400 transition-all w-full max-w-xs"
                    >
                        Simulate Scan
                    </button>
                </>
            )}

            {enrollStatus === 'scanning' && (
                 <div className="text-center">
                    <div className="w-24 h-24 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Scanning Tag...</p>
                </div>
            )}

            {enrollStatus === 'success' && (
                <div className="text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <CheckCircle size={48} />
                    </div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.tagLinked}</h3>
                </div>
            )}
        </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {lang === 'sw' ? 'Jambo' : 'Hi'}, {user.name} 👋
            </h1>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t.ready}</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full ${isDark ? 'bg-gray-800 text-yellow-500' : 'bg-white text-gray-600'}`}>
                {isDark ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            <button onClick={() => setLang(lang === 'en' ? 'sw' : 'en')} className={`p-2 rounded-full ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}>
                <Languages size={20}/>
            </button>
        </div>
      </div>

      {/* Card/Balance */}
      <div className="bg-black text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 -translate-y-10 translate-x-10"></div>
        
        <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{t.balance}</p>
                <h2 className="text-4xl font-bold">KES {user.balance}</h2>
            </div>
            <div className="flex flex-col items-end">
                 <Wifi className={`rotate-90 mb-1 ${user.nfcTagId ? 'text-green-400' : 'text-gray-600'}`} />
                 <span className={`text-xs font-mono ${user.nfcTagId ? 'text-green-400' : 'text-gray-600'}`}>
                    {user.nfcTagId ? 'NFC Active' : 'No Tag'}
                 </span>
            </div>
        </div>

        <div className="flex justify-between items-end relative z-10">
            <div className="flex items-center gap-2">
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg">
                    <CreditCard className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-sm text-gray-300 font-mono tracking-wider">
                    MA3 ••• {user.phoneNumber.slice(-4)}
                </div>
            </div>
            <button 
                onClick={() => setView(View.TOPUP)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-1"
            >
                <Plus size={16} /> {t.topUp}
            </button>
        </div>
      </div>

      {/* Alert: Enroll Tag if missing */}
      {!user.nfcTagId && (
        <div 
            onClick={() => setView(View.ENROLL)}
            className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-red-500/20 transition-colors"
        >
            <div className="bg-red-500 p-2 rounded-full text-white">
                <AlertCircle size={20} />
            </div>
            <div className="flex-1">
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Activate Travel Tag</h3>
                <p className="text-xs text-red-500">Link an NFC tag to start travelling.</p>
            </div>
            <ArrowRight className="text-red-500" size={18} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
            onClick={() => setView(View.SCAN)}
            disabled={!user.nfcTagId}
            className={`p-4 rounded-2xl shadow-sm border flex flex-col items-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-100 hover:bg-gray-50'
            }`}
        >
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Scan className="w-6 h-6" />
            </div>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{t.tapToRide}</span>
        </button>
        <button 
            onClick={() => setView(View.SHARE)}
            className={`p-4 rounded-2xl shadow-sm border flex flex-col items-center gap-2 transition-all group ${
                isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-100 hover:bg-gray-50'
            }`}
        >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6" />
            </div>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{t.shareTokens}</span>
        </button>
        <button 
            onClick={() => setView(View.RATING)}
            className={`p-4 rounded-2xl shadow-sm border flex flex-col items-center gap-2 transition-all group ${
                isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-100 hover:bg-gray-50'
            }`}
        >
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6" />
            </div>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{t.rateRide}</span>
        </button>
        <button 
            onClick={() => setView(View.HISTORY)}
            className={`p-4 rounded-2xl shadow-sm border flex flex-col items-center gap-2 transition-all group ${
                isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-100 hover:bg-gray-50'
            }`}
        >
            <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <History className="w-6 h-6" />
            </div>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{t.history}</span>
        </button>
      </div>

      {/* Spending Chart */}
      <div className={`p-6 rounded-2xl shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>{t.weeklySpending}</h3>
        <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingData}>
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: isDark ? '#9CA3AF' : '#6B7280'}} 
                        dy={10}
                    />
                    <Tooltip 
                        cursor={{fill: isDark ? '#374151' : '#F3F4F6'}} 
                        contentStyle={{
                            borderRadius: '12px', 
                            border: 'none', 
                            backgroundColor: isDark ? '#1F2937' : '#FFF',
                            color: isDark ? '#FFF' : '#000'
                        }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
                        {spendingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.amount > 100 ? '#EAB308' : (isDark ? '#4B5563' : '#000000')} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      <TransactionHistory history={history.slice(0, 3)} isDark={isDark} lang={lang} />
      
      <div className="pt-4">
          <button onClick={handleLogout} className="w-full py-3 text-red-500 font-medium flex justify-center items-center gap-2">
              <LogOut size={18} /> {t.logout}
          </button>
      </div>
    </div>
  );

  const renderTopUp = () => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <button onClick={() => setView(View.HOME)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-200 text-black'}`}>
                <ArrowRight className="rotate-180" />
            </button>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.topUp}</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {[50, 100, 200, 500, 1000, 2000].map(amt => (
                <button
                    key={amt}
                    onClick={() => {
                        setSelectedTopUpAmount(amt);
                        setView(View.PAYMENT);
                    }}
                    className={`p-6 rounded-2xl border-2 transition-all text-center group ${
                        isDark 
                        ? 'border-gray-700 bg-gray-800 hover:border-yellow-500' 
                        : 'border-gray-200 hover:border-yellow-500 hover:bg-yellow-50'
                    }`}
                >
                    <span className="block text-gray-500 text-sm mb-1">KES</span>
                    <span className={`block text-2xl font-bold group-hover:text-yellow-600 ${isDark ? 'text-white' : 'text-gray-900'}`}>{amt}</span>
                </button>
            ))}
        </div>

        <div className={`p-4 rounded-xl flex gap-3 text-sm ${isDark ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
            <Wallet className="shrink-0 w-5 h-5" />
            <p>Use M-Pesa to add tokens. Valid for any route in Eldoret.</p>
        </div>
    </div>
  );

  const renderScan = () => (
    <div className="space-y-6 h-full flex flex-col">
         <div className="flex items-center gap-4">
            <button onClick={() => {
                setView(View.HOME);
                setScanStatus('idle');
                setSelectedRouteId(null);
            }} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-200 text-black'}`}>
                <ArrowRight className="rotate-180" />
            </button>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.pay}</h2>
        </div>

        {/* Phase 1: Identify Matatu (Discovery) */}
        {!selectedRouteId && (
            <>
                <div className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    {(['qr', 'code'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => {
                                setPayMethod(m);
                                setScanStatus('idle');
                                setScannedId('');
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex justify-center gap-2 items-center ${
                                payMethod === m 
                                ? 'bg-white shadow-sm text-black' 
                                : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
                            }`}
                        >
                            {m === 'qr' && <QrCode size={16} />}
                            {m === 'code' && <Keyboard size={16} />}
                            <span className="uppercase">{m === 'qr' ? 'Scan QR' : 'Enter Code'}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                    {scanStatus === 'idle' && (
                        <div className="text-center space-y-6 w-full">
                            <h3 className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.identifyRide}</h3>
                            
                            {payMethod === 'qr' && (
                                <div className={`w-64 h-64 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center mx-auto relative overflow-hidden ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                                     <QrCode className="w-16 h-16 text-gray-400 mb-4" />
                                     <p className="text-gray-500">{t.scanQr}</p>
                                     <button onClick={handleDiscoverySimulate} className="mt-4 text-yellow-600 font-bold text-sm">Simulate Camera</button>
                                </div>
                            )}

                            {payMethod === 'code' && (
                                <div className="w-full max-w-xs mx-auto space-y-4">
                                    <label className={`block text-left font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.matatuCode}</label>
                                    <input 
                                        type="text"
                                        maxLength={3}
                                        placeholder="e.g. 123"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        className={`w-full text-center text-3xl tracking-widest font-mono py-4 rounded-xl border uppercase ${
                                            isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                    <button 
                                        onClick={handleCodeSubmit}
                                        disabled={manualCode.length !== 3}
                                        className="w-full bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50"
                                    >
                                        Enter Code
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {scanStatus === 'scanning' && (
                         <div className="text-center">
                            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Finding Matatu...</p>
                        </div>
                    )}
                </div>
            </>
        )}

        {/* Phase 2: Payment & Auth */}
        {selectedRouteId && (
             <div className="w-full flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-8">
                <div className={`p-6 rounded-2xl mb-6 ${isDark ? 'bg-gray-800' : 'bg-white border'}`}>
                     <div className="flex items-center gap-4 mb-4">
                         <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <Bus size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Route Selected</p>
                            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {ROUTES.find(r => r.id === selectedRouteId)?.name}
                            </h3>
                        </div>
                     </div>
                     
                     <div className="flex justify-between items-center p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                         <span className={`font-medium ${isDark ? 'text-yellow-500' : 'text-yellow-700'}`}>Standard Fare</span>
                         <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>KES {ROUTES.find(r => r.id === selectedRouteId)?.standardPrice}</span>
                     </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    {scanStatus === 'matched' && (
                        <>
                            <div className={`w-64 h-64 rounded-full border-4 border-dashed flex flex-col items-center justify-center relative animate-pulse ${isDark ? 'border-green-500/30 bg-gray-800' : 'border-green-500/30 bg-white'}`}>
                                <Wifi className="w-24 h-24 text-green-500 rotate-90 mb-2" />
                                <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.scanToPay}</p>
                            </div>
                            <p className="text-center text-gray-500 max-w-xs">{t.scanToPayDesc}</p>
                            
                            <button
                                onClick={handlePaymentAuthScan}
                                className="w-full max-w-xs bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                            >
                                <Shield size={20} />
                                Simulate Tag Tap
                            </button>
                        </>
                    )}

                    {scanStatus === 'scanning' && (
                        <div className="text-center">
                            <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Authorizing...</p>
                        </div>
                    )}

                    {scanStatus === 'error' && (
                        <div className="text-center animate-shake space-y-4">
                             <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                                <AlertCircle size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-red-500">{t.tagMismatch}</h3>
                            <button 
                                onClick={handlePaymentAuthScan}
                                className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-yellow-400 transition-all w-full"
                            >
                                Try Again
                            </button>
                             <button 
                                onClick={() => setScanStatus('matched')} 
                                className={`font-medium text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
             </div>
        )}
    </div>
  );

  const renderHistory = () => (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
            <button onClick={() => setView(View.HOME)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-200 text-black'}`}>
                <ArrowRight className="rotate-180" />
            </button>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.history}</h2>
        </div>
        <TransactionHistory history={history} isDark={isDark} lang={lang} />
      </div>
  );

  return (
    <div className={`min-h-screen max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-6">
        {view === View.HOME && renderHome()}
        {view === View.TOPUP && renderTopUp()}
        {view === View.PAYMENT && (
          <PaymentPage 
            amount={selectedTopUpAmount} 
            nfcTagId={user?.nfcTagId || null}
            userPhone={user?.phoneNumber || ''}
            onBack={() => setView(View.TOPUP)}
            onSuccess={handleTopUpSuccess}
            isDark={isDark}
            lang={lang}
          />
        )}
        {view === View.SCAN && renderScan()}
        {view === View.HISTORY && renderHistory()}
        {view === View.ENROLL && renderEnroll()}
        {view === View.RATING && <RatingPage onBack={() => setView(View.HOME)} isDark={isDark} lang={lang} />}
        {view === View.SHARE && (
            <ShareTokensPage 
                onBack={() => setView(View.HOME)} 
                onTransfer={handleTransferSuccess} 
                balance={user?.balance || 0}
                isDark={isDark}
                lang={lang}
            />
        )}
      </main>

      {/* Sticky Bottom Nav */}
      {view !== View.PAYMENT && view !== View.ENROLL && view !== View.RATING && view !== View.SHARE && (
        <nav className={`border-t px-6 py-4 flex justify-between items-center z-30 sticky bottom-0 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
            <button 
                onClick={() => setView(View.HOME)}
                className={`flex flex-col items-center gap-1 ${view === View.HOME ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-500'}`}
            >
                <MapPin size={24} />
                <span className="text-[10px] font-bold">{t.home}</span>
            </button>
            <button 
                onClick={() => setView(View.SCAN)}
                disabled={!user.nfcTagId}
                className={`flex flex-col items-center gap-1 ${view === View.SCAN ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-500'} disabled:opacity-50`}
            >
                <div className={`p-3 rounded-full -mt-8 shadow-lg border-4 transition-all ${isDark ? 'bg-yellow-500 text-black border-gray-900' : 'bg-black text-white border-gray-50'} ${view === View.SCAN ? 'scale-110' : ''}`}>
                    <Scan size={24} />
                </div>
                <span className="text-[10px] font-bold">{t.pay}</span>
            </button>
            <button 
                onClick={() => setView(View.HISTORY)}
                className={`flex flex-col items-center gap-1 ${view === View.HISTORY ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-500'}`}
            >
                <History size={24} />
                <span className="text-[10px] font-bold">{t.history}</span>
            </button>
        </nav>
      )}

      <Assistant isDark={isDark} />
    </div>
  );
}