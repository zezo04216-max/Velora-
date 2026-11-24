import React, { useEffect, useState } from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import type { ElectronicInvitationRecord } from '../types/velora';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { INVITATION_DESIGNS, computeCountdown } from '../utils/veloraLogic';
import { VeloraBrandMark } from './VeloraBrandMark';

interface InvitationCardRendererProps {
  invitation: Pick<
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
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

function formatArabicDateParts(weddingDate: string, weddingTime: string) {
  const parsed = Date.parse(`${(weddingDate || '').trim()}T12:00:00`);
  let dayName = 'يوم الفرح';
  let dayNum = '—';
  let monthYear = weddingDate || 'يُحدد لاحقًا';

  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    dayName = ARABIC_DAYS[d.getDay()] || 'يوم الفرح';
    dayNum = String(d.getDate());
    monthYear = `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  let formattedTime = weddingTime || '20:00';
  const m = /^(\d{1,2}):(\d{2})/.exec(formattedTime.trim());
  if (m) {
    let hour = Number(m[1]);
    const min = m[2];
    const suffix = hour >= 12 ? 'م' : 'ص';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    formattedTime = `${hour}:${min} ${suffix}`;
  }

  return { dayName, dayNum, monthYear, formattedTime };
}

export const InvitationCardRenderer: React.FC<InvitationCardRendererProps> = ({ invitation }) => {
  const spec = INVITATION_DESIGNS[invitation.designId] || INVITATION_DESIGNS.royal;
  const effectivePrice =
    invitation.designPriceEgp !== undefined ? Number(invitation.designPriceEgp) : spec.priceEgp;
  const isFreeCard = effectivePrice <= 0;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const countdown = computeCountdown(invitation.weddingDate, invitation.weddingTime, nowMs);
  const dateParts = formatArabicDateParts(invitation.weddingDate, invitation.weddingTime);
  const isDarkCard = invitation.designId === 'royal' || invitation.designId === 'classic';
  const isRomanticIvoryRoses = invitation.designId === 'romantic';
  const hasBgImage = Boolean(spec.bgImage);
  const resolvedBg = spec.bgImage ? resolveMediaUrl(spec.bgImage) : '';

  if (isRomanticIvoryRoses) {
    return (
      <div
        className="relative rounded-[28px] shadow-2xl overflow-hidden transition-all"
        style={{
          background: '#FAF8F2',
          border: `1.5px solid ${spec.cardBorder}`,
          color: spec.headingColor,
        }}
      >
        {/* Top Cream Header Plate (matching ivory & sage stationery aesthetic) */}
        <div className="relative z-10 bg-[#FAF8F2] border-b border-[#EAE2CF] px-6 py-7 sm:px-10 sm:py-9 text-center space-y-2.5">
          {isFreeCard && (
            <div className="flex justify-center pb-1">
              <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-white border border-[#E5DEC9] shadow-2xs">
                <VeloraBrandMark size="sm" />
                <span className="text-[10px] font-bold text-[#6B5A78] border-r border-[#E5DEC9] pr-2">
                  بطاقة مجانية
                </span>
              </div>
            </div>
          )}
          <p
            className="font-editorial text-[11px] sm:text-xs font-semibold tracking-[0.28em] uppercase"
            style={{ color: spec.accentColor }}
          >
            YOU ARE INVITED{isFreeCard ? ' · VÉLORA' : ''}
          </p>
          <p className="text-sm sm:text-base font-medium" style={{ color: spec.headingColor }}>
            يتشرفان بدعوتكم لحضور حفل زفافهما
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight pt-1">
            {invitation.groomName}{' '}
            <span className="font-editorial italic" style={{ color: spec.accentColor }}>
              &amp;
            </span>{' '}
            {invitation.brideName}
          </h2>
        </div>

        {/* Lower Floral Ivory Roses & Olive Sage Botanical Canvas */}
        <div className="relative overflow-hidden">
          {resolvedBg && (
            <img
              src={resolvedBg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            />
          )}
          <div className="absolute inset-0 bg-[#FAF8F2]/30 pointer-events-none" />

          <div className="relative z-10 text-center max-w-xl mx-auto px-5 py-8 sm:px-10 sm:py-10 space-y-6">
            {invitation.couplePhoto && (
              <div
                className="mx-auto w-22 h-22 sm:w-24 sm:h-24 rounded-full overflow-hidden border-[2.5px] shadow-md bg-white"
                style={{ borderColor: spec.accentColor }}
              >
                <img
                  src={resolveMediaUrl(invitation.couplePhoto)}
                  alt={`${invitation.groomName} و ${invitation.brideName}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p
              className="text-sm sm:text-[15px] font-medium leading-relaxed max-w-md mx-auto px-3 py-1.5 rounded-xl bg-[#FAF8F2]/75 backdrop-blur-[2px]"
              style={{ color: spec.headingColor }}
            >
              {invitation.invitationText}
            </p>

            {/* 3-Column Date / Day / Time Strip */}
            <div className="grid grid-cols-3 items-center py-4 px-2 rounded-2xl bg-white/75 backdrop-blur-sm border border-[#E5DEC9]">
              <div className="px-2 space-y-1">
                <span className="text-[11px] block" style={{ color: spec.bodyColor }}>
                  اليوم
                </span>
                <span className="text-sm sm:text-base font-bold block" style={{ color: spec.headingColor }}>
                  {dateParts.dayName}
                </span>
              </div>

              <div className="px-2 border-x border-[#DFD6BF] space-y-0.5">
                <span
                  className="font-display text-2xl sm:text-3xl font-bold block leading-none tabular-nums"
                  style={{ color: spec.accentColor }}
                >
                  {dateParts.dayNum}
                </span>
                <span className="text-[11px] font-medium block" style={{ color: spec.headingColor }}>
                  {dateParts.monthYear}
                </span>
              </div>

              <div className="px-2 space-y-1">
                <span className="text-[11px] block" style={{ color: spec.bodyColor }}>
                  الساعة
                </span>
                <span
                  className="text-sm sm:text-base font-bold block tabular-nums"
                  style={{ color: spec.accentColor }}
                >
                  {dateParts.formattedTime}
                </span>
              </div>
            </div>

            {/* Venue Location + Map Pin */}
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full bg-white/75 backdrop-blur-xs">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: spec.headingColor }} />
                <span>{invitation.venueName || 'القاعة الملكية'}</span>
              </div>
              {invitation.mapUrl && (
                <div>
                  <a
                    href={invitation.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border bg-white/85 transition-opacity hover:opacity-85"
                    style={{
                      borderColor: spec.cardBorder,
                      color: spec.headingColor,
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>الموقع على الخريطة</span>
                  </a>
                </div>
              )}
            </div>

            {/* Frosted Framed Countdown Card */}
            <div className="rounded-2xl p-4 sm:p-5 space-y-3 bg-[#FAF8F2]/88 backdrop-blur-md border border-[#DFD6BF] shadow-lg shadow-[#3D5542]/10">
              <div className="space-y-0.5">
                <p
                  className="font-editorial text-[10px] sm:text-[11px] tracking-[0.26em] uppercase"
                  style={{ color: spec.bodyColor }}
                >
                  THE BIG DAY IS COMING
                </p>
                <p className="font-display text-lg sm:text-xl font-bold" style={{ color: spec.headingColor }}>
                  {countdown.state === 'future' ? 'باقي على أجمل يوم' : countdown.statusMessageAr}
                </p>
              </div>

              {countdown.state === 'future' && (
                <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
                  {[
                    { en: 'DAYS', ar: 'يوم', val: countdown.days },
                    { en: 'HOURS', ar: 'ساعة', val: countdown.hours },
                    { en: 'MINUTES', ar: 'دقيقة', val: countdown.minutes },
                    { en: 'SECONDS', ar: 'ثانية', val: countdown.seconds },
                  ].map((cell) => (
                    <div
                      key={cell.en}
                      className="rounded-xl py-2.5 px-1.5 text-center border bg-white/92 border-[#E6DFCA] shadow-2xs"
                    >
                      <div
                        className="font-display text-xl sm:text-2xl font-bold tabular-nums leading-none"
                        style={{ color: spec.headingColor }}
                      >
                        {String(cell.val).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] font-semibold tracking-wider mt-1" style={{ color: spec.bodyColor }}>
                        {cell.en}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isFreeCard ? (
                <div className="flex flex-col items-center justify-center gap-1 pt-2 border-t border-[#E5DEC9]">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#DFD6BF]">
                    <VeloraBrandMark size="sm" />
                    <span className="text-[10px] font-bold text-[#6B5A78] border-r border-[#DFD6BF] pr-2">
                      صُممت مجانًا
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center gap-1.5 text-[10px] tracking-[0.22em] uppercase pt-1"
                  style={{ color: spec.headingColor }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: spec.accentColor }} />
                  <span>A DAY TO REMEMBER</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-[28px] shadow-2xl overflow-hidden transition-all"
      style={{
        background: spec.cardBg,
        border: `2px solid ${spec.cardBorder}`,
        color: spec.headingColor,
      }}
    >
      {/* Background stationery artwork if present */}
      {hasBgImage && resolvedBg && (
        <img
          src={resolvedBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
      )}

      {/* Readability surface layer matched to the chosen stationery artwork */}
      {invitation.designId === 'floral' && (
        <div className="absolute inset-5 sm:inset-8 rounded-3xl bg-white/82 backdrop-blur-[3px] border border-[#3C5E8C]/15 pointer-events-none" />
      )}
      {invitation.designId === 'classic' && (
        <div className="absolute inset-6 sm:inset-10 rounded-3xl bg-[#3C4D72]/78 backdrop-blur-[1px] pointer-events-none" />
      )}

      {/* Frame ornaments for non-artwork templates */}
      {!hasBgImage && spec.frameStyle === 'double_royal' && (
        <div
          className="absolute inset-3 rounded-2xl pointer-events-none"
          style={{ border: `1px solid ${spec.accentColor}55` }}
        />
      )}
      {!hasBgImage && spec.frameStyle === 'velvet_edge' && (
        <div className="absolute inset-x-0 top-0 h-2.5 bg-[#5B3278]" />
      )}
      {!hasBgImage && spec.frameStyle === 'modern_split' && (
        <div className="absolute top-0 right-0 w-3 h-full bg-[#5B3278]" />
      )}

      {/* Structured Invitation Layout */}
      <div
        className={`relative z-10 text-center max-w-xl mx-auto ${
          hasBgImage ? 'px-7 py-10 sm:px-14 sm:py-14' : 'px-6 py-9 sm:px-10 sm:py-12'
        } space-y-6`}
      >
        {/* Top Invitation Header Plate */}
        <div className="space-y-2.5">
          {isFreeCard && (
            <div className="flex justify-center pb-1">
              <div
                className={`inline-flex items-center gap-2.5 px-3 py-1 rounded-full border ${
                  isDarkCard
                    ? 'bg-white/95 border-[#EAD4A0]/60 text-[#5B3278]'
                    : 'bg-[#FAF7FD] border-[#E8DCF3] text-[#5B3278]'
                }`}
              >
                <VeloraBrandMark size="sm" />
                <span className="text-[10px] font-bold text-[#6B5A78] border-r border-[#E8DCF3] pr-2">
                  بطاقة مجانية
                </span>
              </div>
            </div>
          )}
          <p
            className="font-editorial text-[11px] sm:text-xs font-semibold tracking-[0.26em] uppercase"
            style={{ color: spec.accentColor }}
          >
            YOU ARE INVITED{isFreeCard ? ' · VÉLORA' : ''}
          </p>
          <p className="text-sm sm:text-base font-medium" style={{ color: spec.bodyColor }}>
            يتشرفان بدعوتكم لحضور حفل زفافهما
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight pt-1">
            {invitation.groomName}{' '}
            <span className="font-editorial italic" style={{ color: spec.accentColor }}>
              &amp;
            </span>{' '}
            {invitation.brideName}
          </h2>
        </div>

        {/* Optional Couple Portrait / Keepsake Photo */}
        {invitation.couplePhoto && (
          <div
            className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-[3px] shadow-md"
            style={{ borderColor: spec.accentColor }}
          >
            <img
              src={resolveMediaUrl(invitation.couplePhoto)}
              alt={`${invitation.groomName} و ${invitation.brideName}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Heartfelt Invitation Message */}
        <p
          className="text-sm sm:text-[15px] leading-relaxed max-w-md mx-auto"
          style={{ color: spec.bodyColor }}
        >
          {invitation.invitationText}
        </p>

        {/* 3-Column Date / Day / Time Strip with crisp vertical dividers */}
        <div
          className="grid grid-cols-3 items-center py-4 px-2 rounded-2xl border"
          style={{
            background: spec.countdownBg,
            borderColor: isDarkCard ? 'rgba(255,255,255,0.22)' : '#E2D4EE',
          }}
        >
          <div className="px-2 space-y-1">
            <span className="text-[11px] block" style={{ color: spec.accentColor }}>
              اليوم
            </span>
            <span className="text-sm sm:text-base font-bold block">{dateParts.dayName}</span>
          </div>

          <div
            className="px-2 border-x space-y-0.5"
            style={{ borderColor: isDarkCard ? 'rgba(255,255,255,0.2)' : '#D9C8EA' }}
          >
            <span
              className="font-display text-2xl sm:text-3xl font-bold block leading-none tabular-nums"
              style={{ color: isDarkCard ? spec.accentColor : spec.headingColor }}
            >
              {dateParts.dayNum}
            </span>
            <span className="text-[11px] font-medium block" style={{ color: spec.bodyColor }}>
              {dateParts.monthYear}
            </span>
          </div>

          <div className="px-2 space-y-1">
            <span className="text-[11px] block" style={{ color: spec.accentColor }}>
              الساعة
            </span>
            <span className="text-sm sm:text-base font-bold block tabular-nums">
              {dateParts.formattedTime}
            </span>
          </div>
        </div>

        {/* Venue Location + Map Trigger */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center gap-1.5 text-sm font-bold">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: spec.accentColor }} />
            <span>{invitation.venueName || 'القاعة الملكية'}</span>
          </div>
          {invitation.mapUrl && (
            <div>
              <a
                href={invitation.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-opacity hover:opacity-85"
                style={{
                  borderColor: isDarkCard ? 'rgba(255,255,255,0.35)' : spec.cardBorder,
                  color: isDarkCard ? '#FFFFFF' : spec.headingColor,
                }}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>الموقع على الخريطة</span>
              </a>
            </div>
          )}
        </div>

        {/* Dedicated Framed Countdown Box */}
        <div
          className="rounded-2xl p-4 sm:p-5 space-y-3 border"
          style={{
            background: spec.countdownBg,
            borderColor: isDarkCard ? 'rgba(255,255,255,0.22)' : '#DFCEF0',
          }}
        >
          <div className="space-y-0.5">
            <p
              className="font-editorial text-[10px] sm:text-[11px] tracking-[0.24em] uppercase"
              style={{ color: spec.accentColor }}
            >
              THE BIG DAY IS COMING
            </p>
            <p className="font-display text-lg sm:text-xl font-bold">
              {countdown.state === 'future' ? 'باقي على أجمل يوم' : countdown.statusMessageAr}
            </p>
          </div>

          {countdown.state === 'future' && (
            <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
              {[
                { en: 'DAYS', ar: 'يوم', val: countdown.days },
                { en: 'HOURS', ar: 'ساعة', val: countdown.hours },
                { en: 'MINUTES', ar: 'دقيقة', val: countdown.minutes },
                { en: 'SECONDS', ar: 'ثانية', val: countdown.seconds },
              ].map((cell) => (
                <div
                  key={cell.en}
                  className="rounded-xl py-2.5 px-1.5 text-center border"
                  style={{
                    background: isDarkCard ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDarkCard ? 'rgba(255,255,255,0.18)' : '#E8DCF3',
                  }}
                >
                  <div className="font-display text-xl sm:text-2xl font-bold tabular-nums leading-none">
                    {String(cell.val).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-semibold mt-1" style={{ color: spec.bodyColor }}>
                    {cell.ar}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isFreeCard ? (
            <div className="flex flex-col items-center justify-center gap-1 pt-2">
              <div
                className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border ${
                  isDarkCard
                    ? 'bg-white/95 border-[#EAD4A0]/60 text-[#5B3278]'
                    : 'bg-white border-[#E8DCF3] text-[#5B3278]'
                }`}
              >
                <VeloraBrandMark size="sm" />
                <span className="text-[10px] font-bold text-[#6B5A78] border-r border-[#E8DCF3] pr-2">
                  بطاقة مجانية
                </span>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center gap-1.5 text-[10px] tracking-[0.2em] uppercase pt-1"
              style={{ color: spec.accentColor }}
            >
              <Sparkles className="w-3 h-3" />
              <span>A DAY TO REMEMBER</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
