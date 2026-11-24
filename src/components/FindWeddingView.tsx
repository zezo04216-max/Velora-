import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  Compass,
  Layers,
  MapPin,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import type {
  CoupleWorkspaceRecord,
  FindWeddingInput,
  WeddingDreamStyle,
  WeddingMatchPackage,
} from '../types/velora';
import { apiFetch } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import {
  EGYPT_GOVERNORATES,
  SERVICE_CATEGORIES,
  WEDDING_DREAM_STYLES,
  computeEffectivePrice,
  formatEgp,
} from '../utils/veloraLogic';
import { CinematicSection } from './CinematicMotion';

interface FindWeddingViewProps {
  workspace: CoupleWorkspaceRecord | null;
  onSelectVenue: (id: string) => void;
  onSelectPhotographer: (id: string) => void;
  onNavigateServices: () => void;
  onApplyPackageToWorkspace: (input: FindWeddingInput, pkg: WeddingMatchPackage) => Promise<void>;
  onOpenWorkspaceCompare: (mode: 'venue' | 'photographer', ids: string[]) => void;
}

export const FindWeddingView: React.FC<FindWeddingViewProps> = ({
  workspace,
  onSelectVenue,
  onSelectPhotographer,
  onNavigateServices,
  onApplyPackageToWorkspace,
  onOpenWorkspaceCompare,
}) => {
  const defaultFutureDate = new Date(Date.now() + 45 * 86400 * 1000).toISOString().slice(0, 10);

  const [governorate, setGovernorate] = useState(workspace?.governorate || 'القاهرة');
  const [weddingDate, setWeddingDate] = useState(workspace?.weddingDate || defaultFutureDate);
  const [budgetEgp, setBudgetEgp] = useState<number>(workspace?.totalBudgetEgp || 180000);
  const [guestsCount, setGuestsCount] = useState<number>(workspace?.guestsCount || 220);
  const [dreamStyle, setDreamStyle] = useState<WeddingDreamStyle>(
    workspace?.dreamStyle || 'royal_palace'
  );

  const [packages, setPackages] = useState<WeddingMatchPackage[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [reservedCount, setReservedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applyingTier, setApplyingTier] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const runFinder = useCallback(
    async (payload: FindWeddingInput) => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await apiFetch<{
          packages: WeddingMatchPackage[];
          availabilityChecked: boolean;
          reservedCount: number;
        }>('/api/find-wedding', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setPackages(res.packages || []);
        setAvailabilityChecked(Boolean(res.availabilityChecked));
        setReservedCount(Number(res.reservedCount) || 0);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'تعذر تجهيز الاقتراحات الآن.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    runFinder({
      governorate,
      weddingDate,
      budgetEgp,
      guestsCount,
      dreamStyle,
    });
    // Run initial match cleanly on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runFinder({
      governorate,
      weddingDate,
      budgetEgp,
      guestsCount,
      dreamStyle,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-10">
      {/* Editorial Intro Header */}
      <CinematicSection className="velora-card rounded-3xl p-6 sm:p-10 bg-gradient-to-l from-white via-[#FAF7FD] to-[#F3ECF9]/70 space-y-6">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5B3278]">
            <Compass className="w-4 h-4" />
            <span>محرك التخطيط الذكي من VÉLORA</span>
            <span aria-hidden="true">·</span>
            <span>فحص التوفر الفعلي في تاريخ الفرح</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#24172E] leading-tight">
            اعثر على فرحك المتكامل في دقائق
          </h1>
          <p className="text-sm sm:text-base text-[#5E4D6B] leading-relaxed">
            حدّد المحافظة وتاريخ الفرح وميزانيتك وعدد المدعوين والطابع الذي تحلم به، وستجهز لك VÉLORA باقات متكاملة من
            القاعات والمصورين والخدمات المتاحة فعليًا في يومك دون أي تعارض حجوزات.
          </p>
        </div>

        {/* 5-Input Matchmaker Form */}
        <form onSubmit={handleSubmit} className="space-y-6 pt-2 border-t border-[#E8DCF3]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Governorate */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#24172E]">
                <MapPin className="w-3.5 h-3.5 text-[#5B3278]" />
                <span>المحافظة</span>
              </label>
              <select
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2D2F2] bg-white text-sm font-semibold text-[#24172E] focus:outline-none focus:border-[#5B3278]"
              >
                {EGYPT_GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Wedding Date */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#24172E]">
                <CalendarCheck2 className="w-3.5 h-3.5 text-[#5B3278]" />
                <span>تاريخ الفرح</span>
              </label>
              <input
                type="date"
                required
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2D2F2] bg-white text-sm font-semibold text-[#24172E] tabular-nums focus:outline-none focus:border-[#5B3278]"
              />
            </div>

            {/* Total Budget */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#24172E]">
                <Wallet className="w-3.5 h-3.5 text-[#5B3278]" />
                <span>الميزانية الكلية (ج.م)</span>
              </label>
              <input
                type="number"
                required
                min={20000}
                step={5000}
                value={budgetEgp}
                onChange={(e) => setBudgetEgp(Number(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2D2F2] bg-white text-sm font-bold text-[#5B3278] tabular-nums focus:outline-none focus:border-[#5B3278]"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[100000, 180000, 280000, 400000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBudgetEgp(preset)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums border transition-colors ${
                      budgetEgp === preset
                        ? 'bg-[#5B3278] text-white border-[#5B3278]'
                        : 'bg-white text-[#5E4D6B] border-[#E8DCF3] hover:bg-[#FAF7FD]'
                    }`}
                  >
                    {Math.round(preset / 1000)} ألف
                  </button>
                ))}
              </div>
            </div>

            {/* Guests Count */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#24172E]">
                <Users className="w-3.5 h-3.5 text-[#5B3278]" />
                <span>عدد المدعوين</span>
              </label>
              <input
                type="number"
                required
                min={30}
                max={2000}
                step={10}
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value) || 100)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2D2F2] bg-white text-sm font-bold text-[#24172E] tabular-nums focus:outline-none focus:border-[#5B3278]"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[120, 220, 350, 500].map((gPreset) => (
                  <button
                    key={gPreset}
                    type="button"
                    onClick={() => setGuestsCount(gPreset)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums border transition-colors ${
                      guestsCount === gPreset
                        ? 'bg-[#5B3278] text-white border-[#5B3278]'
                        : 'bg-white text-[#5E4D6B] border-[#E8DCF3] hover:bg-[#FAF7FD]'
                    }`}
                  >
                    {gPreset} فرد
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Wedding Dream Style Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#24172E]">
              نوع وطابع الفرح الذي تحلم به
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {WEDDING_DREAM_STYLES.map((style) => {
                const selected = dreamStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setDreamStyle(style.id)}
                    className={`p-3.5 rounded-2xl border text-right transition-all ${
                      selected
                        ? 'bg-[#5B3278] text-white border-[#5B3278] shadow-sm'
                        : 'bg-white text-[#24172E] border-[#E8DCF3] hover:bg-[#FAF7FD]'
                    }`}
                  >
                    <p className="text-xs font-bold">{style.labelAr}</p>
                    <p
                      className={`text-[11px] mt-1 leading-relaxed ${
                        selected ? 'text-[#EFE5F8]' : 'text-[#6B5A78]'
                      }`}
                    >
                      {style.subtitleAr}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#5E4D6B]">
              {availabilityChecked ? (
                <>
                  تم فحص التوفر الفعلي بتاريخ <span className="font-bold tabular-nums">{weddingDate}</span>
                  {reservedCount > 0 ? ` · استبعاد ${reservedCount} خيار محجوز في نفس اليوم` : ' · جميع القاعات والمصورين المرشحين متاحون'}
                </>
              ) : (
                'اختر تاريخ الفرح لفحص التوفر الفعلي ومنع تعارض المواعيد.'
              )}
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5B3278] hover:bg-[#492563] text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'جاري تجهيز خطط فرحك...' : 'جهّز اقتراحات فرحي الآن'}</span>
            </button>
          </div>
        </form>
      </CinematicSection>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-[#FDF1F2] border border-[#EAC1C7] text-xs font-semibold text-[#9A2D3C]">
          {errorMsg}
        </div>
      )}

      {/* Curated Integrated Packages */}
      <CinematicSection className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#5B3278]">ترشيحات VÉLORA الجاهزة</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
              خطط فرح متكاملة مصممة لطلبك ({packages.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              const ids = packages.map((p) => p.venue?.id).filter((id): id is string => Boolean(id)).slice(0, 3);
              onOpenWorkspaceCompare('venue', ids);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3278] hover:underline"
          >
            <Layers className="w-4 h-4" />
            <span>مقارنة القاعات المرشحة في مساحتك</span>
          </button>
        </div>

        {loading && packages.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="velora-card rounded-3xl p-6 h-80 animate-pulse bg-white" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="velora-card rounded-3xl p-8 sm:p-10 text-center space-y-4 bg-white">
            <div className="w-12 h-12 rounded-2xl bg-[#F3ECF9] text-[#5B3278] flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="font-display text-xl font-bold text-[#24172E]">
                لا توجد قاعات أو مصورون مسجلون في محافظة «{governorate}» حاليًا
              </h3>
              <p className="text-xs sm:text-sm text-[#5E4D6B] leading-relaxed">
                لضمان دقة الترشيح بنسبة 100%، لا نعرض لك عروضًا من محافظات أخرى غير المحافظة التي اخترتها.
                يمكنك تجربة محافظة قريبة أو استعراض الخدمات المتوفرة.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setGovernorate('القاهرة');
                  runFinder({
                    governorate: 'القاهرة',
                    weddingDate,
                    budgetEgp,
                    guestsCount,
                    dreamStyle,
                  });
                }}
                className="px-4 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
              >
                عرض ترشيحات القاهرة
              </button>
              <button
                type="button"
                onClick={onNavigateServices}
                className="px-4 py-2.5 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-bold"
              >
                تصفح جميع الخدمات
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {packages.map((pkg) => {
              const isIdeal = pkg.tier === 'ideal';
              return (
                <div
                  key={pkg.tier}
                  className={`velora-card rounded-3xl p-6 flex flex-col justify-between gap-5 ${
                    isIdeal ? 'ring-1 ring-[#5B3278]/30 bg-white' : 'bg-white'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Package Header */}
                    <div className="space-y-1.5 border-b border-[#F0E7F8] pb-4">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[#5B3278]">{pkg.tierLabelAr}</span>
                        <span
                          className={`font-semibold tabular-nums ${
                            pkg.withinBudget ? 'text-[#1D6B44]' : 'text-[#9A631A]'
                          }`}
                        >
                          {pkg.withinBudget ? 'ضمن الميزانية' : 'فئة مميزة'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-display text-2xl font-bold text-[#24172E] tabular-nums">
                          {formatEgp(pkg.estimatedTotalEgp)}
                        </p>
                        <p className="text-xs text-[#6B5A78] tabular-nums">
                          {pkg.remainingBudgetEgp >= 0
                            ? `متبقي ${formatEgp(pkg.remainingBudgetEgp)}`
                            : `فوق الميزانية بـ ${formatEgp(Math.abs(pkg.remainingBudgetEgp))}`}
                        </p>
                      </div>
                      <p className="text-xs text-[#5E4D6B] leading-relaxed">{pkg.matchSummaryAr}</p>
                    </div>

                    {/* Matched Venue */}
                    {pkg.venue && (
                      <button
                        type="button"
                        onClick={() => onSelectVenue(pkg.venue!.id)}
                        className="w-full text-right p-3 rounded-2xl bg-[#FAF7FD] hover:bg-[#F3ECF9] border border-[#E8DCF3] flex items-center gap-3 transition-colors"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#EFE5F8]">
                          <img
                            src={resolveMediaUrl(pkg.venue.coverImage)}
                            alt={pkg.venue.titleAr}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5B3278]">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span>القاعة المقترحة</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {formatEgp(computeEffectivePrice(pkg.venue.pricePerEvent, pkg.venue.discountPercent))}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#24172E] truncate mt-0.5">
                            {pkg.venue.titleAr}
                          </p>
                          <p className="text-[11px] text-[#6B5A78] truncate">
                            {pkg.venue.city} · سعة {pkg.venue.capacityMin}–{pkg.venue.capacityMax} ضيف
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Matched Photographer */}
                    {pkg.photographer && (
                      <button
                        type="button"
                        onClick={() => onSelectPhotographer(pkg.photographer!.id)}
                        className="w-full text-right p-3 rounded-2xl bg-[#FAF7FD] hover:bg-[#F3ECF9] border border-[#E8DCF3] flex items-center gap-3 transition-colors"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#EFE5F8]">
                          <img
                            src={resolveMediaUrl(pkg.photographer.avatarUrl || pkg.photographer.coverImage)}
                            alt={pkg.photographer.displayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5B3278]">
                            <Camera className="w-3.5 h-3.5 shrink-0" />
                            <span>المصور المقترح</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {formatEgp(
                                computeEffectivePrice(
                                  pkg.photographer.startingPrice,
                                  pkg.photographer.discountPercent
                                )
                              )}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#24172E] truncate mt-0.5">
                            {pkg.photographer.displayName}
                          </p>
                          <p className="text-[11px] text-[#6B5A78] truncate">
                            {pkg.photographer.city} · {pkg.photographer.specialtyAr}
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Matched Services */}
                    {pkg.services.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-[#5E4D6B]">الخدمات المكملة في الباقة</p>
                        {pkg.services.map((s) => {
                          const cat =
                            SERVICE_CATEGORIES.find((c) => c.key === s.category)?.labelAr || s.category;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={onNavigateServices}
                              className="w-full text-right px-3 py-2 rounded-xl bg-white hover:bg-[#FAF7FD] border border-[#E8DCF3] flex items-center justify-between gap-2 text-xs transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-[#24172E] truncate">{s.titleAr}</p>
                                <p className="text-[11px] text-[#6B5A78]">
                                  {cat} · {s.providerName}
                                </p>
                              </div>
                              <span className="font-bold text-[#5B3278] tabular-nums shrink-0">
                                {formatEgp(computeEffectivePrice(s.startingPrice, s.discountPercent))}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Match Reasons */}
                    <div className="space-y-1.5 pt-1">
                      {pkg.reasonsAr.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px] text-[#5E4D6B]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#5B3278] shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Primary Action */}
                  <div className="pt-3 border-t border-[#F0E7F8] space-y-2">
                    <button
                      type="button"
                      disabled={applyingTier === pkg.tier}
                      onClick={async () => {
                        setApplyingTier(pkg.tier);
                        try {
                          await onApplyPackageToWorkspace(
                            { governorate, weddingDate, budgetEgp, guestsCount, dreamStyle },
                            pkg
                          );
                        } finally {
                          setApplyingTier(null);
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-[#5B3278] hover:bg-[#492563] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                      <span>
                        {applyingTier === pkg.tier
                          ? 'جاري الحفظ في مساحتك...'
                          : 'اعتماد الخطة داخل مساحة فرحنا'}
                      </span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CinematicSection>
    </div>
  );
};
