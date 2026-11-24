import React from 'react';

interface VeloraBrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  lightOnDark?: boolean;
}

export const VeloraBrandMark: React.FC<VeloraBrandMarkProps> = ({
  size = 'md',
  lightOnDark = false,
}) => {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  const titleClass =
    size === 'sm'
      ? 'text-lg tracking-[0.14em]'
      : size === 'lg'
        ? 'text-2xl tracking-[0.18em]'
        : 'text-xl tracking-[0.16em]';

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <span
        className={`${dim} rounded-xl flex items-center justify-center shrink-0 transition-transform ${
          lightOnDark
            ? 'bg-white/15 border border-white/30'
            : 'bg-[#5B3278] shadow-sm shadow-[#5B3278]/25'
        }`}
      >
        <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none" aria-hidden="true">
          <path
            d="M32 10C35.5 18 42.5 22 49 22C42.5 26 39.5 32.5 41 40C35.5 35.5 28.5 35.5 23 40C24.5 32.5 21.5 26 15 22C21.5 22 28.5 18 32 10Z"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path d="M32 25C35 28.5 36.5 32 32 39C27.5 32 29 28.5 32 25Z" fill="#C5A25D" />
          <path
            d="M19 41L32 54L45 41"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none text-right">
        <span
          className={`font-editorial font-semibold ${titleClass} ${
            lightOnDark ? 'text-white' : 'text-[#5B3278]'
          }`}
        >
          VÉLORA
        </span>
        <span
          className={`text-[10px] font-medium tracking-wide mt-0.5 ${
            lightOnDark ? 'text-white/80' : 'text-[#7C678D]'
          }`}
        >
          كل تفاصيل فرحتك
        </span>
      </span>
    </span>
  );
};
