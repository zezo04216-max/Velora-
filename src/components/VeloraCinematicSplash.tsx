import React from 'react';
import { ArrowLeft, Compass, LogIn, UserPlus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import heroWeddingImg from '../assets/images/velora_hero_wedding_1795424759489.jpg';
import { VeloraBrandMark } from './VeloraBrandMark';
import { VELORA_EASE } from './CinematicMotion';

interface VeloraEntryScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onBrowse: () => void;
}

const PETALS = [
  { left: '8%', size: 10, delay: 0, dur: 11 },
  { left: '22%', size: 14, delay: 2.5, dur: 13 },
  { left: '38%', size: 9, delay: 5, dur: 10 },
  { left: '55%', size: 12, delay: 1.2, dur: 12 },
  { left: '71%', size: 16, delay: 3.8, dur: 14 },
  { left: '86%', size: 10, delay: 6.5, dur: 11 },
];

/** First screen shown to visitors who are not signed in. It never closes by itself. */
export const VeloraCinematicSplash: React.FC<VeloraEntryScreenProps> = ({ onLogin, onRegister, onBrowse }) => {
  const reduced = useReducedMotion();
  const fade = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: VELORA_EASE },
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#1F0B30]" role="dialog" aria-label="مرحبًا بك في VÉLORA" dir="rtl">
      <motion.img
        src={heroWeddingImg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ scale: 1.18, opacity: 0 }}
        animate={{ scale: reduced ? 1.05 : 1.02, opacity: 1 }}
        transition={{ duration: reduced ? 0.6 : 9, ease: 'easeOut', opacity: { duration: 1.2 } }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(53,22,77,0.55) 0%, rgba(53,22,77,0.35) 30%, rgba(40,14,60,0.88) 72%, rgba(31,11,48,0.97) 100%)',
        }}
      />
      {!reduced &&
        PETALS.map((p, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="absolute -top-6 rounded-[60%_40%_60%_40%] bg-white/55"
            style={{ left: p.left, width: p.size, height: p.size * 1.3 }}
            animate={{ y: ['0vh', '112vh'], x: [0, 28, -18, 22], rotate: [0, 160, 320] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          />
        ))}

      <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 pb-10 pt-14 text-center safe-area-pb">
        <motion.div {...fade(0.2)} className="flex flex-col items-center gap-3">
          <VeloraBrandMark size="lg" lightOnDark={true} />
        </motion.div>

        <div className="flex w-full max-w-md flex-col items-center gap-5">
          <motion.p {...fade(0.5)} className="text-[11px] font-semibold tracking-[0.32em] text-[#E8DCF3]">
            THE LUXURY WEDDING PLATFORM
          </motion.p>
          <motion.h1
            {...fade(0.7)}
            className="font-display text-4xl font-bold leading-[1.25] text-white sm:text-5xl"
          >
            كل تفاصيل فرحتك
            <br />
            <span className="text-[#D9C2EE]">تبدأ من هنا</span>
          </motion.h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 1, ease: VELORA_EASE }}
            className="h-px w-40 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          />
          <motion.p {...fade(1.1)} className="max-w-sm text-sm leading-relaxed text-[#E8DCF3]">
            أرقى القاعات والمصورين وتجهيزات الفرح والدعوات الإلكترونية، وحجز بتاريخ مؤكد بلا تعارض.
          </motion.p>

          <motion.div {...fade(1.3)} className="mt-2 flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-[#5B3278] shadow-xl shadow-black/25 transition-transform active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4" />
              <span>تسجيل الدخول</span>
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#5B3278] text-sm font-bold text-white ring-1 ring-white/30 transition-transform active:scale-[0.98] hover:bg-[#6B3C8C]"
            >
              <UserPlus className="h-4 w-4" />
              <span>إنشاء حساب جديد</span>
            </button>
            <button
              type="button"
              onClick={onBrowse}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 text-xs font-semibold text-[#E8DCF3] hover:text-white"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>تصفّح المنصة كزائر</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
