import React, { useState } from 'react';
import { ArrowLeft, Star, Send, ThumbsUp } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface RatingPageProps {
  onBack: () => void;
  isDark: boolean;
  lang: 'en' | 'sw';
}

export const RatingPage: React.FC<RatingPageProps> = ({ onBack, isDark, lang }) => {
  const t = TRANSLATIONS[lang];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    // Logic to save rating would go here
    setTimeout(() => {
        onBack();
    }, 2000);
  };

  if (submitted) {
      return (
        <div className={`h-full flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in zoom-in ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <ThumbsUp className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-center">{t.ratingSuccess}</h2>
        </div>
      );
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`flex items-center gap-4 p-6 shadow-sm ${isDark ? 'bg-gray-800 border-b border-gray-700' : 'bg-white'}`}>
        <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}>
          <ArrowLeft />
        </button>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.rateRide}</h2>
      </div>

      <div className="p-6 flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.rateDesc}</h3>
            <p className="text-gray-500">Help us improve public transport in Eldoret.</p>
        </div>

        <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                >
                    <Star 
                        size={40} 
                        className={`${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} 
                    />
                </button>
            ))}
        </div>

        <div className="w-full">
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.commentPlaceholder}
                className={`w-full p-4 rounded-xl border h-32 resize-none focus:ring-2 focus:ring-yellow-500 outline-none transition-all ${
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200'
                }`}
            />
        </div>

        <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl shadow-lg shadow-yellow-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
            <span>{t.submitRating}</span>
            <Send size={18} />
        </button>
      </div>
    </div>
  );
};