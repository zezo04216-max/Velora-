import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  Lock,
  Mail,
  MessageCircle,
  MessageSquareQuote,
  Play,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  AdminAuditLogRecord,
  BookingRecord,
  CustomerRequestRecord,
  ElectronicInvitationRecord,
  InvitationDesignId,
  PhotographerRecord,
  ReviewRecord,
  ServiceRecord,
  SubscriptionPlanRecord,
  UpcomingReminderPreview,
  UserProfile,
  UserRole,
  UserSubscriptionRecord,
  VenueRecord,
  WhatsAppConfigSummary,
  WhatsAppMilestone,
  WhatsAppReminderRecord,
} from '../types/velora';
import { apiFetch, setClientAuthToken } from '../utils/api';
import { INVITATION_DESIGNS, formatEgp, getBookingStatusMeta } from '../utils/veloraLogic';
import { motion } from 'motion/react';
import { CinematicTabPanel } from './CinematicMotion';

interface AdminDashboardViewProps {
  user: UserProfile | null;
  onAuthSuccess: (user: UserProfile, token: string) => void;
  onDataChanged: () => void;
}

type AdminTab =
  | 'bookings'
  | 'subscriptions'
  | 'requests'
  | 'reviews'
  | 'photographers'
  | 'venues'
  | 'services'
  | 'users'
  | 'invitations'
  | 'reminders'
  | 'notifications'
  | 'settings';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  user,
  onAuthSuccess,
  onDataChanged,
}) => {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [requiresPasscode, setRequiresPasscode] = useState(false);

  // Admin Claim / Login state (no hardcoded admin secrets in code)
  const [claimName, setClaimName] = useState('إدارة VÉLORA');
  const [claimContact, setClaimContact] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [claimPasscode, setClaimPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard Overview State
  const [activeTab, setActiveTab] = useState<AdminTab>('bookings');
  const [loading, setLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [photographers, setPhotographers] = useState<PhotographerRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [requests, setRequests] = useState<CustomerRequestRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [invitations, setInvitations] = useState<ElectronicInvitationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);

  // Broadcast notification state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');

  // WhatsApp Automated Reminders state
  const [waConfig, setWaConfig] = useState<WhatsAppConfigSummary | null>(null);
  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminderPreview[]>([]);
  const [reminderLogs, setReminderLogs] = useState<WhatsAppReminderRecord[]>([]);
  const [waBusy, setWaBusy] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMilestone, setTestMilestone] = useState<WhatsAppMilestone>('3d');
  const [testClientName, setTestClientName] = useState('سلمى حسام');

  // Subscriptions & Plans state
  const [subPlans, setSubPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [subRequests, setSubRequests] = useState<UserSubscriptionRecord[]>([]);
  const [invitationPrices, setInvitationPrices] = useState<Record<InvitationDesignId, number>>({
    royal: INVITATION_DESIGNS.royal.priceEgp,
    luxury: INVITATION_DESIGNS.luxury.priceEgp,
    romantic: INVITATION_DESIGNS.romantic.priceEgp,
    classic: INVITATION_DESIGNS.classic.priceEgp,
    modern: INVITATION_DESIGNS.modern.priceEgp,
    floral: INVITATION_DESIGNS.floral.priceEgp,
    minimal: INVITATION_DESIGNS.minimal.priceEgp,
  });

  const loadAdminOverview = async () => {
    setLoading(true);
    try {
      const [data, remData, subData, cardPricingData] = await Promise.all([
        apiFetch<{
          users: UserProfile[];
          venues: VenueRecord[];
          photographers: PhotographerRecord[];
          services: ServiceRecord[];
          requests: CustomerRequestRecord[];
          bookings: BookingRecord[];
          reviews: ReviewRecord[];
          invitations: ElectronicInvitationRecord[];
          auditLogs: AdminAuditLogRecord[];
        }>('/api/admin/overview'),
        apiFetch<{
          config: WhatsAppConfigSummary;
          upcoming: UpcomingReminderPreview[];
          logs: WhatsAppReminderRecord[];
        }>('/api/admin/reminders').catch(() => null),
        apiFetch<{
          plans: SubscriptionPlanRecord[];
          requests: UserSubscriptionRecord[];
        }>('/api/admin/subscriptions').catch(() => null),
        apiFetch<{
          templatePrices: Record<InvitationDesignId, number>;
        }>('/api/invitation-pricing').catch(() => null),
      ]);
      setUsers(data.users || []);
      setVenues(data.venues || []);
      setPhotographers(data.photographers || []);
      setServices(data.services || []);
      setRequests(data.requests || []);
      setBookings(data.bookings || []);
      setReviews(data.reviews || []);
      setInvitations(data.invitations || []);
      setAuditLogs(data.auditLogs || []);
      if (remData) {
        setWaConfig(remData.config);
        setUpcomingReminders(remData.upcoming || []);
        setReminderLogs(remData.logs || []);
      }
      if (subData) {
        setSubPlans(subData.plans || []);
        setSubRequests(subData.requests || []);
      }
      if (cardPricingData?.templatePrices) {
        setInvitationPrices((prev) => ({ ...prev, ...cardPricingData.templatePrices }));
      }
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'تعذر تحميل لوحة الإدارة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch<{ hasAdmin: boolean; requiresPasscode: boolean }>('/api/auth/admin-status')
      .then((res) => {
        setHasAdmin(res.hasAdmin);
        setRequiresPasscode(res.requiresPasscode);
      })
      .catch(() => setHasAdmin(true));
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminOverview();
    }
  }, [user]);

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/admin-claim', {
        method: 'POST',
        body: JSON.stringify({
          name: claimName,
          contact: claimContact,
          password: claimPassword,
          passcode: claimPasscode,
        }),
      });
      setClientAuthToken(res.token);
      setHasAdmin(true);
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'تعذر تفعيل حساب الإدارة.');
    }
  };

  const handlePromoteCurrentUser = async () => {
    setAuthError('');
    try {
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/admin-claim', {
        method: 'POST',
        body: JSON.stringify({
          promoteCurrent: true,
          passcode: claimPasscode,
        }),
      });
      setClientAuthToken(res.token);
      setHasAdmin(true);
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'تعذر ترقية الحساب الحالي للإدارة.');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ contact: claimContact, password: claimPassword }),
      });
      if (res.user.role !== 'admin') {
        setAuthError('هذا الحساب لا يملك صلاحيات الإدارة.');
        return;
      }
      setClientAuthToken(res.token);
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'بيانات دخول الإدارة غير صحيحة.');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 pb-24">
        <div className="velora-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F3ECF9] text-[#5B3278] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#24172E]">
              {hasAdmin === false ? 'إعداد مشرف منصة VÉLORA لأول مرة' : 'بوابة إدارة VÉLORA المحمية'}
            </h1>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              {hasAdmin === false
                ? 'لا يوجد حساب مدير مسجل بعد. أنشئ حساب الإدارة الآن بكلمة مرور من اختيارك، ولا يُطلب رمز تفعيل ما لم تضبطه بنفسك في الاستضافة.'
                : 'سجّل الدخول بحساب الإدارة المعتمد لإدارة القاعات والمصورين والحجوزات والتقييمات.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-[#FDF1F2] text-xs font-semibold text-[#9A2D3C]">
              {authError}
            </div>
          )}

          {hasAdmin === false && user && !requiresPasscode && (
            <div className="p-4 rounded-2xl bg-[#F8F3FC] border border-[#E2D2F2] space-y-3">
              <p className="text-xs text-[#4A2763] font-semibold leading-relaxed">
                أنت مسجل الدخول حاليًا بحساب <span className="font-bold">{user.name}</span> (
                {user.email || user.phone}). يمكنك تفعيل لوحة الإدارة عليه بضغطة واحدة:
              </p>
              <button
                type="button"
                onClick={handlePromoteCurrentUser}
                className="w-full py-3 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>تفعيل الإدارة على حسابي الحالي والدخول فورًا</span>
              </button>
            </div>
          )}

          <form
            onSubmit={hasAdmin === false ? handleClaimAdmin : handleAdminLogin}
            className="space-y-4"
          >
            {hasAdmin === false && (
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">اسم المشرف</label>
                <input
                  required
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                البريد الإلكتروني أو الهاتف الإداري
              </label>
              <input
                required
                value={claimContact}
                onChange={(e) => setClaimContact(e.target.value)}
                placeholder={user?.email || user?.phone || 'admin@velora.eg'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                {hasAdmin === false ? 'كلمة المرور (تختارها بنفسك، 6 أحرف على الأقل)' : 'كلمة المرور'}
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={claimPassword}
                onChange={(e) => setClaimPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            {hasAdmin === false && requiresPasscode && (
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  رمز التفعيل (VELORA_ADMIN_PASSCODE)
                </label>
                <input
                  required
                  type="password"
                  value={claimPasscode}
                  onChange={(e) => setClaimPasscode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#5B3278] text-white text-sm font-bold"
            >
              {hasAdmin === false ? 'تفعيل حساب الإدارة والدخول' : 'دخول إلى لوحة الإدارة'}
            </button>
            {hasAdmin === false && user && requiresPasscode && (
              <button
                type="button"
                onClick={handlePromoteCurrentUser}
                className="w-full py-3 rounded-xl border border-[#5B3278] text-[#5B3278] text-xs font-bold"
              >
                ترقية حسابي الحالي ({user.email || user.phone}) للإدارة
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  const runAction = async (fn: () => Promise<void>, successText: string) => {
    setAdminMsg('');
    try {
      await fn();
      setAdminMsg(successText);
      await loadAdminOverview();
      onDataChanged();
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'تعذر تنفيذ العملية.');
    }
  };

  const pendingReviewsCount = reviews.filter((r) => r.status === 'pending').length;
  const pendingProvidersCount =
    venues.filter((v) => v.status === 'pending').length +
    photographers.filter((p) => p.status === 'pending').length +
    services.filter((s) => s.status === 'pending').length;
  const pendingBookingsCount = bookings.filter(
    (b) => !b.adminApproved && b.status !== 'rejected' && b.status !== 'cancelled'
  ).length;
  const pendingSubscriptionsCount = subRequests.filter((s) => s.status === 'pending').length;

  const ADMIN_TABS: Array<{
    id: AdminTab;
    label: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'bookings', label: 'الحجوزات', count: pendingBookingsCount, icon: CalendarCheck2 },
    { id: 'subscriptions', label: 'الباقات والاشتراكات', count: pendingSubscriptionsCount, icon: Crown },
    { id: 'requests', label: 'الطلبات', count: requests.length, icon: ClipboardList },
    { id: 'reviews', label: 'التقييمات', count: pendingReviewsCount, icon: MessageSquareQuote },
    { id: 'venues', label: 'القاعات', count: venues.length, icon: Building2 },
    { id: 'photographers', label: 'المصورون', count: photographers.length, icon: Camera },
    { id: 'services', label: 'الخدمات', count: services.length, icon: Sparkles },
    { id: 'users', label: 'المستخدمون', count: users.length, icon: Users },
    { id: 'invitations', label: 'الدعوات', count: invitations.length, icon: Mail },
    { id: 'reminders', label: 'تذكيرات الواتساب', count: upcomingReminders.length, icon: MessageCircle },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'settings', label: 'الإعدادات والسجل', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      {/* Header */}
      <div className="velora-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-l from-white to-[#F3ECF9]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3278]">
            <ShieldCheck className="w-4 h-4" />
            <span>لوحة الإدارة الكاملة — VÉLORA</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
            مركز التحكم والاعتمادات ({pendingProvidersCount + pendingReviewsCount + pendingBookingsCount} بانتظار المراجعة)
          </h1>
        </div>
        <button
          type="button"
          onClick={loadAdminOverview}
          className="px-4 py-2 rounded-xl bg-white border border-[#E8DCF3] text-xs font-bold text-[#5B3278]"
        >
          {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
        </button>
      </div>

      {adminMsg && (
        <div className="p-3.5 rounded-xl bg-[#F3ECF9] border border-[#5B3278]/25 text-xs font-semibold text-[#5B3278]">
          {adminMsg}
        </div>
      )}

      {/* 10 Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {ADMIN_TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`relative inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                active
                  ? 'text-white border-[#5B3278]'
                  : 'bg-white text-[#5E4D6B] border-[#E8DCF3] hover:bg-[#FAF7FD]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-[11px] bg-[#5B3278] shadow-xs"
                />
              )}
              <Icon className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">{t.label}</span>
              {typeof t.count === 'number' && (
                <span
                  className={`relative z-10 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-[#F3ECF9] text-[#5B3278]'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <CinematicTabPanel tabKey={activeTab} className="space-y-4">
      {/* 1. Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.map((b) => {
            const meta = getBookingStatusMeta(b.status);
            return (
              <div key={b.id} className="velora-card rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}>
                      {meta.labelAr}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#5B3278]">{b.eventDate}</span>
                    <span className="text-xs text-[#6B5A78]">{formatEgp(b.estimatedTotalEgp)}</span>
                  </div>
                  <h2 className="text-base font-bold text-[#24172E]">{b.targetTitle}</h2>
                  <p className="text-xs text-[#5E4D6B]">
                    العميل: {b.clientName} ({b.clientPhone}) · موافقة مقدم الخدمة:{' '}
                    <strong>{b.providerApproved ? 'نعم' : 'لا'}</strong> · موافقة الإدارة:{' '}
                    <strong>{b.adminApproved ? 'نعم' : 'لا'}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!b.adminApproved && b.status !== 'rejected' && b.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          () =>
                            apiFetch(`/api/bookings/${b.id}/admin-action`, {
                              method: 'POST',
                              body: JSON.stringify({ decision: 'approve', note: 'موافقة الإدارة' }),
                            }).then(() => undefined),
                          'تم تسجيل اعتماد الإدارة على الحجز.'
                        )
                      }
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>موافقة الإدارة</span>
                    </button>
                  )}
                  {b.status !== 'rejected' && b.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          () =>
                            apiFetch(`/api/bookings/${b.id}/admin-action`, {
                              method: 'POST',
                              body: JSON.stringify({ decision: 'reject', note: 'رفض إداري' }),
                            }).then(() => undefined),
                          'تم رفض الحجز إداريًا.'
                        )
                      }
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C] border border-[#EAC1C7] text-xs font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>رفض</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Customer Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="velora-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-[#F3ECF9] text-[#5B3278] text-[11px] font-bold">
                  {r.requestSection === 'venue' ? 'قاعات' : r.requestSection === 'photographer' ? 'مصورون' : 'خدمات'} · {r.status}
                </span>
                <h2 className="text-base font-bold text-[#24172E]">{r.titleAr}</h2>
                <p className="text-xs text-[#5E4D6B]">
                  {r.clientName} · {r.eventDate} · {r.city} · {formatEgp(r.budgetEgp)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    runAction(
                      () =>
                        apiFetch(`/api/admin/requests/${r.id}/status`, {
                          method: 'POST',
                          body: JSON.stringify({ status: r.status === 'open' ? 'matched' : 'closed' }),
                        }).then(() => undefined),
                      'تم تحديث حالة الطلب.'
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-bold"
                >
                  {r.status === 'open' ? 'تحديد كمرتبط بعرض' : 'إغلاق الطلب'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runAction(
                      () => apiFetch(`/api/admin/requests/${r.id}`, { method: 'DELETE' }).then(() => undefined),
                      'تم حذف الطلب.'
                    )
                  }
                  className="p-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C]"
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Reviews Moderation Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="velora-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#24172E]">{rev.authorName}</span>
                  <span className="text-xs text-[#5B3278]">{'★'.repeat(rev.rating)}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      rev.status === 'approved'
                        ? 'bg-[#F3ECF9] text-[#5B3278]'
                        : 'bg-[#FBF6EC] text-[#7F6023]'
                    }`}
                  >
                    {rev.status === 'approved' ? 'معتمد ومنشور' : rev.status === 'pending' ? 'بانتظار الاعتماد' : rev.status}
                  </span>
                </div>
                <p className="text-xs text-[#5E4D6B]">{rev.commentAr}</p>
              </div>
              <div className="flex gap-2">
                {rev.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          apiFetch(`/api/admin/reviews/${rev.id}/status`, {
                            method: 'POST',
                            body: JSON.stringify({ status: 'approved' }),
                          }).then(() => undefined),
                        'تم اعتماد التقييم ونشره للعملاء.'
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                  >
                    اعتماد التقييم
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    runAction(
                      () => apiFetch(`/api/admin/reviews/${rev.id}`, { method: 'DELETE' }).then(() => undefined),
                      'تم حذف التقييم.'
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C] text-xs font-bold"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Venues Tab */}
      {activeTab === 'venues' && (
        <div className="space-y-4">
          {venues.map((v) => (
            <div key={v.id} className="velora-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#F3ECF9] text-[#5B3278] text-[11px] font-bold">
                    {v.status === 'approved' ? 'منشورة' : v.status === 'pending' ? 'قيد المراجعة' : v.status}
                  </span>
                  <span className="text-xs text-[#6B5A78]">{v.city} · {formatEgp(v.pricePerEvent)}</span>
                </div>
                <h2 className="text-base font-bold text-[#24172E] mt-1">{v.titleAr}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {v.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          apiFetch(`/api/admin/venues/${v.id}/status`, {
                            method: 'POST',
                            body: JSON.stringify({ status: 'approved' }),
                          }).then(() => undefined),
                        'تم اعتماد ونشر القاعة بنجاح.'
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                  >
                    اعتماد ونشر
                  </button>
                )}
                {v.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          apiFetch(`/api/admin/venues/${v.id}/status`, {
                            method: 'POST',
                            body: JSON.stringify({ status: 'suspended' }),
                          }).then(() => undefined),
                        'تم تعليق القاعة.'
                      )
                    }
                    className="px-3.5 py-2 rounded-xl border border-[#E8DCF3] text-xs font-bold"
                  >
                    تعليق
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    runAction(
                      () => apiFetch(`/api/admin/venues/${v.id}`, { method: 'DELETE' }).then(() => undefined),
                      'تم حذف القاعة.'
                    )
                  }
                  className="p-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C]"
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Photographers Tab */}
      {activeTab === 'photographers' && (
        <div className="space-y-4">
          {photographers.map((p) => (
            <div key={p.id} className="velora-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#F3ECF9] text-[#5B3278] text-[11px] font-bold">
                  {p.status === 'approved' ? 'معتمد ومنشور' : p.status === 'pending' ? 'بانتظار الاعتماد' : p.status}
                </span>
                <h2 className="text-base font-bold text-[#24172E] mt-1">{p.displayName}</h2>
                <p className="text-xs text-[#5E4D6B]">{p.specialtyAr} · {p.city}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          apiFetch(`/api/admin/photographers/${p.id}/status`, {
                            method: 'POST',
                            body: JSON.stringify({ status: 'approved' }),
                          }).then(() => undefined),
                        'تم اعتماد ملف المصور.'
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                  >
                    اعتماد المصور
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    runAction(
                      () => apiFetch(`/api/admin/photographers/${p.id}`, { method: 'DELETE' }).then(() => undefined),
                      'تم حذف المصور.'
                    )
                  }
                  className="p-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C]"
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {services.map((s) => (
            <div key={s.id} className="velora-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#F3ECF9] text-[#5B3278] text-[11px] font-bold">
                  {s.status === 'approved' ? 'معتمدة' : s.status === 'pending' ? 'بانتظار الاعتماد' : s.status}
                </span>
                <h2 className="text-base font-bold text-[#24172E] mt-1">{s.titleAr}</h2>
                <p className="text-xs text-[#5E4D6B]">{s.providerName} · {formatEgp(s.startingPrice)}</p>
              </div>
              <div className="flex gap-2">
                {s.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          apiFetch(`/api/admin/services/${s.id}/status`, {
                            method: 'POST',
                            body: JSON.stringify({ status: 'approved' }),
                          }).then(() => undefined),
                        'تم اعتماد الخدمة.'
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                  >
                    اعتماد ونشر
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    runAction(
                      () => apiFetch(`/api/admin/services/${s.id}`, { method: 'DELETE' }).then(() => undefined),
                      'تم حذف الخدمة.'
                    )
                  }
                  className="p-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C]"
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Users Management Tab (Dual Desktop Table + Mobile Cards) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="hidden md:block velora-card rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F3ECF9] text-[#5B3278]">
                <tr>
                  <th className="p-3.5">الاسم</th>
                  <th className="p-3.5">التواصل</th>
                  <th className="p-3.5">الدور</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E7F8]">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3.5 font-bold text-[#24172E]">{u.name}</td>
                    <td className="p-3.5 text-[#5E4D6B]">{u.email || u.phone}</td>
                    <td className="p-3.5">{u.role}</td>
                    <td className="p-3.5">{u.status === 'active' ? 'نشط' : 'موقوف'}</td>
                    <td className="p-3.5">
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              () =>
                                apiFetch(`/api/admin/users/${u.id}`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    role: u.role,
                                    status: u.status === 'active' ? 'suspended' : 'active',
                                  }),
                                }).then(() => undefined),
                              'تم تحديث حالة المستخدم.'
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#F3ECF9] text-[#5B3278] font-bold"
                        >
                          {u.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className="velora-card rounded-2xl p-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#24172E]">{u.name}</p>
                  <p className="text-xs text-[#6B5A78]">{u.email || u.phone} · {u.role}</p>
                </div>
                {u.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() =>
                      runAction(
                        () =>
                          apiFetch(`/api/admin/users/${u.id}`, {
                            method: 'POST',
                            body: JSON.stringify({
                              role: u.role,
                              status: u.status === 'active' ? 'suspended' : 'active',
                            }),
                          }).then(() => undefined),
                        'تم تحديث حالة المستخدم.'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-xs font-bold shrink-0"
                  >
                    {u.status === 'active' ? 'إيقاف' : 'تفعيل'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div key={inv.id} className="velora-card rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#24172E]">
                  {inv.groomName} و {inv.brideName}
                </h2>
                <p className="text-xs text-[#5E4D6B]">
                  {inv.weddingDate} · {inv.venueName} · حضور: {inv.stats?.attendingCount || 0}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  runAction(
                    () => apiFetch(`/api/admin/invitations/${inv.id}`, { method: 'DELETE' }).then(() => undefined),
                    'تم حذف الدعوة.'
                  )
                }
                className="p-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C]"
                aria-label="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 8b. Automated WhatsApp Reminders Tab */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          {/* Gateway & Sweep Control */}
          <div className="velora-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#5B3278]">
                <MessageCircle className="w-4 h-4" />
                <span>محرك تذكيرات الواتساب التلقائي (قبل 3 أيام · يوم واحد · 6 ساعات)</span>
              </div>
              <p className="text-sm font-bold text-[#24172E]">
                {waConfig?.providerLabelAr || 'وضع المحاكاة والتسجيل المحلي'}
              </p>
              <p className="text-xs text-[#5E4D6B]">
                يفحص الخادم الحجوزات المؤكدة كل 15 دقيقة بتوقيت القاهرة ·{' '}
                {waConfig?.cronProtected
                  ? 'رابط التشغيل الخارجي (/api/reminders/run) محمي برمز سري.'
                  : 'أضف REMINDER_CRON_SECRET لتفعيل التشغيل عبر مجدول خارجي.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={waBusy}
                onClick={async () => {
                  setWaBusy(true);
                  setAdminMsg('');
                  try {
                    const res = await apiFetch<{
                      summary: { dispatchedCount: number; sentCount: number; simulatedCount: number; failedCount: number };
                      config: WhatsAppConfigSummary;
                      upcoming: UpcomingReminderPreview[];
                      logs: WhatsAppReminderRecord[];
                    }>('/api/admin/reminders/run', { method: 'POST' });
                    setWaConfig(res.config);
                    setUpcomingReminders(res.upcoming || []);
                    setReminderLogs(res.logs || []);
                    setAdminMsg(
                      `تم فحص التذكيرات: ${res.summary.sentCount} مرسلة فعليًا، ${res.summary.simulatedCount} مسجلة تجريبيًا، ${res.summary.failedCount} فاشلة.`
                    );
                  } catch (err) {
                    setAdminMsg(err instanceof Error ? err.message : 'تعذر تشغيل فحص التذكيرات.');
                  } finally {
                    setWaBusy(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#492563] text-white text-xs font-bold disabled:opacity-60"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{waBusy ? 'جاري الفحص والإرسال...' : 'فحص وإرسال التذكيرات المستحقة الآن'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upcoming Confirmed Weddings Schedule */}
            <div className="lg:col-span-7 velora-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#24172E]">
                  جدول الزفاف المؤكد ومواعيد الرسائل الثلاث
                </h2>
                <span className="text-xs font-semibold text-[#5E4D6B] tabular-nums">
                  {upcomingReminders.length} حجز قادم
                </span>
              </div>

              {upcomingReminders.length === 0 ? (
                <p className="text-xs text-[#6B5A78] py-4">
                  لا توجد حجوزات مؤكدة قادمة حاليًا. بمجرد اعتماد أي حجز نهائيًا سيظهر جدول تذكيراته هنا تلقائيًا.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingReminders.map((item) => (
                    <div
                      key={item.bookingId}
                      className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-[#24172E]">{item.targetTitle}</h3>
                          <p className="text-xs text-[#5E4D6B] mt-0.5">
                            {item.clientName} · <span className="tabular-nums">{item.normalizedPhone ? `+${item.normalizedPhone}` : item.clientPhone}</span>
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-[#5B3278] tabular-nums">
                            {item.eventDate} · {item.eventTime} القاهرة
                          </p>
                          <p className="text-[11px] text-[#7C678D] tabular-nums">
                            {item.hoursUntilEvent >= 0
                              ? `المتبقي ${Math.round(item.hoursUntilEvent)} ساعة`
                              : 'انطلق الحفل'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {item.milestones.map((m) => {
                          const badgeMap: Record<string, { text: string; cls: string }> = {
                            sent: { text: 'تم الإرسال', cls: 'bg-[#EEF8F2] text-[#1D6B44] border-[#C5E4D2]' },
                            simulated: { text: 'محاكاة مسجلة', cls: 'bg-[#F3ECF9] text-[#5B3278] border-[#D9C7EC]' },
                            failed: { text: 'تعذر الإرسال', cls: 'bg-[#FDF1F2] text-[#9A2D3C] border-[#EAC1C7]' },
                            due_now: { text: 'مستحق الآن', cls: 'bg-[#FBF6EC] text-[#7F6023] border-[#DFC793]' },
                            upcoming: { text: 'مجدول', cls: 'bg-white text-[#5E4D6B] border-[#E8DCF3]' },
                            missed_past: { text: 'تجاوزته المدة', cls: 'bg-[#F5F2F8] text-[#7C678D] border-[#DDD4E6]' },
                          };
                          const st = badgeMap[m.state] || badgeMap.upcoming;
                          return (
                            <div
                              key={m.milestone}
                              className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${st.cls}`}
                            >
                              <span className="font-bold">{m.labelAr}</span>
                              <span className="font-semibold shrink-0">{st.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Message & Integration Guide */}
            <div className="lg:col-span-5 space-y-5">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setWaBusy(true);
                  setAdminMsg('');
                  try {
                    const res = await apiFetch<{
                      reminder: WhatsAppReminderRecord;
                      config: WhatsAppConfigSummary;
                      upcoming: UpcomingReminderPreview[];
                      logs: WhatsAppReminderRecord[];
                    }>('/api/admin/reminders/test', {
                      method: 'POST',
                      body: JSON.stringify({
                        phone: testPhone,
                        milestone: testMilestone,
                        clientName: testClientName,
                      }),
                    });
                    setWaConfig(res.config);
                    setUpcomingReminders(res.upcoming || []);
                    setReminderLogs(res.logs || []);
                    setAdminMsg(
                      res.reminder.status === 'sent'
                        ? `تم إرسال رسالة الواتساب التجريبية بنجاح إلى ${res.reminder.recipientPhone}`
                        : res.reminder.status === 'simulated'
                        ? `تمت محاكاة الرسالة التجريبية إلى ${res.reminder.recipientPhone} وتسجيلها في السجل (اربط بوابة واتساب للإرسال الفعلي).`
                        : `تعذر الإرسال إلى ${res.reminder.recipientPhone}: ${res.reminder.errorText}`
                    );
                  } catch (err) {
                    setAdminMsg(err instanceof Error ? err.message : 'تعذر إرسال الرسالة التجريبية.');
                  } finally {
                    setWaBusy(false);
                  }
                }}
                className="velora-card rounded-3xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2 text-[#5B3278]">
                  <Send className="w-4 h-4" />
                  <h2 className="font-display text-lg font-bold text-[#24172E]">
                    إرسال رسالة تذكير تجريبية
                  </h2>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                    رقم الواتساب (مثال: 01012345678)
                  </label>
                  <input
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="01012345678"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm text-right"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">نوع التذكير</label>
                    <select
                      value={testMilestone}
                      onChange={(e) => setTestMilestone(e.target.value as WhatsAppMilestone)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold text-[#24172E]"
                    >
                      <option value="3d">قبل الفرح بـ 3 أيام</option>
                      <option value="1d">قبل الفرح بيوم واحد</option>
                      <option value="6h">قبل الفرح بـ 6 ساعات</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">اسم العميل</label>
                    <input
                      value={testClientName}
                      onChange={(e) => setTestClientName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs text-[#24172E]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={waBusy}
                  className="w-full py-3 rounded-xl bg-[#5B3278] hover:bg-[#492563] text-white text-xs font-bold disabled:opacity-60"
                >
                  {waBusy ? 'جاري التنفيذ...' : 'اختبار إرسال الرسالة الآن'}
                </button>
              </form>

              <div className="velora-card rounded-3xl p-5 space-y-2 bg-[#FAF7FD]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5B3278]">
                  <Clock className="w-4 h-4" />
                  <span>خطوات التفعيل للإرسال الفعلي على واتساب العملاء</span>
                </div>
                <p className="text-xs text-[#5E4D6B] leading-relaxed">
                  1. من إعدادات الاستضافة (Secrets / Environment) أضف بيانات البوابة التي تختارها:
                  {' '}<strong>Meta Cloud API</strong> أو <strong>Twilio WhatsApp</strong> أو <strong>UltraMsg</strong>.
                </p>
                <p className="text-xs text-[#5E4D6B] leading-relaxed">
                  2. لضمان استمرار العمل حتى عند سكون السيرفر، أنشئ مهمة مجانية كل 15 دقيقة على cron-job.org تشير إلى{' '}
                  <code dir="ltr" className="px-1.5 py-0.5 rounded bg-white border border-[#E8DCF3] text-[11px]">POST /api/reminders/run</code>{' '}
                  مع ترويسة <code dir="ltr" className="px-1.5 py-0.5 rounded bg-white border border-[#E8DCF3] text-[11px]">x-cron-secret</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="velora-card rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#24172E]">
              سجل رسائل الواتساب المرسلة ({reminderLogs.length})
            </h2>
            {reminderLogs.length === 0 ? (
              <p className="text-xs text-[#6B5A78]">
                لم يتم تسجيل أي رسائل تذكير بعد. استخدم زر «فحص وإرسال التذكيرات المستحقة الآن» أو أرسل رسالة تجريبية.
              </p>
            ) : (
              <div className="space-y-2.5">
                {reminderLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg font-bold ${
                            log.status === 'sent'
                              ? 'bg-[#EEF8F2] text-[#1D6B44]'
                              : log.status === 'simulated'
                              ? 'bg-[#F3ECF9] text-[#5B3278]'
                              : 'bg-[#FDF1F2] text-[#9A2D3C]'
                          }`}
                        >
                          {log.status === 'sent' ? 'تم الإرسال' : log.status === 'simulated' ? 'محاكاة' : 'فشل'}
                        </span>
                        <span className="font-bold text-[#24172E]">{log.clientName}</span>
                        <span className="text-[#5E4D6B] tabular-nums">{log.recipientPhone}</span>
                        <span className="text-[#7C678D]">· {log.milestone === '3d' ? '3 أيام' : log.milestone === '1d' ? 'يوم واحد' : '6 ساعات'}</span>
                      </div>
                      <span className="text-[11px] text-[#7C678D] tabular-nums">
                        {log.provider} · {new Date(log.sentAt || log.createdAt).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A3B56] whitespace-pre-line leading-relaxed">{log.messageBody}</p>
                    {log.errorText && (
                      <p className="text-[11px] font-semibold text-[#9A2D3C]">سبب الفشل: {log.errorText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8.5 Subscriptions & Plans Management Tab */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="velora-card rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-[#6B5A78]">طلبات بانتظار التفعيل</p>
              <p className="font-display text-2xl font-bold text-[#5B3278] tabular-nums">
                {pendingSubscriptionsCount}
              </p>
            </div>
            <div className="velora-card rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-[#6B5A78]">اشتراكات مفعلة</p>
              <p className="font-display text-2xl font-bold text-[#1D6B44] tabular-nums">
                {subRequests.filter((s) => s.status === 'active').length}
              </p>
            </div>
            <div className="velora-card rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-[#6B5A78]">باقات مقدمي الخدمات</p>
              <p className="font-display text-2xl font-bold text-[#24172E] tabular-nums">
                {subPlans.filter((p) => p.audience === 'provider').length}
              </p>
            </div>
            <div className="velora-card rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-[#6B5A78]">باقات العروسين</p>
              <p className="font-display text-2xl font-bold text-[#24172E] tabular-nums">
                {subPlans.filter((p) => p.audience === 'client').length}
              </p>
            </div>
          </div>

          {/* Incoming Subscription Requests */}
          <div className="velora-card rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-[#24172E]">
              طلبات اشتراك القاعات والمصورين والعروسين ({subRequests.length})
            </h2>
            {subRequests.length === 0 ? (
              <p className="text-xs text-[#6B5A78]">
                لا توجد طلبات اشتراك مسجلة بعد. عند طلب أي عميل أو صاحب قاعة أو مصور لباقة ستظهر هنا للاعتماد.
              </p>
            ) : (
              <div className="space-y-3">
                {subRequests.map((reqItem) => (
                  <div
                    key={reqItem.id}
                    className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-lg font-bold ${
                            reqItem.status === 'active'
                              ? 'bg-[#EEF8F2] text-[#1D6B44]'
                              : reqItem.status === 'pending'
                              ? 'bg-[#F3ECF9] text-[#5B3278]'
                              : 'bg-[#FDF1F2] text-[#9A2D3C]'
                          }`}
                        >
                          {reqItem.status === 'active'
                            ? 'مفعّل'
                            : reqItem.status === 'pending'
                            ? 'بانتظار المراجعة'
                            : reqItem.status === 'rejected'
                            ? 'مرفوض'
                            : 'ملغي'}
                        </span>
                        <span className="font-bold text-[#24172E]">{reqItem.planNameAr}</span>
                        <span className="text-[#6B5A78]">
                          · {reqItem.audience === 'provider' ? 'مقدم خدمة' : 'عروسين / عميل'}
                        </span>
                      </div>
                      <p className="text-xs text-[#24172E] font-semibold">
                        {reqItem.businessOrCoupleName} — الحساب: {reqItem.userName} · الهاتف:{' '}
                        <span className="tabular-nums">{reqItem.contactPhone}</span>
                      </p>
                      <p className="text-xs text-[#5E4D6B]">
                        الدورة:{' '}
                        {reqItem.billingCycle === 'annual'
                          ? 'سنوي'
                          : reqItem.billingCycle === 'quarterly'
                          ? '3 شهور'
                          : 'شهري'}{' '}
                        · الدفع: {reqItem.paymentMethod} · القيمة:{' '}
                        <strong className="text-[#5B3278] tabular-nums">
                          {reqItem.amountEgp === 0 ? 'مجانية' : formatEgp(reqItem.amountEgp)}
                        </strong>
                        {reqItem.notes ? ` · ملاحظة: ${reqItem.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {reqItem.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              () =>
                                apiFetch(`/api/admin/subscriptions/${reqItem.id}/status`, {
                                  method: 'POST',
                                  body: JSON.stringify({ status: 'active' }),
                                }),
                              `تم تفعيل باقة ${reqItem.planNameAr} للحساب ${reqItem.userName}.`
                            )
                          }
                          className="px-3.5 py-2 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تفعيل الاشتراك</span>
                        </button>
                      )}
                      {reqItem.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              () =>
                                apiFetch(`/api/admin/subscriptions/${reqItem.id}/status`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    status: 'rejected',
                                    adminNote: 'يرجى التواصل مع الإدارة لاستكمال بيانات التفعيل.',
                                  }),
                                }),
                              'تم رفض طلب الاشتراك.'
                            )
                          }
                          className="px-3.5 py-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C] border border-[#F3CFD4] text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                      )}
                      {reqItem.status === 'active' && (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              () =>
                                apiFetch(`/api/admin/subscriptions/${reqItem.id}/status`, {
                                  method: 'POST',
                                  body: JSON.stringify({ status: 'cancelled' }),
                                }),
                              'تم إيقاف الاشتراك.'
                            )
                          }
                          className="px-3.5 py-2 rounded-xl bg-white border border-[#E8DCF3] text-[#6B5A78] text-xs font-bold"
                        >
                          إيقاف
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plan Pricing & Configuration */}
          <div className="velora-card rounded-3xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-[#24172E]">
                تعديل أسعار وحالة باقات المنصة ({subPlans.length})
              </h2>
              <p className="text-xs text-[#5E4D6B]">
                اكتب الأسعار بنفسك (شهري، 3 شهور، وسنوي) وعدّل اسم الباقة والمميزات بحرية كاملة، ثم اضغط حفظ لتنعكس فورًا في صفحة الاشتراكات.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {subPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-[#7A4C9E]">
                        {plan.audience === 'provider' ? 'باقة مقدمي خدمات' : 'باقة العروسين'}
                      </p>
                      <h3 className="text-sm font-bold text-[#24172E]">{plan.nameAr}</h3>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setSubPlans((prev) =>
                            prev.map((p) =>
                              p.id === plan.id
                                ? { ...p, monthlyPriceEgp: 0, quarterlyPriceEgp: 0, annualPriceEgp: 0 }
                                : p
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-lg border border-[#E8DCF3] bg-white hover:bg-[#F3ECF9] text-[11px] font-semibold text-[#5B3278]"
                      >
                        تصفير للكتابة يدويًا
                      </button>
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={plan.active}
                          onChange={(e) =>
                            setSubPlans((prev) =>
                              prev.map((p) => (p.id === plan.id ? { ...p, active: e.target.checked } : p))
                            )
                          }
                          className="rounded border-[#C9B0E3] text-[#5B3278]"
                        />
                        <span>مفعّلة</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">اسم الباقة</label>
                      <input
                        value={plan.nameAr}
                        onChange={(e) =>
                          setSubPlans((prev) =>
                            prev.map((p) => (p.id === plan.id ? { ...p, nameAr: e.target.value } : p))
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">الفئة المستهدفة</label>
                      <input
                        value={plan.targetRolesAr}
                        onChange={(e) =>
                          setSubPlans((prev) =>
                            prev.map((p) => (p.id === plan.id ? { ...p, targetRolesAr: e.target.value } : p))
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">
                        سعر الشهر (ج.م)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={plan.monthlyPriceEgp}
                        onChange={(e) =>
                          setSubPlans((prev) =>
                            prev.map((p) =>
                              p.id === plan.id ? { ...p, monthlyPriceEgp: Math.max(0, Number(e.target.value) || 0) } : p
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs font-bold tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">
                        سعر 3 شهور (ج.م)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={plan.quarterlyPriceEgp}
                        onChange={(e) =>
                          setSubPlans((prev) =>
                            prev.map((p) =>
                              p.id === plan.id ? { ...p, quarterlyPriceEgp: Math.max(0, Number(e.target.value) || 0) } : p
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs font-bold tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">
                        سعر السنة (ج.م)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={plan.annualPriceEgp}
                        onChange={(e) =>
                          setSubPlans((prev) =>
                            prev.map((p) =>
                              p.id === plan.id ? { ...p, annualPriceEgp: Math.max(0, Number(e.target.value) || 0) } : p
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs font-bold tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">وصف الباقة</label>
                      <input
                        value={plan.taglineAr}
                        onChange={(e) =>
                          setSubPlans((prev) =>
                            prev.map((p) => (p.id === plan.id ? { ...p, taglineAr: e.target.value } : p))
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">ملاحظة الفوترة</label>
                      <input
                        value={plan.billingNoteAr}
                        onChange={(e) =>
                          setSubPlans((prev) =>
                            prev.map((p) => (p.id === plan.id ? { ...p, billingNoteAr: e.target.value } : p))
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">
                      مميزات الباقة (سطر لكل ميزة)
                    </label>
                    <textarea
                      rows={3}
                      value={plan.features.join('\n')}
                      onChange={(e) =>
                        setSubPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id
                              ? { ...p, features: e.target.value.split('\n') }
                              : p
                          )
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E4D6B] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.highlighted}
                        onChange={(e) =>
                          setSubPlans((prev) =>
                            prev.map((p) => (p.id === plan.id ? { ...p, highlighted: e.target.checked } : p))
                          )
                        }
                        className="rounded border-[#C9B0E3] text-[#5B3278]"
                      />
                      <span>تمييز كـ «الأكثر اختيارًا»</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          () =>
                            apiFetch(`/api/admin/subscription-plans/${plan.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({
                                nameAr: plan.nameAr,
                                targetRolesAr: plan.targetRolesAr,
                                monthlyPriceEgp: plan.monthlyPriceEgp,
                                quarterlyPriceEgp: plan.quarterlyPriceEgp,
                                annualPriceEgp: plan.annualPriceEgp,
                                taglineAr: plan.taglineAr,
                                billingNoteAr: plan.billingNoteAr,
                                features: plan.features.map((f) => f.trim()).filter(Boolean),
                                highlighted: plan.highlighted,
                                active: plan.active,
                              }),
                            }),
                          `تم حفظ تعديلات باقة «${plan.nameAr}».`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ الباقة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invitation Card Template Pricing */}
          <div className="velora-card rounded-3xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-[#24172E]">
                تسعير كروت الدعوة الإلكترونية (7 قوالب)
              </h2>
              <p className="text-xs text-[#5E4D6B]">
                اختر لكل كارت «مجاني» أو «مدفوع» ثم حدد السعر بالجنيه واضغط حفظ. الكارت المجاني يحمل شعار واسم موقع <strong className="text-[#5B3278]">VÉLORA</strong> تلقائيًا.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(Object.keys(INVITATION_DESIGNS) as InvitationDesignId[]).map((id) => {
                const spec = INVITATION_DESIGNS[id];
                const priceVal = invitationPrices[id] ?? spec.priceEgp;
                const isFree = priceVal <= 0;
                return (
                  <div
                    key={id}
                    className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#24172E]">{spec.labelAr}</h3>
                        <p className="text-[11px] font-semibold mt-0.5 text-[#6B5A78]">
                          {isFree ? 'مجاني · يظهر شعار VÉLORA' : `كارت مدفوع · ${formatEgp(priceVal)}`}
                        </p>
                      </div>
                      <span
                        className="w-7 h-7 rounded-lg border border-[#E8DCF3] shrink-0"
                        style={{ background: spec.cardBg }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 border border-[#E8DCF3]" role="group" aria-label="نوع الكارت">
                      <button
                        type="button"
                        onClick={() => setInvitationPrices((prev) => ({ ...prev, [id]: 0 }))}
                        className={`rounded-lg py-1.5 text-xs font-bold ${isFree ? 'bg-[#5B3278] text-white' : 'text-[#5B3278]'}`}
                      >
                        مجاني
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setInvitationPrices((prev) => ({ ...prev, [id]: prev[id] > 0 ? prev[id] : spec.priceEgp > 0 ? spec.priceEgp : 250 }))
                        }
                        className={`rounded-lg py-1.5 text-xs font-bold ${!isFree ? 'bg-[#5B3278] text-white' : 'text-[#5B3278]'}`}
                      >
                        مدفوع
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={priceVal}
                        disabled={isFree}
                        onChange={(e) =>
                          setInvitationPrices((prev) => ({
                            ...prev,
                            [id]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="flex-1 px-3 py-2 rounded-xl border border-[#E8DCF3] bg-white text-xs font-bold tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          runAction(
                            () =>
                              apiFetch('/api/admin/invitation-pricing', {
                                method: 'PUT',
                                body: JSON.stringify({ designId: id, priceEgp: priceVal }),
                              }),
                            `تم حفظ تسعيرة كارت «${spec.labelAr}» (${priceVal === 0 ? 'مجاني بشعار الموقع' : formatEgp(priceVal)}).`
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold shrink-0"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 9. Notifications Broadcast Tab */}
      {activeTab === 'notifications' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAction(
              () =>
                apiFetch('/api/admin/notifications/broadcast', {
                  method: 'POST',
                  body: JSON.stringify({ titleAr: notifTitle, bodyAr: notifBody }),
                }).then(() => {
                  setNotifTitle('');
                  setNotifBody('');
                }),
              'تم إرسال الإشعار العام لجميع مستخدمي المنصة.'
            );
          }}
          className="velora-card rounded-3xl p-6 space-y-4 max-w-2xl"
        >
          <h2 className="font-display text-xl font-bold text-[#24172E]">
            إرسال إشعار إداري لجميع الحسابات
          </h2>
          <div>
            <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">عنوان الإشعار</label>
            <input
              required
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="مثال: عروض الموسم الجديد في VÉLORA"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">نص الرسالة</label>
            <textarea
              required
              rows={3}
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
          >
            إرسال الإشعار للجميع
          </button>
        </form>
      )}

      {/* 10. Settings & Audit Logs Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          <div className="velora-card rounded-3xl p-6 space-y-2">
            <h2 className="font-display text-xl font-bold text-[#24172E]">
              إعدادات وسياسات المنصة
            </h2>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              تعمل منصة VÉLORA حاليًا بسياسة الاعتماد المزدوج الإلزامية للحجوزات (موافقة مقدم الخدمة + موافقة الإدارة)،
              ومنع تعارض التواريخ على القاعات والمصورين، ومراجعة كافة ملفات مقدمي الخدمات والتقييمات قبل النشر.
            </p>
          </div>
          <div className="velora-card rounded-3xl p-6 space-y-3">
            <h3 className="text-base font-bold text-[#24172E]">سجل العمليات الإدارية</h3>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-[#6B5A78]">لا توجد عمليات إدارية مسجلة حتى الآن.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] flex justify-between text-xs">
                  <span className="font-semibold text-[#24172E]">{log.actionAr}</span>
                  <span className="text-[#7C678D]">{log.adminName}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      </CinematicTabPanel>
    </div>
  );
};
