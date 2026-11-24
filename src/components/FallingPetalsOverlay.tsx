import React from 'react';

interface PetalConfig {
  id: number;
  left: string;
  size: number;
  delay: string;
  duration: string;
  sway: string;
  drift: string;
  opacity: number;
  color: string;
}

const PETALS: PetalConfig[] = [
  { id: 1, left: '6%', size: 15, delay: '0s', duration: '11s', sway: '26px', drift: '-18px', opacity: 0.55, color: '#C9B0E3' },
  { id: 2, left: '14%', size: 12, delay: '-4s', duration: '14s', sway: '-24px', drift: '20px', opacity: 0.48, color: '#9D6DC2' },
  { id: 3, left: '23%', size: 16, delay: '-2s', duration: '12.5s', sway: '30px', drift: '-14px', opacity: 0.45, color: '#DFC086' },
  { id: 4, left: '34%', size: 13, delay: '-7s', duration: '13.5s', sway: '-28px', drift: '22px', opacity: 0.5, color: '#E2CEF4' },
  { id: 5, left: '45%', size: 14, delay: '-1s', duration: '11.5s', sway: '20px', drift: '-24px', opacity: 0.42, color: '#B589D6' },
  { id: 6, left: '56%', size: 16, delay: '-5.5s', duration: '13s', sway: '-22px', drift: '18px', opacity: 0.52, color: '#C9B0E3' },
  { id: 7, left: '67%', size: 12, delay: '-3s', duration: '10.8s', sway: '28px', drift: '-20px', opacity: 0.44, color: '#DFC086' },
  { id: 8, left: '76%', size: 15, delay: '-8s', duration: '14.2s', sway: '-26px', drift: '24px', opacity: 0.5, color: '#9D6DC2' },
  { id: 9, left: '85%', size: 14, delay: '-2.5s', duration: '12s', sway: '22px', drift: '-16px', opacity: 0.46, color: '#E2CEF4' },
  { id: 10, left: '93%', size: 13, delay: '-6s', duration: '13.2s', sway: '-24px', drift: '16px', opacity: 0.5, color: '#C9B0E3' },
];

export const FallingPetalsOverlay: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none"
    >
      {PETALS.map((petal) => (
        <span
          key={petal.id}
          className="animate-petal-fall absolute -top-8 block"
          style={
            {
              left: petal.left,
              width: `${petal.size}px`,
              height: `${petal.size}px`,
              animationDelay: petal.delay,
              '--petal-duration': petal.duration,
              '--petal-sway': petal.sway,
              '--petal-drift': petal.drift,
              '--petal-opacity': String(petal.opacity),
            } as React.CSSProperties
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-full h-full drop-shadow-xs"
          >
            <path
              d="M12 2C8.2 5.2 5.5 9.2 6.2 13.8C6.7 17.1 9.2 20.1 12 21.6C14.8 20.1 17.3 17.1 17.8 13.8C18.5 9.2 15.8 5.2 12 2Z"
              fill={petal.color}
              fillOpacity="0.88"
            />
            <path
              d="M12 4.2C10.5 8.5 10.6 13.6 12 19.2"
              stroke="#FFFFFF"
              strokeOpacity="0.45"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ))}
    </div>
  );
};
