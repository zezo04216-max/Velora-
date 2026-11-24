import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  CalendarClock,
  Camera,
  CheckCircle2,
  CheckSquare,
  Compass,
  Layers,
  ListChecks,
  Plus,
  Save,
  Sparkles,
  Square,
  Trash2,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import type {
  BookingRecord,
  CoupleAgreementItem,
  CoupleChecklistCategory,
  CouplePrepItem,
  CoupleTaskItem,
  CoupleWorkspaceRecord,
  PhotographerRecord,
  ServiceRecord,
  UserProfile,
  VenueRecord,
  WeddingDreamStyle,
} from '../types/velora';
import { apiFetch } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import {
  COUPLE_PREP_CATEGORIES,
  EGYPT_GOVERNORATES,
  SERVICE_CATEGORIES,
  WEDDING_DREAM_STYLES,
  computeCountdown,
  computeEffectivePrice,
  computeWorkspaceBudgetSummary,
  formatEgp,
  getBookingStatusMeta,
} from '../utils/veloraLogic';
import { CinematicTabPanel } from './CinematicMotion';

export type WorkspaceTab = 'budget' | 'checklist' | 'compare' | 'schedule' | 'tasks' | 'smart';

interface CoupleWorkspaceViewProps {
  user: UserProfile | null;
  workspace: CoupleWorkspaceRecord;
  initialTab?: WorkspaceTab;
  bookings: BookingRecord[];
  venues: VenueRecord[];
  photographers: PhotographerRecord[];
  services: ServiceRecord[];
  onSaveWorkspace: (next: CoupleWorkspaceRecord) => Promise<void>;
  onSelectVenue: (id: string) => void;
  onSelectPhotographer: (id: string) => void;
  onNavigateFindWedding: () => void;
  onNavigateServices: () => void;
  onNavigateBookings: () => void;
  onRequireAuth: () => void;
}

export const CoupleWorkspaceView: React.FC<CoupleWorkspaceViewProps> = ({
  user,
  workspace,
  initialTab = 'budget',
  bookings,
  venues,
  photographers,
  services,
  onSaveWorkspace,
  onSelectVenue,
  onSelectPhotographer,
  onNavigateFindWedding,
  onNavigateServices,
  onNavigateBookings,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [draft, setDraft] = useState<CoupleWorkspaceRecord>(workspace);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');

  // Checklist add state
  const [newPrepLabel, setNewPrepLabel] = useState('');
  const [newPrepBudget, setNewPrepBudget] = useState('10000');

  // Tasks state
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskHorizon, setNewTaskHorizon] = useState('قبل الفرح بأسبوعين');
  const [newTaskDate, setNewTaskDate] = useState('');

  // Personal agreement schedule state
  const [newAgreementTitle, setNewAgreementTitle] = useState('');
  const [newAgreementVendor, setNewAgreementVendor] = useState('');
  const [newAgreementDate, setNewAgreementDate] = useState('');
  const [newAgreementTime, setNewAgreementTime] = useState('18:00');
  const [newAgreementLocation, setNewAgreementLocation] = useState('');

  // Live availability for Smart Recommendations
  const [reservedVenueIds, setReservedVenueIds] = useState<string[]>([]);
  const [reservedPhotoIds, setReservedPhotoIds] = useState<string[]>([]);

  useEffect(() => {
    setDraft(workspace);
  }, [workspace]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!draft.weddingDate) {
      setReservedVenueIds([]);
      setReservedPhotoIds([]);
      return;
    }
    let cancelled = false;
    apiFetch<{ reservedVenueIds: string[]; reservedPhotographerIds: string[] }>(
      `/api/availability?date=${encodeURIComponent(draft.weddingDate)}`
    )
      .then((res) => {
        if (!cancelled) {
          setReservedVenueIds(res.reservedVenueIds || []);
          setReservedPhotoIds(res.reservedPhotographerIds || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReservedVenueIds([]);
          setReservedPhotoIds([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft.weddingDate]);

  const budgetSummary = useMemo(
    () => computeWorkspaceBudgetSummary(draft, bookings),
    [draft, bookings]
  );

  const countdown = useMemo(
    () => computeCountdown(draft.weddingDate, '19:00'),
    [draft.weddingDate]
  );

  const tasksDoneCount = draft.tasks.filter((t) => t.done).length;
  const tasksPercent =
    draft.tasks.length > 0 ? Math.round((tasksDoneCount / draft.tasks.length) * 100) : 0;

  const commitWorkspace = async (next: CoupleWorkspaceRecord, toast = 'تم حفظ بيانات مساحة فرحنا بنجاح.') => {
    setDraft(next);
    setSaving(true);
    setSaveFeedback('');
    try {
      await onSaveWorkspace(next);
      setSaveFeedback(user ? toast : 'تم التحديث في المعاينة — سجّل الدخول لحفظ المساحة في حسابك بشكل دائم.');
    } catch (err) {
      setSaveFeedback(err instanceof Error ? err.message : 'تعذر حفظ التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  // Price Comparison logic (max 3 venues OR 3 photographers)
  const effectiveComparedIds = useMemo(() => {
    if (draft.compareMode === 'venue') {
      const valid = draft.comparedIds.filter((id) => venues.some((v) => v.id === id));
      return valid.length > 0 ? valid.slice(0, 3) : venues.slice(0, 3).map((v) => v.id);
    }
    const valid = draft.comparedIds.filter((id) => photographers.some((p) => p.id === id));
    return valid.length > 0 ? valid.slice(0, 3) : photographers.slice(0, 3).map((p) => p.id);
  }, [draft.compareMode, draft.comparedIds, venues, photographers]);

  const comparedVenues = useMemo(
    () =>
      effectiveComparedIds
        .map((id) => venues.find((v) => v.id === id))
        .filter((v): v is VenueRecord => Boolean(v)),
    [effectiveComparedIds, venues]
  );

  const comparedPhotographers = useMemo(
    () =>
      effectiveComparedIds
        .map((id) => photographers.find((p) => p.id === id))
        .filter((p): p is PhotographerRecord => Boolean(p)),
    [effectiveComparedIds, photographers]
  );

  const toggleCompareCandidate = (id: string) => {
    const current = effectiveComparedIds;
    let nextIds: string[];
    if (current.includes(id)) {
      if (current.length <= 1) return;
      nextIds = current.filter((x) => x !== id);
    } else if (current.length >= 3) {
      nextIds = [...current.slice(1), id];
    } else {
      nextIds = [...current, id];
    }
    commitWorkspace({ ...draft, comparedIds: nextIds }, 'تم تحديث جدول المقارنة.');
  };

  // Smart Recommendations tailored to couple's governorate, budget, date, guests, dreamStyle
  const smartRecommendations = useMemo(() => {
    const budget = Math.max(20000, draft.totalBudgetEgp || 180000);
    const gov = (draft.governorate || '').trim();
    const styleSpec = WEDDING_DREAM_STYLES.find((s) => s.id === draft.dreamStyle);
    const kws = styleSpec?.keywords || [];

    const scoreText = (blob: string) => kws.reduce((acc, kw) => (blob.includes(kw) ? acc + 10 : acc), 0);

    const recVenues = venues
      .filter((v) => !reservedVenueIds.includes(v.id))
      .map((v) => {
        const net = computeEffectivePrice(v.pricePerEvent, v.discountPercent);
        const cityMatch = `${v.city} ${v.area}`.includes(gov) ? 35 : 0;
        const capFit = draft.guestsCount >= v.capacityMin && draft.guestsCount <= v.capacityMax ? 30 : 0;
        const budgetFit = net <= budget * 0.65 ? 25 : -10;
        const styleFit = scoreText(`${v.titleAr} ${v.subtitleAr} ${v.decorStyles.join(' ')}`);
        return { venue: v, net, score: cityMatch + capFit + budgetFit + styleFit };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const recPhotos = photographers
      .filter((p) => !reservedPhotoIds.includes(p.id))
      .map((p) => {
        const net = computeEffectivePrice(p.startingPrice, p.discountPercent);
        const cityMatch = `${p.city} ${p.studioLocation}`.includes(gov) ? 30 : 0;
        const budgetFit = net <= budget * 0.25 ? 20 : 0;
        const styleFit = scoreText(`${p.displayName} ${p.specialtyAr} ${p.bioAr}`);
        return { photographer: p, net, score: cityMatch + budgetFit + styleFit + p.yearsExperience };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const recServices = services
      .map((s) => {
        const net = computeEffectivePrice(s.startingPrice, s.discountPercent);
        const cityMatch = `${s.city} ${s.area}`.includes(gov) ? 25 : 0;
        const styleFit = scoreText(`${s.titleAr} ${s.descriptionAr}`);
        return { service: s, net, score: cityMatch + styleFit };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return { recVenues, recPhotos, recServices };
  }, [venues, photographers, services, reservedVenueIds, reservedPhotoIds, draft]);

  const TABS: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'budget', label: 'ميزانية الفرح', icon: Wallet },
    { id: 'checklist', label: 'قائمة التجهيزات', icon: ListChecks },
    { id: 'compare', label: 'مقارنة الأسعار', icon: Layers },
    { id: 'schedule', label: 'جدول الحجوزات', icon: CalendarClock },
    { id: 'tasks', label: 'قائمة المهام', icon: CheckSquare },
    { id: 'smart', label: 'ترشيحات ذكية', icon: Sparkles },
  ];

  const handleAssignVendorToPrep = (
    category: CoupleChecklistCategory,
    vendorName: string,
    costEgp: number
  ) => {
    const existingIdx = draft.prepItems.findIndex((p) => p.category === category);
    const updatedPrep = [...draft.prepItems];
    if (existingIdx >= 0) {
      updatedPrep[existingIdx] = {
        ...updatedPrep[existingIdx],
        vendorName,
        allocatedEgp: costEgp,
        status: 'in_progress',
      };
    } else {
      updatedPrep.push({
        id: `prep-${Date.now()}`,
        category,
        labelAr: COUPLE_PREP_CATEGORIES.find((c) => c.category === category)?.labelAr || 'تجهيز فرح',
        vendorName,
        allocatedEgp: costEgp,
        paidEgp: 0,
        status: 'in_progress',
        notes: '',
      });
    }
    commitWorkspace({ ...draft, prepItems: updatedPrep }, `تم إدراج "${vendorName}" في قائمة التجهيزات.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      {/* Guest Sign-In Notice (when browsing before login) */}
      {!user && (
        <div className="p-4 rounded-2xl bg-[#F3ECF9] border border-[#DFCEF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#24172E]">
              أنت تستعرض مساحة فرحك في وضع المعاينة المؤقت
            </p>
            <p className="text-xs text-[#5E4D6B]">
              سجّل الدخول بحسابك أو بجوجل ليتم حفظ ميزانيتك وقائمة التجهيزات والمهام ومقارناتك تلقائيًا في حسابك الشخصي.
            </p>
          </div>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-4 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-bold shrink-0"
          >
            تسجيل الدخول وحفظ المساحة
          </button>
        </div>
      )}

      {/* Personal Couple Wedding Hero Banner */}
      <div className="velora-card rounded-3xl p-6 sm:p-8 bg-gradient-to-l from-white to-[#F3ECF9]/70 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5B3278]">
              <span>مساحة فرحنا الخاصة</span>
              <span aria-hidden="true">·</span>
              <span>{draft.governorate}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{draft.guestsCount} مدعو</span>
              {draft.weddingDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {countdown.state === 'future'
                      ? `متبقي ${countdown.days} يوم على الفرح`
                      : countdown.statusMessageAr}
                  </span>
                </>
              )}
            </div>
            <input
              value={draft.coupleTitle}
              onChange={(e) => setDraft({ ...draft, coupleTitle: e.target.value })}
              aria-label="عنوان مساحة الفرح"
              className="font-display text-2xl sm:text-3xl font-bold text-[#24172E] bg-transparent border-b border-transparent hover:border-[#DFCEF0] focus:border-[#5B3278] focus:outline-none w-full max-w-xl pb-1"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onNavigateFindWedding}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#E2D2F2] text-xs font-bold text-[#5B3278] hover:bg-[#FAF7FD]"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>اعثر على فرحك</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => commitWorkspace(draft)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#492563] text-white text-xs font-bold shadow-sm disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ المساحة'}</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E8DCF3]">
          <div className="p-4 rounded-2xl bg-white border border-[#E8DCF3]">
            <p className="text-[11px] font-semibold text-[#6B5A78]">ميزانية الفرح المحددة</p>
            <p className="font-display text-xl font-bold text-[#24172E] mt-1 tabular-nums">
              {formatEgp(budgetSummary.totalBudgetEgp)}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#E8DCF3]">
            <p className="text-[11px] font-semibold text-[#6B5A78]">المنصرف والمحجوز فعليًا</p>
            <p className="font-display text-xl font-bold text-[#5B3278] mt-1 tabular-nums">
              {formatEgp(budgetSummary.spentTotalEgp)}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#E8DCF3]">
            <p className="text-[11px] font-semibold text-[#6B5A78]">المتبقي من الميزانية</p>
            <p
              className={`font-display text-xl font-bold mt-1 tabular-nums ${
                budgetSummary.overBudget ? 'text-[#9A2D3C]' : 'text-[#1D6B44]'
              }`}
            >
              {budgetSummary.overBudget
                ? `- ${formatEgp(Math.abs(budgetSummary.remainingEgp))}`
                : formatEgp(budgetSummary.remainingEgp)}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#E8DCF3]">
            <p className="text-[11px] font-semibold text-[#6B5A78]">إنجاز المهام والتجهيز</p>
            <p className="font-display text-xl font-bold text-[#24172E] mt-1 tabular-nums">
              {tasksDoneCount}/{draft.tasks.length} ({tasksPercent}%)
            </p>
          </div>
        </div>
      </div>

      {saveFeedback && (
        <div className="p-3.5 rounded-xl bg-[#F3ECF9] border border-[#DFCEF0] text-xs font-semibold text-[#5B3278]">
          {saveFeedback}
        </div>
      )}

      {/* Workspace Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                active
                  ? 'text-white border-[#5B3278]'
                  : 'bg-white text-[#5E4D6B] border-[#E8DCF3] hover:bg-[#FAF7FD]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="workspace-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-[11px] bg-[#5B3278] shadow-xs"
                />
              )}
              <Icon className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      <CinematicTabPanel tabKey={activeTab} className="space-y-6">
        {/* 1. BUDGET TRACKER */}
        {activeTab === 'budget' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 velora-card rounded-3xl p-6 space-y-4">
              <h2 className="font-display text-xl font-bold text-[#24172E]">
                ضبط بيانات الفرح والميزانية
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                    الميزانية الإجمالية المستهدفة (ج.م)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={draft.totalBudgetEgp}
                    onChange={(e) =>
                      setDraft({ ...draft, totalBudgetEgp: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm font-bold text-[#5B3278] tabular-nums"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المحافظة</label>
                    <select
                      value={draft.governorate}
                      onChange={(e) => setDraft({ ...draft, governorate: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold text-[#24172E]"
                    >
                      {EGYPT_GOVERNORATES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">تاريخ الفرح</label>
                    <input
                      type="date"
                      value={draft.weddingDate}
                      onChange={(e) => setDraft({ ...draft, weddingDate: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold tabular-nums"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">عدد المدعوين</label>
                    <input
                      type="number"
                      min={20}
                      value={draft.guestsCount}
                      onChange={(e) =>
                        setDraft({ ...draft, guestsCount: Math.max(20, Number(e.target.value) || 150) })
                      }
                      className="w-full h-11 px-3 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">طابع الحفل</label>
                    <select
                      value={draft.dreamStyle}
                      onChange={(e) =>
                        setDraft({ ...draft, dreamStyle: e.target.value as WeddingDreamStyle })
                      }
                      className="w-full h-11 px-3 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold"
                    >
                      {WEDDING_DREAM_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.labelAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => commitWorkspace(draft, 'تم حفظ إعدادات الميزانية والفرح.')}
                  className="w-full py-3 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                >
                  حفظ الميزانية والبيانات
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 velora-card rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-[#24172E]">
                  توزيع الميزانية والمصروفات
                </h2>
                <span className="text-xs font-bold text-[#5B3278] tabular-nums">
                  {budgetSummary.spentPercent}% مستخدم
                </span>
              </div>

              {/* Meter Bar */}
              <div className="space-y-2">
                <div className="w-full h-3.5 rounded-full bg-[#F0E7F8] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      budgetSummary.overBudget ? 'bg-[#9A2D3C]' : 'bg-[#5B3278]'
                    }`}
                    style={{ width: `${Math.min(100, budgetSummary.spentPercent)}%` }}
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-[#5E4D6B] tabular-nums">
                  <span>المخطط في قائمة التجهيزات: {formatEgp(budgetSummary.allocatedTotalEgp)}</span>
                  <span>المدفوع فعليًا: {formatEgp(budgetSummary.paidTotalEgp)}</span>
                  <span>حجوزات المنصة: {formatEgp(budgetSummary.liveBookingsCommittedEgp)}</span>
                </div>
              </div>

              {/* Per-category mini breakdown */}
              <div className="space-y-2.5 pt-2 border-t border-[#F0E7F8] max-h-[340px] overflow-y-auto pr-1">
                {draft.prepItems.map((item) => {
                  const pct =
                    item.allocatedEgp > 0
                      ? Math.min(100, Math.round((item.paidEgp / item.allocatedEgp) * 100))
                      : 0;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#24172E]">
                          {item.labelAr}
                          {item.vendorName ? ` · ${item.vendorName}` : ''}
                        </span>
                        <span className="text-[#5E4D6B] tabular-nums">
                          دُفع {formatEgp(item.paidEgp)} / المخصص {formatEgp(item.allocatedEgp)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#FAF7FD] border border-[#EFE5F8] overflow-hidden">
                        <div
                          className="h-full bg-[#C5A25D]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. PREPARATION CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="space-y-5">
            <div className="velora-card rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#24172E]">
                    قائمة تجهيزات الفرح الشاملة
                  </h2>
                  <p className="text-xs text-[#5E4D6B]">
                    تابع كل بند (المصور، القاعة، الديكور، الفستان، البدلة، الكوافير وغيرها)، واكتب المورد والمبلغ المدفوع.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => commitWorkspace(draft, 'تم حفظ قائمة التجهيزات.')}
                  className="px-4 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                >
                  حفظ التعديلات
                </button>
              </div>

              <div className="space-y-3">
                {draft.prepItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                  >
                    <div className="md:col-span-3">
                      <input
                        value={item.labelAr}
                        onChange={(e) => {
                          const next = [...draft.prepItems];
                          next[idx] = { ...item, labelAr: e.target.value };
                          setDraft({ ...draft, prepItems: next });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8DCF3] text-xs font-bold text-[#24172E]"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <input
                        value={item.vendorName}
                        placeholder="اسم القاعة / المصور / الأتيليه..."
                        onChange={(e) => {
                          const next = [...draft.prepItems];
                          next[idx] = { ...item, vendorName: e.target.value };
                          setDraft({ ...draft, prepItems: next });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8DCF3] text-xs text-[#24172E]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-[#7C678D] mb-0.5">الميزانية المخصصة</label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={item.allocatedEgp}
                        onChange={(e) => {
                          const next = [...draft.prepItems];
                          next[idx] = { ...item, allocatedEgp: Math.max(0, Number(e.target.value) || 0) };
                          setDraft({ ...draft, prepItems: next });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8DCF3] text-xs font-bold tabular-nums"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-[#7C678D] mb-0.5">المدفوع</label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={item.paidEgp}
                        onChange={(e) => {
                          const next = [...draft.prepItems];
                          next[idx] = { ...item, paidEgp: Math.max(0, Number(e.target.value) || 0) };
                          setDraft({ ...draft, prepItems: next });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8DCF3] text-xs font-bold text-[#5B3278] tabular-nums"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <select
                        value={item.status}
                        onChange={(e) => {
                          const next = [...draft.prepItems];
                          next[idx] = {
                            ...item,
                            status: e.target.value as CouplePrepItem['status'],
                          };
                          setDraft({ ...draft, prepItems: next });
                        }}
                        className="flex-1 px-2.5 py-2 rounded-xl bg-white border border-[#E8DCF3] text-[11px] font-bold"
                      >
                        <option value="pending">لم يبدأ</option>
                        <option value="in_progress">قيد المقارنة</option>
                        <option value="booked">تم الحجز</option>
                        <option value="done">مكتمل</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const next = draft.prepItems.filter((p) => p.id !== item.id);
                          commitWorkspace({ ...draft, prepItems: next }, 'تم حذف البند.');
                        }}
                        className="p-2 rounded-lg bg-[#FDF1F2] text-[#9A2D3C]"
                        aria-label="حذف البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add custom preparation item */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newPrepLabel.trim()) return;
                  const nextItem: CouplePrepItem = {
                    id: `prep-${Date.now()}`,
                    category: 'other',
                    labelAr: newPrepLabel.trim(),
                    vendorName: '',
                    allocatedEgp: Math.max(0, Number(newPrepBudget) || 0),
                    paidEgp: 0,
                    status: 'pending',
                    notes: '',
                  };
                  setNewPrepLabel('');
                  commitWorkspace({ ...draft, prepItems: [...draft.prepItems, nextItem] }, 'تمت إضافة البند الجديد.');
                }}
                className="flex flex-wrap gap-2.5 pt-3 border-t border-[#F0E7F8]"
              >
                <input
                  value={newPrepLabel}
                  onChange={(e) => setNewPrepLabel(e.target.value)}
                  placeholder="أضف بندًا مخصصًا (مثل: سيارة الزفة، شهر العسل، شبكه...)"
                  className="flex-1 min-w-[220px] px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-white text-xs"
                />
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={newPrepBudget}
                  onChange={(e) => setNewPrepBudget(e.target.value)}
                  placeholder="الميزانية"
                  className="w-32 px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-white text-xs tabular-nums"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 3. SIDE-BY-SIDE PRICE COMPARISON (UP TO 3 VENUES OR 3 PHOTOGRAPHERS) */}
        {activeTab === 'compare' && (
          <div className="space-y-5">
            <div className="velora-card rounded-3xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#24172E]">
                    مقارنة الأسعار والمزايا (حتى 3 خيارات جنبًا إلى جنب)
                  </h2>
                  <p className="text-xs text-[#5E4D6B]">
                    اختر حتى 3 قاعات أو 3 مصورين لمقارنة السعر الصافي، الخصم، الموقع، السعة أو الخبرة، والتقييم بوضوح.
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F3ECF9]">
                  <button
                    type="button"
                    onClick={() =>
                      commitWorkspace({ ...draft, compareMode: 'venue', comparedIds: venues.slice(0, 3).map((v) => v.id) })
                    }
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                      draft.compareMode === 'venue'
                        ? 'bg-white text-[#5B3278] shadow-xs'
                        : 'text-[#5E4D6B]'
                    }`}
                  >
                    مقارنة القاعات ({venues.length})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      commitWorkspace({
                        ...draft,
                        compareMode: 'photographer',
                        comparedIds: photographers.slice(0, 3).map((p) => p.id),
                      })
                    }
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                      draft.compareMode === 'photographer'
                        ? 'bg-white text-[#5B3278] shadow-xs'
                        : 'text-[#5E4D6B]'
                    }`}
                  >
                    مقارنة المصورين ({photographers.length})
                  </button>
                </div>
              </div>

              {/* Candidate Selector Chips */}
              <div className="flex flex-wrap gap-2">
                {(draft.compareMode === 'venue' ? venues : photographers).map((entity) => {
                  const id = entity.id;
                  const title =
                    'titleAr' in entity ? entity.titleAr : entity.displayName;
                  const active = effectiveComparedIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCompareCandidate(id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                        active
                          ? 'bg-[#5B3278] text-white border-[#5B3278]'
                          : 'bg-[#FAF7FD] text-[#5E4D6B] border-[#E8DCF3] hover:bg-[#F3ECF9]'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {title}
                    </button>
                  );
                })}
              </div>

              {/* Comparison Grid */}
              {draft.compareMode === 'venue' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {comparedVenues.map((v) => {
                    const net = computeEffectivePrice(v.pricePerEvent, v.discountPercent);
                    return (
                      <div key={v.id} className="rounded-2xl border border-[#E8DCF3] bg-[#FAF7FD] overflow-hidden flex flex-col">
                        <div className="h-36 bg-[#EFE5F8] relative">
                          <img
                            src={resolveMediaUrl(v.coverImage)}
                            alt={v.titleAr}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            <h3 className="text-sm font-bold text-[#24172E]">{v.titleAr}</h3>
                            <div className="space-y-1.5 text-xs divide-y divide-[#EFE5F8]">
                              <div className="pt-1 flex justify-between">
                                <span className="text-[#6B5A78]">صافي السعر</span>
                                <span className="font-bold text-[#5B3278] tabular-nums">{formatEgp(net)}</span>
                              </div>
                              <div className="pt-1.5 flex justify-between">
                                <span className="text-[#6B5A78]">الخصم المتاح</span>
                                <span className="font-semibold tabular-nums">{v.discountPercent}%</span>
                              </div>
                              <div className="pt-1.5 flex justify-between">
                                <span className="text-[#6B5A78]">الموقع</span>
                                <span className="font-semibold">{v.city} · {v.area}</span>
                              </div>
                              <div className="pt-1.5 flex justify-between">
                                <span className="text-[#6B5A78]">السعة</span>
                                <span className="font-semibold tabular-nums">{v.capacityMin}–{v.capacityMax} فرد</span>
                              </div>
                              <div className="pt-1.5 flex justify-between">
                                <span className="text-[#6B5A78]">التقييم</span>
                                <span className="font-semibold tabular-nums">★ {v.avgRating} ({v.reviewsCount})</span>
                              </div>
                              <div className="pt-1.5">
                                <span className="text-[#6B5A78] block mb-1">أبرز المميزات</span>
                                <p className="text-[11px] text-[#24172E] leading-relaxed">
                                  {v.features.slice(0, 3).join(' · ') || v.decorStyles.join(' · ')}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAssignVendorToPrep('venue', v.titleAr, net)}
                              className="flex-1 py-2 rounded-xl bg-white border border-[#DFCEF0] text-[11px] font-bold text-[#5B3278]"
                            >
                              اعتماد في التجهيزات
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectVenue(v.id)}
                              className="px-3 py-2 rounded-xl bg-[#5B3278] text-white text-[11px] font-bold"
                            >
                              احجز
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {comparedPhotographers.map((p) => {
                    const net = computeEffectivePrice(p.startingPrice, p.discountPercent);
                    return (
                      <div key={p.id} className="rounded-2xl border border-[#E8DCF3] bg-[#FAF7FD] overflow-hidden flex flex-col">
                        <div className="h-36 bg-[#EFE5F8]">
                          <img
                            src={resolveMediaUrl(p.coverImage || p.avatarUrl)}
                            alt={p.displayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            <h3 className="text-sm font-bold text-[#24172E]">{p.displayName}</h3>
                            <div className="space-y-1.5 text-xs divide-y divide-[#EFE5F8]">
                              <div className="pt-1 flex justify-between">
                                <span className="text-[#6B5A78]">صافي الباقة</span>
                                <span className="font-bold text-[#5B3278] tabular-nums">{formatEgp(net)}</span>
                              </div>
                              <div className="pt-1.5 flex justify-between">
                                <span className="text-[#6B5A78]">الخصم المتاح</span>
                                <span className="font-semibold tabular-nums">{p.discountPercent}%</span>
                              </div>
                              <div className="pt-1.5 flex justify-between">
                                <span className="text-[#6B5A78]">المدينة</span>
                                <span className="font-semibold">{p.city}</span>
                              </div>
                              <div className="pt-1.5 flex justify-between">
                                <span className="text-[#6B5A78]">سنوات الخبرة</span>
                                <span className="font-semibold tabular-nums">{p.yearsExperience} سنوات</span>
                              </div>
                              <div className="pt-1.5 flex justify-between">
                                <span className="text-[#6B5A78]">التقييم</span>
                                <span className="font-semibold tabular-nums">★ {p.avgRating} ({p.reviewsCount})</span>
                              </div>
                              <div className="pt-1.5">
                                <span className="text-[#6B5A78] block mb-1">أنواع التغطية</span>
                                <p className="text-[11px] text-[#24172E] leading-relaxed">
                                  {p.shootingTypes.slice(0, 3).join(' · ') || p.specialtyAr}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAssignVendorToPrep('photographer', p.displayName, net)}
                              className="flex-1 py-2 rounded-xl bg-white border border-[#DFCEF0] text-[11px] font-bold text-[#5B3278]"
                            >
                              اعتماد في التجهيزات
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectPhotographer(p.id)}
                              className="px-3 py-2 rounded-xl bg-[#5B3278] text-white text-[11px] font-bold"
                            >
                              احجز
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. BOOKINGS & AGREEMENTS SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 velora-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-[#24172E]">
                  الحجوزات المسجلة على VÉLORA ({bookings.length})
                </h2>
                <button
                  type="button"
                  onClick={onNavigateBookings}
                  className="text-xs font-bold text-[#5B3278] hover:underline"
                >
                  عرض التفاصيل الكاملة
                </button>
              </div>
              {bookings.length === 0 ? (
                <p className="text-xs text-[#6B5A78] py-4">
                  لا توجد حجوزات مرسلة حتى الآن. استخدم «اعثر على فرحك» أو تصفح القاعات والمصورين لبدء أول حجز.
                </p>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => {
                    const meta = getBookingStatusMeta(b.status);
                    return (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-[#5B3278] tabular-nums">{b.eventDate}</span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-bold ${meta.textClass}`}>{meta.labelAr}</span>
                          </div>
                          <p className="text-sm font-bold text-[#24172E]">{b.targetTitle}</p>
                        </div>
                        <span className="text-xs font-bold text-[#24172E] tabular-nums">
                          {formatEgp(b.estimatedTotalEgp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Personal Meetings / Agreements */}
              <div className="pt-4 border-t border-[#F0E7F8] space-y-3">
                <h3 className="text-base font-bold text-[#24172E]">
                  مواعيد المعاينات والاتفاقات الشخصية ({draft.agreements.length})
                </h3>
                {draft.agreements.length === 0 ? (
                  <p className="text-xs text-[#6B5A78]">
                    سجّل هنا مواعيد المعاينات أو بروفة الفستان أو تسليم العربون لمتابعتها بسهولة.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {draft.agreements.map((agr) => (
                      <div
                        key={agr.id}
                        className="p-3.5 rounded-2xl bg-white border border-[#E8DCF3] flex items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const updated = draft.agreements.map((x) =>
                              x.id === agr.id
                                ? { ...x, status: x.status === 'completed' ? 'scheduled' : 'completed' }
                                : x
                            ) as CoupleAgreementItem[];
                            commitWorkspace({ ...draft, agreements: updated }, 'تم تحديث حالة الموعد.');
                          }}
                          className="text-right flex items-start gap-2.5 flex-1"
                        >
                          {agr.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-[#1D6B44] shrink-0 mt-0.5" />
                          ) : (
                            <CalendarCheck2 className="w-4 h-4 text-[#5B3278] shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p
                              className={`text-xs font-bold ${
                                agr.status === 'completed' ? 'line-through text-[#7C678D]' : 'text-[#24172E]'
                              }`}
                            >
                              {agr.titleAr} {agr.vendorName ? `— ${agr.vendorName}` : ''}
                            </p>
                            <p className="text-[11px] text-[#6B5A78] tabular-nums">
                              {agr.date} {agr.time ? `· ${agr.time}` : ''} {agr.location ? `· ${agr.location}` : ''}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            commitWorkspace(
                              { ...draft, agreements: draft.agreements.filter((x) => x.id !== agr.id) },
                              'تم حذف الموعد.'
                            )
                          }
                          className="p-2 rounded-lg bg-[#FDF1F2] text-[#9A2D3C]"
                          aria-label="حذف الموعد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add Appointment / Agreement Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAgreementTitle.trim() || !newAgreementDate.trim()) return;
                const nextAgr: CoupleAgreementItem = {
                  id: `agr-${Date.now()}`,
                  titleAr: newAgreementTitle.trim(),
                  vendorName: newAgreementVendor.trim(),
                  date: newAgreementDate,
                  time: newAgreementTime,
                  location: newAgreementLocation.trim(),
                  status: 'scheduled',
                };
                setNewAgreementTitle('');
                setNewAgreementVendor('');
                setNewAgreementLocation('');
                commitWorkspace(
                  { ...draft, agreements: [nextAgr, ...draft.agreements] },
                  'تم تسجيل الموعد في جدول الاتفاقات.'
                );
              }}
              className="lg:col-span-5 velora-card rounded-3xl p-6 space-y-4 h-fit"
            >
              <h3 className="font-display text-lg font-bold text-[#24172E]">
                إضافة موعد معاينة أو اتفاق جديد
              </h3>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">عنوان الموعد</label>
                <input
                  required
                  value={newAgreementTitle}
                  onChange={(e) => setNewAgreementTitle(e.target.value)}
                  placeholder="مثال: معاينة القاعة وتوقيع العقد / بروفة الفستان"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الجهة / المورد</label>
                <input
                  value={newAgreementVendor}
                  onChange={(e) => setNewAgreementVendor(e.target.value)}
                  placeholder="مثال: قصر الأوركيد / استوديو كريم"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">التاريخ</label>
                  <input
                    required
                    type="date"
                    value={newAgreementDate}
                    onChange={(e) => setNewAgreementDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الساعة</label>
                  <input
                    type="time"
                    value={newAgreementTime}
                    onChange={(e) => setNewAgreementTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المكان</label>
                <input
                  value={newAgreementLocation}
                  onChange={(e) => setNewAgreementLocation(e.target.value)}
                  placeholder="التجمع الخامس / الزمالك"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
              >
                إضافة إلى الجدول
              </button>
            </form>
          </div>
        )}

        {/* 5. WEDDING TASKS CHECKLIST */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 velora-card rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#24172E]">
                    قائمة المهام ({tasksDoneCount}/{draft.tasks.length} منجزة)
                  </h2>
                  <p className="text-xs text-[#5E4D6B]">
                    تابع كل ما تم إنجازه وما تبقى قبل ليلة الزفاف.
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F3ECF9]">
                  {(['all', 'open', 'done'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTaskFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        taskFilter === f ? 'bg-white text-[#5B3278]' : 'text-[#5E4D6B]'
                      }`}
                    >
                      {f === 'all' ? 'الكل' : f === 'open' ? 'لم ينفذ بعد' : 'تم الإنجاز'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {draft.tasks
                  .filter((t) =>
                    taskFilter === 'all' ? true : taskFilter === 'done' ? t.done : !t.done
                  )
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const updated = draft.tasks.map((x) =>
                            x.id === task.id ? { ...x, done: !x.done } : x
                          );
                          commitWorkspace({ ...draft, tasks: updated }, 'تم تحديث حالة المهمة.');
                        }}
                        className="flex items-center gap-3 text-right flex-1"
                      >
                        {task.done ? (
                          <CheckSquare className="w-5 h-5 text-[#1D6B44] shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-[#5B3278] shrink-0" />
                        )}
                        <div>
                          <p
                            className={`text-xs sm:text-sm font-bold ${
                              task.done ? 'line-through text-[#7C678D]' : 'text-[#24172E]'
                            }`}
                          >
                            {task.titleAr}
                          </p>
                          <p className="text-[11px] text-[#6B5A78]">
                            {task.horizonAr}
                            {task.dueDate ? ` · ${task.dueDate}` : ''}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          commitWorkspace(
                            { ...draft, tasks: draft.tasks.filter((x) => x.id !== task.id) },
                            'تم حذف المهمة.'
                          )
                        }
                        className="p-2 rounded-lg bg-[#FDF1F2] text-[#9A2D3C]"
                        aria-label="حذف المهمة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTaskTitle.trim()) return;
                const nextTask: CoupleTaskItem = {
                  id: `task-${Date.now()}`,
                  titleAr: newTaskTitle.trim(),
                  horizonAr: newTaskHorizon.trim() || 'مهمة فرح',
                  done: false,
                  dueDate: newTaskDate,
                };
                setNewTaskTitle('');
                commitWorkspace({ ...draft, tasks: [nextTask, ...draft.tasks] }, 'تمت إضافة المهمة.');
              }}
              className="lg:col-span-4 velora-card rounded-3xl p-6 space-y-4 h-fit"
            >
              <h3 className="font-display text-lg font-bold text-[#24172E]">إضافة مهمة جديدة</h3>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المهمة</label>
                <input
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="مثال: استلام خواتم الزفاف / مراجعة قائمة الأغاني"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المرحلة الزمنية</label>
                <input
                  value={newTaskHorizon}
                  onChange={(e) => setNewTaskHorizon(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">تاريخ التنفيذ (اختياري)</label>
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
              >
                إضافة إلى المهام
              </button>
            </form>
          </div>
        )}

        {/* 6. SMART RECOMMENDATIONS MATCHED TO WORKSPACE */}
        {activeTab === 'smart' && (
          <div className="space-y-6">
            <div className="velora-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-xl font-bold text-[#24172E]">
                  ترشيحات VÉLORA الذكية لمساحتك
                </h2>
                <p className="text-xs text-[#5E4D6B]">
                  مختارة تلقائيًا حسب محافظة <strong>{draft.governorate}</strong> · ميزانية{' '}
                  <strong className="tabular-nums">{formatEgp(draft.totalBudgetEgp)}</strong> ·{' '}
                  <strong className="tabular-nums">{draft.guestsCount}</strong> مدعو ·{' '}
                  {draft.weddingDate ? `متاحة بتاريخ ${draft.weddingDate}` : 'لأي موعد'}
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateFindWedding}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-bold shrink-0"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>افتح «اعثر على فرحك» لباقات متكاملة</span>
              </button>
            </div>

            {/* Recommended Venues */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-[#24172E] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#5B3278]" />
                <span>قاعات مناسبة لميزانيتك وموقعك</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {smartRecommendations.recVenues.map(({ venue, net }) => (
                  <div key={venue.id} className="velora-card rounded-2xl overflow-hidden flex flex-col">
                    <div className="h-40 bg-[#EFE5F8]">
                      <img
                        src={resolveMediaUrl(venue.coverImage)}
                        alt={venue.titleAr}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-[#5B3278]">
                          {venue.city} · سعة {venue.capacityMin}–{venue.capacityMax}
                        </p>
                        <h4 className="text-sm font-bold text-[#24172E] mt-0.5">{venue.titleAr}</h4>
                        <p className="text-xs font-bold text-[#5B3278] mt-1 tabular-nums">
                          {formatEgp(net)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAssignVendorToPrep('venue', venue.titleAr, net)}
                          className="flex-1 py-2 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] text-[11px] font-bold text-[#5B3278]"
                        >
                          إدراج بالتجهيزات
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectVenue(venue.id)}
                          className="px-3 py-2 rounded-xl bg-[#5B3278] text-white text-[11px] font-bold"
                        >
                          التفاصيل
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Photographers */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-[#24172E] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#5B3278]" />
                <span>مصورون متاحون لموعد فرحك</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {smartRecommendations.recPhotos.map(({ photographer, net }) => (
                  <div key={photographer.id} className="velora-card rounded-2xl overflow-hidden flex flex-col">
                    <div className="h-40 bg-[#EFE5F8]">
                      <img
                        src={resolveMediaUrl(photographer.coverImage || photographer.avatarUrl)}
                        alt={photographer.displayName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-[#5B3278]">
                          {photographer.city} · خبرة {photographer.yearsExperience} سنوات
                        </p>
                        <h4 className="text-sm font-bold text-[#24172E] mt-0.5">
                          {photographer.displayName}
                        </h4>
                        <p className="text-xs font-bold text-[#5B3278] mt-1 tabular-nums">
                          {formatEgp(net)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleAssignVendorToPrep('photographer', photographer.displayName, net)
                          }
                          className="flex-1 py-2 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] text-[11px] font-bold text-[#5B3278]"
                        >
                          إدراج بالتجهيزات
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectPhotographer(photographer.id)}
                          className="px-3 py-2 rounded-xl bg-[#5B3278] text-white text-[11px] font-bold"
                        >
                          الألبوم والحجز
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Complementary Services */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#24172E] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#5B3278]" />
                  <span>خدمات تجهيز مرشحة (كوشة، ديكور، تنظيم، ضيافة)</span>
                </h3>
                <button
                  type="button"
                  onClick={onNavigateServices}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#5B3278] hover:underline"
                >
                  <span>كل الخدمات</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {smartRecommendations.recServices.map(({ service, net }) => {
                  const catLabel =
                    SERVICE_CATEGORIES.find((c) => c.key === service.category)?.labelAr || service.category;
                  const mappedPrepCategory: CoupleChecklistCategory =
                    service.category === 'kosha'
                      ? 'kosha'
                      : service.category === 'flowers'
                      ? 'flowers'
                      : service.category === 'catering'
                      ? 'catering'
                      : service.category === 'music'
                      ? 'music'
                      : 'decor';
                  return (
                    <div key={service.id} className="velora-card rounded-2xl p-4 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-[#5B3278]">{catLabel}</p>
                        <h4 className="text-xs font-bold text-[#24172E] mt-0.5">{service.titleAr}</h4>
                        <p className="text-[11px] text-[#6B5A78] mt-0.5">{service.providerName}</p>
                        <p className="text-xs font-bold text-[#5B3278] mt-1.5 tabular-nums">
                          {formatEgp(net)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAssignVendorToPrep(mappedPrepCategory, service.titleAr, net)}
                        className="w-full py-2 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] text-[11px] font-bold text-[#5B3278]"
                      >
                        إدراج في التجهيزات
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CinematicTabPanel>
    </div>
  );
};
