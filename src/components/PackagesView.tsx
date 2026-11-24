import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Crown,
  Heart,
  Phone,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type {
  SubscriptionAudience,
  SubscriptionBillingCycle,
  SubscriptionPlanRecord,
  UserProfile,
  UserRole,
  UserSubscriptionRecord,
} from '../types/velora';
import { apiFetch } from '../utils/api';
import { formatEgp } from '../utils/veloraLogic';

interface PackagesViewProps {
  user: UserProfile | null;
  onRequireAuth: (preferredRole?: UserRole) => void;
}

const STATUS_META: Record<
  UserSubscriptionRecord['status'],
  { label: string; className: string }
> = {
  pending: {
    label: 'قيد المراجعة',
    className: 'bg-[#F3ECF9] text-[#5B3278] border-[#DECFF0]',
  },
  active: {
    label: 'مفعّل الآن',
    className: 'bg-[#EEF8F2] text-[#1D6B44] border-[#C5E6D2]',
  },
  rejected: {
    label: 'مرفوض',
    className: 'bg-[#FDF1F2] text-[#9A2D3C] border-[#F3CFD4]',
  },
  cancelled: {
    label: 'ملغي',
    className: 'bg-[#F5F2F7] text-[#6B5A78] border-[#E4DCEB]',
  },
};

export const PackagesView: React.FC<PackagesViewProps> = ({ user, onRequireAuth }) => {
  const defaultAudience: SubscriptionAudience =
    user && user.role === 'client' ? 'client' : 'provider';

  const [audience, setAudience] = useState<SubscriptionAudience>(defaultAudience);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<UserSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanRecord | null>(null);
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [businessOrCoupleName, setBusinessOrCoupleName] = useState(user?.name || '');
  const [paymentMethod, setPaymentMethod] = useState('انستاباي (InstaPay)');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setContactPhone((prev) => prev || user.phone || '');
      setBusinessOrCoupleName((prev) => prev || user.name || '');
    }
  }, [user]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, mineRes] = await Promise.all([
        apiFetch<{ plans: SubscriptionPlanRecord[] }>('/api/subscription-plans'),
        user
          ? apiFetch<{ subscriptions: UserSubscriptionRecord[] }>('/api/subscriptions/mine').catch(() => ({
              subscriptions: [],
            }))
          : Promise.resolve({ subscriptions: [] }),
      ]);
      setPlans(plansRes.plans || []);
      setMySubscriptions(mineRes.subscriptions || []);
    } catch {
      // Keep UI responsive
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visiblePlans = useMemo(
    () => plans.filter((p) => p.audience === audience),
    [plans, audience]
  );

  const getCycleAmount = (plan: SubscriptionPlanRecord): number => {
    if (billingCycle === 'annual') return plan.annualPriceEgp;
    if (billingCycle === 'quarterly') return plan.quarterlyPriceEgp;
    return plan.monthlyPriceEgp;
  };

  const handleSelectPlan = (plan: SubscriptionPlanRecord) => {
    setFeedback(null);
    setSelectedPlan(plan);
    const amount = getCycleAmount(plan);
    if (plan.id === 'plan-client-free' && amount === 0) {
      setPaymentMethod('تفعيل مجاني');
    } else if (paymentMethod === 'تفعيل مجاني') {
      setPaymentMethod('انستاباي (InstaPay)');
    }
  };

  const handleSubmitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!user) {
      onRequireAuth(selectedPlan.audience === 'provider' ? 'venue_owner' : 'client');
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const cycleToSend: SubscriptionBillingCycle = billingCycle;

      const res = await apiFetch<{ subscription: UserSubscriptionRecord }>('/api/subscriptions/request', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle: cycleToSend,
          contactPhone,
          businessOrCoupleName,
          paymentMethod,
          notes,
        }),
      });
      setMySubscriptions((prev) => [res.subscription, ...prev]);
      setFeedback({
        type: 'ok',
        text: `تم استلام طلب اشتراكك في "${selectedPlan.nameAr}" بنجاح، وسيتم مراجعته وتفعيله فورًا.`,
      });
      setSelectedPlan(null);
      setNotes('');
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'تعذر إرسال طلب الاشتراك.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayedPrice = (plan: SubscriptionPlanRecord) => {
    const amount = getCycleAmount(plan);
    if (amount === 0) {
      return plan.id === 'plan-client-free' ? 'مجانية' : 'حسب الاتفاق';
    }
    return formatEgp(amount);
  };

  const displayedUnit = (plan: SubscriptionPlanRecord) => {
    const amount = getCycleAmount(plan);
    if (amount === 0) {
      return plan.id === 'plan-client-free' ? 'للعروسين مدى الحياة' : 'تواصل لتحديد السعر';
    }
    if (billingCycle === 'annual') return 'سنويًا (12 شهرًا)';
    if (billingCycle === 'quarterly') return 'كل 3 شهور';
    return 'شهريًا';
  };

  const cycleLabelAr =
    billingCycle === 'annual' ? 'سنوي' : billingCycle === 'quarterly' ? '3 شهور' : 'شهري';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      {/* Header Banner */}
      <section className="velora-card rounded-3xl p-6 sm:p-8 bg-gradient-to-l from-white via-[#FAF7FD] to-[#F3ECF9] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3278]">
              <Crown className="w-4 h-4 text-[#C5A25D]" />
              <span>باقات واشتراكات VÉLORA الرسمية</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#24172E]">
              باقات مرنة للقاعات والمصورين وللعروسين
            </h1>
            <p className="text-sm text-[#5E4D6B] leading-relaxed">
              اختر الاشتراك المناسب لنشاطك سواء كنت صاحب قاعة أفراح، مصورًا محترفًا، مقدم خدمات زفاف، أو عروسين
              تجهزان ليوم العمر بأدوات حصرية.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAudience('provider');
                setSelectedPlan(null);
              }}
              className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-colors ${
                audience === 'provider'
                  ? 'bg-[#5B3278] text-white border-[#5B3278]'
                  : 'bg-white text-[#5B3278] border-[#E8DCF3] hover:bg-[#FAF7FD]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>باقات القاعات والمصورين والخدمات</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAudience('client');
                setSelectedPlan(null);
              }}
              className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-colors ${
                audience === 'client'
                  ? 'bg-[#5B3278] text-white border-[#5B3278]'
                  : 'bg-white text-[#5B3278] border-[#E8DCF3] hover:bg-[#FAF7FD]'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>باقات العروسين والعملاء</span>
            </button>
          </div>
        </div>

        {/* 3-Period Billing Cycle Toggle: شهري | 3 شهور | سنوي */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E8DCF3]">
          <p className="text-xs font-semibold text-[#5E4D6B]">
            {audience === 'provider'
              ? 'اشتراكات مستضيفي الخدمات (القاعات، المصورين، الفساتين، الديكور، والتجهيزات)'
              : 'باقات مخصصة للعرسان لتخطيط الميزانية، الدعوات الملكية، وتنبيهات الواتساب'}
          </p>
          <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E8DCF3] gap-1">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-[#5B3278] text-white'
                  : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('quarterly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                billingCycle === 'quarterly'
                  ? 'bg-[#5B3278] text-white'
                  : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              3 شهور
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-[#5B3278] text-white'
                  : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              سنوي
            </button>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold ${
            feedback.type === 'ok'
              ? 'bg-[#EEF8F2] border-[#C5E6D2] text-[#1D6B44]'
              : 'bg-[#FDF1F2] border-[#F3CFD4] text-[#9A2D3C]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="velora-card rounded-3xl p-6 h-80 animate-pulse bg-[#FAF7FD]" />
          ))}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${
            visiblePlans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3'
          } gap-6 items-stretch`}
        >
          {visiblePlans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            const amount = getCycleAmount(plan);
            return (
              <article
                key={plan.id}
                className={`velora-card rounded-3xl p-6 flex flex-col justify-between transition-colors ${
                  plan.highlighted
                    ? 'border-2 border-[#5B3278] bg-gradient-to-b from-white to-[#FAF7FD]'
                    : isSelected
                    ? 'border-2 border-[#C5A25D]'
                    : 'border border-[#E8DCF3]'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-[#7A4C9E]">{plan.targetRolesAr}</p>
                      <h2 className="font-display text-xl font-bold text-[#24172E]">{plan.nameAr}</h2>
                    </div>
                    {plan.highlighted && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#5B3278] text-[#F5E6C8] text-[11px] font-bold shrink-0">
                        الأكثر اختيارًا
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#5E4D6B] leading-relaxed">{plan.taglineAr}</p>

                  <div className="py-4 border-y border-[#F0E7F8] space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-3xl font-bold text-[#5B3278] tabular-nums">
                        {displayedPrice(plan)}
                      </span>
                      <span className="text-xs font-semibold text-[#6B5A78]">
                        {displayedUnit(plan)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7C678D]">{plan.billingNoteAr}</p>
                  </div>

                  <ul className="space-y-2.5 pt-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-[#3E2D4C] leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-[#5B3278] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-colors ${
                      plan.highlighted
                        ? 'bg-[#5B3278] hover:bg-[#482461] text-white'
                        : 'bg-[#F3ECF9] hover:bg-[#5B3278] text-[#5B3278] hover:text-white'
                    }`}
                  >
                    {plan.id === 'plan-client-free' && amount === 0
                      ? 'طلب تفعيل الباقة المجانية'
                      : `اشترك الآن (${cycleLabelAr})`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Selected Plan Subscription Form */}
      {selectedPlan && (
        <section className="velora-card rounded-3xl p-6 sm:p-8 border-2 border-[#5B3278] bg-white space-y-5 max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F0E7F8]">
            <div>
              <p className="text-xs font-bold text-[#7A4C9E]">تأكيد طلب الاشتراك · مدة {cycleLabelAr}</p>
              <h3 className="font-display text-xl font-bold text-[#24172E]">
                {selectedPlan.nameAr} —{' '}
                <span className="text-[#5B3278] tabular-nums">{displayedPrice(selectedPlan)}</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="px-3 py-1.5 rounded-lg border border-[#E8DCF3] text-xs font-semibold text-[#5E4D6B] hover:bg-[#FAF7FD]"
            >
              إلغاء
            </button>
          </div>

          {!user ? (
            <div className="p-5 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#24172E]">سجّل الدخول أولًا لإتمام الاشتراك</p>
                <p className="text-xs text-[#5E4D6B]">
                  نربط اشتراكك بحسابك الرسمي لكي يتم تفعيل المزايا فور اعتماد الطلب.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onRequireAuth(selectedPlan.audience === 'provider' ? 'venue_owner' : 'client')
                }
                className="px-5 py-3 rounded-xl bg-[#5B3278] text-white text-xs font-bold shrink-0"
              >
                تسجيل الدخول / إنشاء حساب
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitSubscription} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                    {selectedPlan.audience === 'provider'
                      ? 'اسم القاعة / الاستوديو / النشاط'
                      : 'اسم العريس والعروسة'}
                  </label>
                  <input
                    required
                    value={businessOrCoupleName}
                    onChange={(e) => setBusinessOrCoupleName(e.target.value)}
                    placeholder={
                      selectedPlan.audience === 'provider' ? 'مثال: قصر الأوركيد' : 'مثال: كريم وندى'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                    رقم الهاتف / الواتساب للتفعيل
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8C799B] absolute right-3 top-3" />
                    <input
                      required
                      dir="ltr"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full pr-9 pl-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm text-left tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">وسيلة الدفع المفضلة</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm font-semibold"
                  >
                    <option value="انستاباي (InstaPay)">انستاباي (InstaPay)</option>
                    <option value="فودافون كاش / محفظة إلكترونية">فودافون كاش / محفظة إلكترونية</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="تفعيل مجاني">تفعيل مجاني / عند المعاينة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">ملاحظات إضافية</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: اسم المحافظة أو رقم التحويل إن وجد"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-[#6B5A78] inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#5B3278]" />
                  <span>يتم تفعيل الباقة وإرسال إشعار التأكيد فور مراجعة الطلب.</span>
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold disabled:opacity-60"
                >
                  {submitting ? 'جاري إرسال الطلب...' : 'إرسال طلب الاشتراك'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* User's Subscription History */}
      {user && (
        <section className="velora-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#5B3278]" />
              <h2 className="font-display text-xl font-bold text-[#24172E]">
                سجل اشتراكاتك وطلبات التفعيل ({mySubscriptions.length})
              </h2>
            </div>
            <span className="text-xs text-[#6B5A78]">متابعة فورية</span>
          </div>

          {mySubscriptions.length === 0 ? (
            <p className="text-xs text-[#6B5A78]">
              لا توجد اشتراكات مسجلة لحسابك حاليًا. اختر أي باقة أعلاه لإرسال طلب تفعيل.
            </p>
          ) : (
            <div className="space-y-3">
              {mySubscriptions.map((sub) => {
                const meta = STATUS_META[sub.status];
                const cycleText =
                  sub.billingCycle === 'annual'
                    ? 'سنوي'
                    : sub.billingCycle === 'quarterly'
                    ? '3 شهور'
                    : sub.billingCycle === 'one_time'
                    ? '6 أشهر'
                    : 'شهري';
                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`px-2.5 py-0.5 rounded-lg border font-bold ${meta.className}`}>
                          {meta.label}
                        </span>
                        <span className="font-bold text-[#24172E]">{sub.planNameAr}</span>
                        <span className="text-[#6B5A78]">· {cycleText} · {sub.businessOrCoupleName}</span>
                      </div>
                      <p className="text-xs text-[#5E4D6B]">
                        الدفع: {sub.paymentMethod} · الهاتف:{' '}
                        <span className="tabular-nums">{sub.contactPhone}</span>
                      </p>
                      {sub.adminNote && (
                        <p className="text-xs font-semibold text-[#5B3278]">ملاحظة: {sub.adminNote}</p>
                      )}
                    </div>
                    <div className="text-left sm:text-left space-y-1 shrink-0">
                      <p className="text-sm font-bold text-[#5B3278] tabular-nums">
                        {sub.amountEgp === 0 ? 'مجانية' : formatEgp(sub.amountEgp)}
                      </p>
                      {sub.startsAt && sub.endsAt ? (
                        <p className="text-[11px] text-[#6B5A78] inline-flex items-center gap-1 tabular-nums">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(sub.startsAt).toLocaleDateString('ar-EG')} —{' '}
                            {new Date(sub.endsAt).toLocaleDateString('ar-EG')}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#6B5A78] tabular-nums">
                          طلب بتاريخ {new Date(sub.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
