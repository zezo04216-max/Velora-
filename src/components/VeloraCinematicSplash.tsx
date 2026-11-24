import React, { useEffect } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { VeloraBrandMark } from './VeloraBrandMark';

interface VeloraCinematicSplashProps {
  onComplete: () => void;
  subtitle?: string;
  durationMs?: number;
}

export const VeloraCinematicSplash: React.FC<VeloraCinematicSplashProps> = ({
  onComplete,
  subtitle = 'كل تفاصيل فرحتك تبدأ من هنا',
  durationMs = 3200,
}) => {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onComplete();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        background: 'radial-gradient(circle at 50% 42%, #5B3278 0%, #35164D 54%, #1F0B30 100%)',
      }}
      role="dialog"
      aria-label="افتتاحية VÉLORA السينمائية"
    >
      {/* Ambient cinematic light halo */}
      <div
        aria-hidden="true"
        className="animate-envelope-glow pointer-events-none absolute w-[420px] h-[420px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(226,198,139,0.34) 0%, rgba(164,116,204,0.22) 48%, transparent 72%)',
        }}
      />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center space-y-5">
        <div className="scale-125 mb-2">
          <VeloraBrandMark size="lg" lightOnDark={true} />
        </div>

        <h1 className="animate-cinematic-word font-editorial text-4xl sm:text-6xl font-semibold tracking-[0.24em] text-[#FFFFFF]">
          VÉLORA
        </h1>

        <div className="animate-line-expand w-44 h-px bg-gradient-to-r from-transparent via-[#E2C68B] to-transparent" />

        <p className="font-display text-xl sm:text-2xl font-bold text-[#F5E6C8] animate-velora-enter">
          {subtitle}
        </p>

        <p className="text-xs sm:text-sm text-[#DDD0EA] max-w-md leading-relaxed">
          عالم متكامل للقاعات، المصورين، تجهيزات الفرح، والدعوات الإلكترونية الفاخرة
        </p>

        <button
          type="button"
          onClick={onComplete}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold backdrop-blur-md transition-colors min-h-[44px]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E2C68B]" />
          <span>دخول إلى المنصة</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
