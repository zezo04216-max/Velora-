import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { ElectronicInvitationRecord, InvitationDesignId } from '../types/velora';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { INVITATION_DESIGNS, computeCountdown } from '../utils/veloraLogic';
import { VeloraBrandMark } from './VeloraBrandMark';

type InvitationData = Pick<
  ElectronicInvitationRecord,
  | 'designId'
  | 'designPriceEgp'
  | 'groomName'
  | 'brideName'
  | 'weddingDate'
  | 'weddingTime'
  | 'venueName'
  | 'mapUrl'
  | 'invitationText'
  | 'couplePhoto'
>;

interface InvitationCardRendererProps {
  invitation: InvitationData;
  /** freeze the countdown (used for miniatures) */
  frozen?: boolean;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function formatArabicDateParts(weddingDate: string, weddingTime: string) {
  const parsed = Date.parse(`${(weddingDate || '').trim()}T12:00:00`);
  let dayName = 'يوم الفرح';
  let dayNum = '—';
  let month = '';
  let year = '';
  let monthYear = weddingDate || 'يُحدد لاحقًا';
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    dayName = ARABIC_DAYS[d.getDay()] || dayName;
    dayNum = String(d.getDate());
    month = ARABIC_MONTHS[d.getMonth()];
    year = String(d.getFullYear());
    monthYear = `${month} ${year}`;
  }
  let formattedTime = weddingTime || '20:00';
  const m = /^(\d{1,2}):(\d{2})/.exec(formattedTime.trim());
  if (m) {
    let hour = Number(m[1]);
    const suffix = hour >= 12 ? 'م' : 'ص';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    formattedTime = `${hour}:${m[2]} ${suffix}`;
  }
  return { dayName, dayNum, month, year, monthYear, formattedTime };
}

/* ───────────── ornaments (pure SVG, no external images) ───────────── */

const Leaf: React.FC<{ fill: string; r?: number; x?: number; y?: number; s?: number }> = ({ fill, r = 0, x = 0, y = 0, s = 1 }) => (
  <path
    d="M0 0 C 9 -10 9 -28 0 -42 C -9 -28 -9 -10 0 0Z"
    fill={fill}
    transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
  />
);

const Bloom: React.FC<{ x: number; y: number; s?: number; c1: string; c2: string; c3: string; petals?: number }> = ({ x, y, s = 1, c1, c2, c3, petals = 6 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {Array.from({ length: petals }).map((_, i) => (
      <ellipse key={`a${i}`} cx="0" cy="-20" rx="12" ry="22" fill={c1} stroke={c3} strokeOpacity=".25" strokeWidth=".8" transform={`rotate(${(i * 360) / petals})`} />
    ))}
    {Array.from({ length: petals }).map((_, i) => (
      <ellipse key={`b${i}`} cx="0" cy="-12" rx="8.5" ry="14" fill={c2} stroke={c3} strokeOpacity=".3" strokeWidth=".7" transform={`rotate(${(i * 360) / petals + 180 / petals})`} />
    ))}
    <circle r="6.5" fill={c3} />
    <circle r="2.6" fill={c1} fillOpacity=".8" />
  </g>
);

/** a floral cluster for the top-right corner; mirror with CSS for other corners */
const FloralCorner: React.FC<{ leaf: string; leaf2: string; c1: string; c2: string; c3: string; size?: number; petals?: number }> = ({ leaf, leaf2, c1, c2, c3, size = 190, petals = 6 }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
    <path d="M200 20 C 150 30 100 70 70 150" stroke={leaf} strokeWidth="2" fill="none" />
    <path d="M180 0 C 160 50 120 90 40 120" stroke={leaf2} strokeWidth="1.6" fill="none" />
    <Leaf fill={leaf} x={150} y={36} r={-70} s={0.9} />
    <Leaf fill={leaf2} x={120} y={58} r={20} s={0.9} />
    <Leaf fill={leaf} x={96} y={92} r={-60} s={0.8} />
    <Leaf fill={leaf2} x={80} y={124} r={25} s={0.8} />
    <Leaf fill={leaf} x={140} y={92} r={110} s={0.9} />
    <Leaf fill={leaf2} x={170} y={70} r={140} s={0.8} />
    <Leaf fill={leaf2} x={62} y={146} r={-20} s={0.7} />
    <Bloom x={160} y={40} s={1.15} c1={c1} c2={c2} c3={c3} petals={petals} />
    <Bloom x={102} y={86} s={0.8} c1={c1} c2={c2} c3={c3} petals={petals} />
    <Bloom x={176} y={112} s={0.55} c1={c1} c2={c2} c3={c3} petals={petals} />
    <Bloom x={52} y={132} s={0.45} c1={c1} c2={c2} c3={c3} petals={petals} />
  </svg>
);

const CornerFlourish: React.FC<{ color: string; size?: number; bare?: boolean }> = ({ color, size = 64, bare }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} fill="none" stroke={color} aria-hidden="true">
    {!bare && <path d="M2 62 V14 C2 7 7 2 14 2 H62" strokeWidth="1.6" />}
    {!bare && <path d="M10 62 V18 C10 13 13 10 18 10 H62" strokeWidth=".8" />}
    <circle cx="14" cy="14" r="3" fill={color} stroke="none" />
    <path d="M20 20 C 28 20 28 28 36 28 M20 20 C 20 28 28 28 28 36" strokeWidth="1" />
  </svg>
);

const Diamond: React.FC<{ color: string; size?: number }> = ({ color, size = 8 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 0 L10 5 L5 10 L0 5Z" fill={color} />
  </svg>
);

const OrnamentDivider: React.FC<{ color: string; width?: string }> = ({ color, width = '70%' }) => (
  <div className="flex items-center justify-center gap-2 mx-auto" style={{ width }} aria-hidden="true">
    <span className="h-px flex-1" style={{ background: `linear-gradient(to left, ${color}, transparent)` }} />
    <Diamond color={color} />
    <Diamond color={color} size={5} />
    <Diamond color={color} />
    <span className="h-px flex-1" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />
  </div>
);

const Crown: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 60 36" width="44" height="26" fill="none" stroke={color} strokeWidth="1.5" aria-hidden="true">
    <path d="M6 30 L4 10 L18 20 L30 4 L42 20 L56 10 L54 30Z" fill={color} fillOpacity=".15" />
    <path d="M6 34 H54" />
    <circle cx="30" cy="4" r="2" fill={color} />
    <circle cx="4" cy="10" r="2" fill={color} />
    <circle cx="56" cy="10" r="2" fill={color} />
  </svg>
);

const DecoFan: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 120 50" width="120" height="50" fill="none" stroke={color} strokeWidth="1" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M60 50 m-${12 + i * 10} 0 a${12 + i * 10} ${12 + i * 10} 0 0 1 ${24 + i * 20} 0`} />
    ))}
    {[-60, -40, -20, 0, 20, 40, 60].map((a) => (
      <line key={a} x1="60" y1="50" x2={60 + Math.sin((a * Math.PI) / 180) * 50} y2={50 - Math.cos((a * Math.PI) / 180) * 50} />
    ))}
  </svg>
);

/* ───────────── theme table ───────────── */

interface Theme {
  bg: string;
  head: string;
  body: string;
  accent: string;
  line: string;
  panel: string;
  panelBorder: string;
  nameFont: string;
  nameWeight: number;
  nameSize: string;
  nameGradient?: string;
  radius: string;
  photo: 'circle' | 'arch';
  date: 'strip' | 'stack' | 'big' | 'plain';
  cd: 'boxes' | 'inline' | 'rings';
  eyebrow: string;
  intro: string;
  dark: boolean;
  watermarkBg: string;
  watermarkText: string;
}

const AMIRI = '"Amiri", "Cormorant Garamond", serif';
const THEMES: Record<InvitationDesignId, Theme> = {
  royal: {
    bg: 'radial-gradient(120% 70% at 50% 0%, #6A3A8C 0%, #4A2364 45%, #2F1243 100%)',
    head: '#FFFFFF', body: '#EDE3F6', accent: '#E6C77F', line: 'rgba(230,199,127,.55)',
    panel: 'rgba(255,255,255,.07)', panelBorder: 'rgba(230,199,127,.4)',
    nameFont: AMIRI, nameWeight: 700, nameSize: '2.7rem',
    nameGradient: 'linear-gradient(180deg,#FFF3CF 0%,#E6C77F 55%,#B98F3E 100%)',
    radius: '30px', photo: 'arch', date: 'strip', cd: 'boxes',
    eyebrow: 'THE ROYAL WEDDING', intro: 'يتشرفان بدعوتكم لحضور حفل زفافهما', dark: true,
    watermarkBg: 'rgba(255,255,255,.95)', watermarkText: '#5B3278',
  },
  romantic: {
    bg: 'linear-gradient(170deg,#FFF6F3 0%,#FBE6E6 50%,#F4D3DA 100%)',
    head: '#6B2D45', body: '#8A5368', accent: '#C0566E', line: 'rgba(192,86,110,.4)',
    panel: 'rgba(255,255,255,.65)', panelBorder: 'rgba(192,86,110,.28)',
    nameFont: '"Aref Ruqaa", "Amiri", serif', nameWeight: 700, nameSize: '2.6rem',
    radius: '30px', photo: 'arch', date: 'stack', cd: 'rings',
    eyebrow: 'WITH LOVE', intro: 'بقلوب ملؤها الحب ندعوكم لمشاركتنا فرحتنا', dark: false,
    watermarkBg: '#FFFFFF', watermarkText: '#6B2D45',
  },
  classic: {
    bg: 'linear-gradient(180deg,#1B2A4A 0%,#14203A 100%)',
    head: '#FFFFFF', body: '#D7DFEF', accent: '#D8B46A', line: 'rgba(216,180,106,.6)',
    panel: 'rgba(255,255,255,.05)', panelBorder: 'rgba(216,180,106,.35)',
    nameFont: AMIRI, nameWeight: 700, nameSize: '2.6rem',
    radius: '6px', photo: 'circle', date: 'stack', cd: 'inline',
    eyebrow: 'WEDDING INVITATION', intro: 'يسعدنا دعوتكم لحضور حفل زفافنا', dark: true,
    watermarkBg: '#FFFFFF', watermarkText: '#1B2A4A',
  },
  floral: {
    bg: 'linear-gradient(165deg,#FFFFFF 0%,#EEF4FB 55%,#DDE9F6 100%)',
    head: '#1E3A66', body: '#46618A', accent: '#2F5E9E', line: 'rgba(47,94,158,.35)',
    panel: 'rgba(255,255,255,.75)', panelBorder: 'rgba(47,94,158,.22)',
    nameFont: AMIRI, nameWeight: 700, nameSize: '2.6rem',
    radius: '28px', photo: 'circle', date: 'strip', cd: 'boxes',
    eyebrow: 'SAVE THE DATE', intro: 'يتشرفان بدعوتكم لحضور حفل زفافهما', dark: false,
    watermarkBg: '#FFFFFF', watermarkText: '#1E3A66',
  },
  luxury: {
    bg: 'linear-gradient(180deg,#FFFDF8 0%,#F6EEDD 100%)',
    head: '#2A1838', body: '#6A5A72', accent: '#B8913F', line: 'rgba(184,145,63,.55)',
    panel: 'rgba(255,255,255,.7)', panelBorder: 'rgba(91,50,120,.25)',
    nameFont: AMIRI, nameWeight: 700, nameSize: '2.6rem',
    nameGradient: 'linear-gradient(180deg,#5B3278 0%,#3B1B52 100%)',
    radius: '22px', photo: 'arch', date: 'strip', cd: 'boxes',
    eyebrow: 'A LUXURY CELEBRATION', intro: 'يتشرفان بدعوتكم لحضور حفل زفافهما', dark: false,
    watermarkBg: '#F3ECF9', watermarkText: '#5B3278',
  },
  modern: {
    bg: '#FFFFFF',
    head: '#1E1128', body: '#5A4868', accent: '#7B3FA8', line: '#1E1128',
    panel: '#F5EEFB', panelBorder: 'transparent',
    nameFont: '"Reem Kufi", "IBM Plex Sans Arabic", sans-serif', nameWeight: 700, nameSize: '2.4rem',
    radius: '0px', photo: 'circle', date: 'big', cd: 'boxes',
    eyebrow: 'WE ARE GETTING MARRIED', intro: 'نتشرف بدعوتكم لحضور حفل زفافنا', dark: false,
    watermarkBg: '#F3ECF9', watermarkText: '#5B3278',
  },
  minimal: {
    bg: '#FFFFFF',
    head: '#24172E', body: '#6B5A78', accent: '#5B3278', line: '#D9CCE4',
    panel: 'transparent', panelBorder: '#E7DDF0',
    nameFont: '"IBM Plex Sans Arabic", sans-serif', nameWeight: 300, nameSize: '2.2rem',
    radius: '4px', photo: 'circle', date: 'plain', cd: 'inline',
    eyebrow: 'WEDDING', intro: 'نتشرف بدعوتكم لحضور حفل زفافنا', dark: false,
    watermarkBg: '#FAF7FD', watermarkText: '#5B3278',
  },
};

/* background decoration per design, covering the WHOLE card */
const Decor: React.FC<{ id: InvitationDesignId }> = ({ id }) => {
  const abs = 'absolute pointer-events-none select-none';
  if (id === 'royal')
    return (
      <>
        <div className="absolute inset-2.5 pointer-events-none" style={{ border: '1.5px solid #E6C77F', borderRadius: 24 }} />
        <div className="absolute inset-4 pointer-events-none" style={{ border: '1px solid rgba(230,199,127,.45)', borderRadius: 18 }} />
        <div className={`${abs} top-2 right-2`}><CornerFlourish color="#E6C77F" bare size={56} /></div>
        <div className={`${abs} top-2 left-2`} style={{ transform: 'scaleX(-1)' }}><CornerFlourish color="#E6C77F" bare size={56} /></div>
        <div className={`${abs} bottom-2 right-2`} style={{ transform: 'scaleY(-1)' }}><CornerFlourish color="#E6C77F" bare size={56} /></div>
        <div className={`${abs} bottom-2 left-2`} style={{ transform: 'scale(-1,-1)' }}><CornerFlourish color="#E6C77F" bare size={56} /></div>
      </>
    );
  if (id === 'romantic')
    return (
      <>
        <div className="absolute inset-3 pointer-events-none" style={{ border: '1px solid rgba(192,86,110,.35)', borderRadius: 26 }} />
        <div className={`${abs} top-0 right-0`}><FloralCorner leaf="#7C9A7E" leaf2="#9DB59B" c1="#FFFFFF" c2="#F7C6D0" c3="#D9748C" size={125} petals={7} /></div>
        <div className={`${abs} top-0 left-0`} style={{ transform: 'scaleX(-1)' }}><FloralCorner leaf="#7C9A7E" leaf2="#9DB59B" c1="#FFFFFF" c2="#F7C6D0" c3="#D9748C" size={125} petals={7} /></div>
        <div className={`${abs} bottom-0 right-0`} style={{ transform: 'scaleY(-1)' }}><FloralCorner leaf="#7C9A7E" leaf2="#9DB59B" c1="#FFFFFF" c2="#F7C6D0" c3="#D9748C" size={120} petals={7} /></div>
        <div className={`${abs} bottom-0 left-0`} style={{ transform: 'scale(-1,-1)' }}><FloralCorner leaf="#7C9A7E" leaf2="#9DB59B" c1="#FFFFFF" c2="#F7C6D0" c3="#D9748C" size={120} petals={7} /></div>
      </>
    );
  if (id === 'classic')
    return (
      <>
        <div className="absolute inset-3 pointer-events-none" style={{ border: '2px solid #D8B46A' }} />
        <div className="absolute inset-[18px] pointer-events-none" style={{ border: '1px solid rgba(216,180,106,.6)' }} />
        <div className="absolute inset-[26px] pointer-events-none" style={{ border: '1px dashed rgba(216,180,106,.3)' }} />
        {[['top-1.5 right-1.5', 'none'], ['top-1.5 left-1.5', 'scaleX(-1)'], ['bottom-1.5 right-1.5', 'scaleY(-1)'], ['bottom-1.5 left-1.5', 'scale(-1,-1)']].map(([pos, t]) => (
          <div key={pos} className={`${abs} ${pos}`} style={{ transform: t }}><CornerFlourish color="#D8B46A" size={46} bare /></div>
        ))}
      </>
    );
  if (id === 'floral')
    return (
      <>
        <div className="absolute inset-3 pointer-events-none" style={{ border: '1px solid rgba(47,94,158,.28)', borderRadius: 22 }} />
        <div className={`${abs} top-0 right-0`}><FloralCorner leaf="#6F93BE" leaf2="#9DB9D9" c1="#FFFFFF" c2="#BCD3EC" c3="#3F73B3" size={130} /></div>
        <div className={`${abs} top-0 left-0`} style={{ transform: 'scaleX(-1)' }}><FloralCorner leaf="#6F93BE" leaf2="#9DB9D9" c1="#FFFFFF" c2="#BCD3EC" c3="#3F73B3" size={130} /></div>
        <div className={`${abs} bottom-0 right-0`} style={{ transform: 'scaleY(-1)' }}><FloralCorner leaf="#6F93BE" leaf2="#9DB9D9" c1="#FFFFFF" c2="#BCD3EC" c3="#3F73B3" size={125} /></div>
        <div className={`${abs} bottom-0 left-0`} style={{ transform: 'scale(-1,-1)' }}><FloralCorner leaf="#6F93BE" leaf2="#9DB9D9" c1="#FFFFFF" c2="#BCD3EC" c3="#3F73B3" size={125} /></div>
      </>
    );
  if (id === 'luxury')
    return (
      <>
        <div className="absolute inset-3 pointer-events-none" style={{ border: '2px solid #5B3278', borderRadius: 18 }} />
        <div className="absolute inset-[18px] pointer-events-none" style={{ border: '1px solid #B8913F', borderRadius: 13 }} />
        <div className={`${abs} top-[22px] inset-x-0 flex justify-center`}><DecoFan color="#B8913F" /></div>
        <div className={`${abs} bottom-[22px] inset-x-0 flex justify-center`} style={{ transform: 'scaleY(-1)' }}><DecoFan color="#B8913F" /></div>
      </>
    );
  if (id === 'modern')
    return (
      <>
        <div className="absolute top-0 right-0 bottom-0 w-[14px]" style={{ background: 'linear-gradient(180deg,#5B3278,#9B5CC8)' }} />
        <div className="absolute top-0 left-0 right-[14px] h-[220px]" style={{ background: 'linear-gradient(135deg,#F1E7FA 0%,#FFFFFF 70%)' }} />
        <div className="absolute -top-14 -left-14 w-32 h-32 rounded-full" style={{ border: "14px solid #5B3278", opacity: 0.9 }} />
        <div className="absolute bottom-8 -left-6 w-20 h-20 rotate-45" style={{ border: '2px solid #5B3278', opacity: 0.35 }} />
      </>
    );
  return (
    <>
      <div className="absolute inset-5 pointer-events-none" style={{ border: '1px solid #E7DDF0' }} />
      <div className="absolute top-0 left-1/2 w-px h-10 bg-[#5B3278]/40" />
      <div className="absolute bottom-0 left-1/2 w-px h-10 bg-[#5B3278]/40" />
    </>
  );
};

/* ───────────── main renderer ───────────── */

export const InvitationCardRenderer: React.FC<InvitationCardRendererProps> = ({ invitation, frozen }) => {
  const id = (INVITATION_DESIGNS[invitation.designId] ? invitation.designId : 'royal') as InvitationDesignId;
  const spec = INVITATION_DESIGNS[id];
  const t = THEMES[id];
  const effectivePrice = invitation.designPriceEgp !== undefined ? Number(invitation.designPriceEgp) : spec.priceEgp;
  const isFreeCard = effectivePrice <= 0;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (frozen) return;
    const tid = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tid);
  }, [frozen]);

  const countdown = computeCountdown(invitation.weddingDate, invitation.weddingTime, nowMs);
  const dp = formatArabicDateParts(invitation.weddingDate, invitation.weddingTime);
  const cells = [
    { ar: 'يوم', en: 'DAYS', val: countdown.days },
    { ar: 'ساعة', en: 'HOURS', val: countdown.hours },
    { ar: 'دقيقة', en: 'MIN', val: countdown.minutes },
    { ar: 'ثانية', en: 'SEC', val: countdown.seconds },
  ];
  const isModern = id === 'modern';
  const nameStyle: React.CSSProperties = {
    fontFamily: t.nameFont,
    fontWeight: t.nameWeight,
    fontSize: t.nameSize,
    lineHeight: 1.25,
    color: t.head,
    ...(t.nameGradient
      ? { backgroundImage: t.nameGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }
      : {}),
  };
  const amp = (
    <span className="block font-editorial italic text-2xl leading-none my-0.5" style={{ color: t.accent }}>
      &amp;
    </span>
  );

  const label = (txt: string) => (
    <span className="text-[11px] block" style={{ color: t.accent }}>{txt}</span>
  );

  const dateBlock = () => {
    if (t.date === 'strip')
      return (
        <div className="grid grid-cols-3 items-center py-4 px-1 text-center" style={{ background: t.panel, border: `1px solid ${t.panelBorder}`, borderRadius: t.radius }}>
          <div className="px-1">{label('اليوم')}<span className="text-sm font-bold block">{dp.dayName}</span></div>
          <div className="px-1" style={{ borderInline: `1px solid ${t.line}` }}>
            <span className="font-display text-3xl font-bold block leading-none tabular-nums" style={{ color: t.accent }}>{dp.dayNum}</span>
            <span className="text-[11px] block mt-1" style={{ color: t.body }}>{dp.monthYear}</span>
          </div>
          <div className="px-1">{label('الساعة')}<span className="text-sm font-bold block tabular-nums">{dp.formattedTime}</span></div>
        </div>
      );
    if (t.date === 'stack')
      return (
        <div className="text-center space-y-1.5 py-2">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-10" style={{ background: t.line }} />
            <span className="text-base font-bold">{dp.dayName}</span>
            <span className="h-px w-10" style={{ background: t.line }} />
          </div>
          <div className="flex items-end justify-center gap-3 leading-none">
            <span className="text-lg font-bold" style={{ color: t.body }}>{dp.month}</span>
            <span className="font-display text-6xl font-bold tabular-nums" style={{ color: t.accent }}>{dp.dayNum}</span>
            <span className="text-lg font-bold tabular-nums" style={{ color: t.body }}>{dp.year}</span>
          </div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: t.body }}>الساعة {dp.formattedTime}</div>
        </div>
      );
    if (t.date === 'big')
      return (
        <div className="flex items-stretch gap-4" style={{ direction: 'rtl' }}>
          <div className="font-bold tabular-nums leading-none" style={{ fontFamily: t.nameFont, fontSize: '5.2rem', color: '#5B3278' }}>{dp.dayNum}</div>
          <div className="flex flex-col justify-center gap-1 border-r-2 pr-4" style={{ borderColor: '#5B3278' }}>
            <span className="text-lg font-bold">{dp.month} {dp.year}</span>
            <span className="text-sm" style={{ color: t.body }}>{dp.dayName}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: t.accent }}>{dp.formattedTime}</span>
          </div>
        </div>
      );
    return (
      <div className="text-center space-y-2 py-1">
        <span className="font-display text-4xl block tabular-nums" style={{ fontWeight: 300 }}>{dp.dayNum}</span>
        <span className="text-xs tracking-wide block" style={{ color: t.body }}>{dp.dayName} · {dp.monthYear} · {dp.formattedTime}</span>
      </div>
    );
  };

  const countdownBlock = () => {
    if (countdown.state !== 'future') return null;
    if (t.cd === 'inline')
      return (
        <div className="flex items-start justify-center gap-0 tabular-nums" style={{ direction: 'ltr' }}>
          {cells.map((c, i) => (
            <React.Fragment key={c.en}>
              {i > 0 && <span className="px-1.5 text-xl opacity-50" style={{ color: t.accent }}>:</span>}
              <div className="text-center min-w-[3.1rem]">
                <div className="font-display text-3xl leading-none" style={{ fontWeight: isModern || id === 'minimal' ? 300 : 700 }}>{String(c.val).padStart(2, '0')}</div>
                <div className="text-[10px] mt-1" style={{ color: t.body }}>{c.ar}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      );
    if (t.cd === 'rings')
      return (
        <div className="grid grid-cols-4 gap-2" style={{ direction: 'ltr' }}>
          {cells.map((c) => (
            <div key={c.en} className="mx-auto w-[3.9rem] h-[3.9rem] rounded-full flex flex-col items-center justify-center bg-white/70" style={{ border: `1.5px solid ${t.accent}` }}>
              <span className="font-display text-xl font-bold leading-none tabular-nums">{String(c.val).padStart(2, '0')}</span>
              <span className="text-[10px] mt-0.5" style={{ color: t.body }}>{c.ar}</span>
            </div>
          ))}
        </div>
      );
    return (
      <div className="grid grid-cols-4 gap-2" style={{ direction: 'ltr' }}>
        {cells.map((c) => (
          <div
            key={c.en}
            className="py-2.5 text-center"
            style={{
              background: isModern ? '#1E1128' : t.dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.85)',
              color: isModern ? '#FFFFFF' : undefined,
              border: `1px solid ${isModern ? '#1E1128' : t.panelBorder}`,
              borderRadius: isModern ? 0 : 14,
            }}
          >
            <div className="font-display text-2xl font-bold tabular-nums leading-none">{String(c.val).padStart(2, '0')}</div>
            <div className="text-[10px] mt-1" style={{ color: isModern ? '#D8C3EA' : t.body }}>{c.ar}</div>
          </div>
        ))}
      </div>
    );
  };

  const photoEl = invitation.couplePhoto ? (
    <div
      className={`mx-auto overflow-hidden shadow-md ${t.photo === 'arch' ? 'w-28 h-36 rounded-t-full rounded-b-2xl' : 'w-28 h-28 rounded-full'}`}
      style={{ border: `3px solid ${t.accent}` }}
    >
      <img src={resolveMediaUrl(invitation.couplePhoto)} alt={`${invitation.groomName} و ${invitation.brideName}`} className="w-full h-full object-cover" />
    </div>
  ) : null;

  const alignLeft = isModern;

  return (
    <div
      className="relative overflow-hidden shadow-2xl"
      style={{ background: t.bg, color: t.head, borderRadius: isModern ? 8 : id === 'classic' ? 10 : 28 }}
      data-design={id}
    >
      <Decor id={id} />
      <div
        className={`relative z-10 mx-auto max-w-xl px-8 ${id === 'luxury' ? 'pt-24 pb-24' : id === 'romantic' || id === 'floral' ? 'pt-24 pb-24' : 'pt-14 pb-14'} space-y-6 ${alignLeft ? 'text-right' : 'text-center'}`}
        style={isModern ? { paddingInlineEnd: '2.5rem' } : undefined}
      >
        {/* header */}
        <div className="space-y-3">
          {id === 'royal' && <div className="flex justify-center"><Crown color={t.accent} /></div>}
          <p className="font-editorial text-[11px] font-semibold tracking-[0.3em] uppercase" style={{ color: t.accent }}>
            {t.eyebrow}
          </p>
          <p className="text-sm font-medium" style={{ color: t.body }}>{t.intro}</p>
          <h2 style={nameStyle} className="pt-1">
            <span className="block">{invitation.groomName}</span>
            {isModern ? (
              <span className="block text-base font-normal tracking-[0.4em] my-1" style={{ color: t.accent }}>&mdash; و &mdash;</span>
            ) : amp}
            <span className="block">{invitation.brideName}</span>
          </h2>
          {(id === 'royal' || id === 'classic' || id === 'luxury') && <OrnamentDivider color={t.accent} />}
        </div>

        {photoEl}

        <p className="text-[15px] leading-loose max-w-sm mx-auto" style={{ color: t.body, marginInline: alignLeft ? 0 : 'auto' }}>
          {invitation.invitationText}
        </p>

        {dateBlock()}

        {/* venue */}
        <div className="space-y-2.5">
          <div className={`inline-flex items-center gap-1.5 text-base font-bold ${alignLeft ? '' : 'justify-center'}`}>
            <MapPin className="w-4 h-4 shrink-0" style={{ color: t.accent }} />
            <span>{invitation.venueName || 'القاعة'}</span>
          </div>
          {invitation.mapUrl && (
            <div>
              <a
                href={invitation.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold border transition-opacity hover:opacity-85"
                style={{
                  borderColor: t.dark ? 'rgba(255,255,255,.4)' : t.accent,
                  color: isModern ? '#FFFFFF' : t.dark ? '#FFFFFF' : t.accent,
                  background: isModern ? '#5B3278' : 'transparent',
                  borderRadius: isModern ? 0 : 999,
                }}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>الموقع على الخريطة</span>
              </a>
            </div>
          )}
        </div>

        {/* countdown */}
        <div className="space-y-3 pt-1">
          <p className="font-display text-lg font-bold">
            {countdown.state === 'future' ? 'باقي على أجمل يوم' : countdown.statusMessageAr}
          </p>
          {countdownBlock()}
        </div>

        {/* watermark (free cards) / signature (paid cards) */}
        {isFreeCard ? (
          <div className={`flex pt-1 ${alignLeft ? 'justify-start' : 'justify-center'}`}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border" style={{ background: t.watermarkBg, color: t.watermarkText, borderColor: 'rgba(91,50,120,.25)' }}>
              <VeloraBrandMark size="sm" />
              <span className="text-[10px] font-bold">صُممت مجانًا</span>
            </span>
          </div>
        ) : (
          <p className="font-editorial text-[10px] tracking-[0.3em] uppercase" style={{ color: t.accent }}>
            A day to remember
          </p>
        )}
      </div>
    </div>
  );
};

/* ───────────── miniature (design picker / lists) ───────────── */

const THUMB_SAMPLE: Omit<InvitationData, 'designId' | 'designPriceEgp'> = {
  groomName: 'محمد',
  brideName: 'منة',
  weddingDate: '2027-06-18',
  weddingTime: '20:00',
  venueName: 'قاعة الأوركيد',
  mapUrl: '',
  invitationText: 'يسعدنا حضوركم ومشاركتكم أجمل لحظاتنا',
  couplePhoto: '',
};

/** True miniature: the real renderer, scaled down and frozen. */
export const InvitationCardThumb: React.FC<{
  designId: InvitationDesignId;
  priceEgp?: number;
  width?: number;
  height?: number;
}> = ({ designId, priceEgp, width = 120, height = 150 }) => {
  const FULL = 340;
  const scale = width / FULL;
  return (
    <div className="relative overflow-hidden rounded-lg border border-[#E8DCF3] shrink-0" style={{ width, height }} aria-hidden="true">
      <div style={{ width: FULL, transform: `scale(${scale})`, transformOrigin: 'top right', position: 'absolute', top: 0, right: 0 }} dir="rtl">
        <InvitationCardRenderer invitation={{ ...THUMB_SAMPLE, designId, designPriceEgp: priceEgp }} frozen />
      </div>
    </div>
  );
};
