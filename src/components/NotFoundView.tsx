import React from 'react';
import { Home, Sparkles } from 'lucide-react';

interface NotFoundViewProps {
  onGoHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome }) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F3ECF9] text-[#5B3278] flex items-center justify-center">
        <Sparkles className="w-7 h-7" />
      </div>
      <h1 className="font-display text-4xl font-bold text-[#24172E]">الصفحة غير موجودة</h1>
      <p className="text-sm text-[#5E4D6B]">
        عذرًا، الرابط الذي تحاول زيارته غير متاح حاليًا. يمكنك العودة إلى الصفحة الرئيسية لمنصة VÉLORA.
      </p>
      <button
        type="button"
        onClick={onGoHome}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5B3278] text-white text-sm font-bold"
      >
        <Home className="w-4 h-4" />
        <span>العودة إلى الرئيسية</span>
      </button>
    </div>
  );
};
