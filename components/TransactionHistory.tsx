import React from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowDownLeft, ArrowUpRight, Bus, Clock, Send } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  history: Transaction[];
  isDark: boolean;
  lang: 'en' | 'sw';
}

export const TransactionHistory: React.FC<Props> = ({ history, isDark, lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>{t.recentActivity}</h3>
        <button className="text-sm text-yellow-500 hover:text-yellow-600 font-medium">{t.viewAll}</button>
      </div>
      
      {history.length === 0 ? (
        <div className={`text-center py-8 rounded-2xl border border-dashed ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          {history.map((tx) => (
            <div key={tx.id} className={`flex items-center justify-between p-4 border-b last:border-0 transition-colors ${
                isDark 
                ? 'border-gray-700 hover:bg-gray-750' 
                : 'border-gray-50 hover:bg-gray-50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.type === TransactionType.DEPOSIT 
                    ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600')
                    : tx.type === TransactionType.TRANSFER_IN
                    ? (isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600')
                    : tx.type === TransactionType.TRANSFER_OUT
                    ? (isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600')
                    : (isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-600')
                }`}>
                  {tx.type === TransactionType.DEPOSIT ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : tx.type === TransactionType.TRANSFER_IN ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : tx.type === TransactionType.TRANSFER_OUT ? (
                    <Send className="w-5 h-5" />
                  ) : (
                    <Bus className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{tx.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.date).toLocaleDateString()} • {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
              <div className={`font-bold ${
                tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.TRANSFER_IN
                  ? 'text-green-500' 
                  : (isDark ? 'text-white' : 'text-gray-900')
              }`}>
                {tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.TRANSFER_IN ? '+' : '-'} {tx.amount}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
