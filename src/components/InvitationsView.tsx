import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageSquareHeart,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import type {
  ElectronicInvitationRecord,
  InvitationDesignId,
  InvitationRsvpRecord,
  InvitationStats,
  UserProfile,
} from '../types/velora';
import { apiFetch, uploadImageFile } from '../utils/api';
import { VELORA_PRESET_PHOTOS, resolveMediaUrl } from '../utils/veloraAssets';
import { INVITATION_DESIGNS, buildInvitationUrl, formatEgp } from '../utils/veloraLogic';
import { InvitationCardRenderer } from './InvitationCardRenderer';
import { motion } from 'motion/react';
import { CinematicTabPanel } from './CinematicMotion';

interface InvitationsViewProps {
  invitations: ElectronicInvitationRecord[];
  user: UserProfile | null;
  onInvitationCreated: (inv: ElectronicInvitationRecord) => void;
  onInvitationDeleted: (id: string) => void;
  onOpenGuestLink: (slug: string) => void;
  onRequireAuth: () => void;
}

export const InvitationsView: React.FC<InvitationsViewProps> = ({
  invitations,
  user,
  onInvitationCreated,
  onInvitationDeleted,
  onOpenGuestLink,
  onRequireAuth,
}) => {
  const [designId, setDesignId] = useState<InvitationDesignId>('romantic');
  const [groomName, setGroomName] = useState('محمد');
  const [brideName, setBrideName] = useState('منه');
  const [weddingDate, setWeddingDate] = useState('2026-11-30');
  const [weddingTime, setWeddingTime] = useState('19:25');
  const [venueName, setVenueName] = useState('قصر الأوركيد الملكي — التجمع الخامس');
  const [mapUrl, setMapUrl] = useState('https://maps.google.com/?q=30.0255,31.4847');
  const [invitationText, setInvitationText] = useState(
    'يسعدنا حضوركم ومشاركتكم أجمل لحظاتنا في ليلة العمر.'
  );
  const [couplePhoto, setCouplePhoto] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+20 101 234 5678');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [copiedSlug, setCopiedSlug] = useState('');
  const [templatePrices, setTemplatePrices] = useState<Record<InvitationDesignId, number>>({
    royal: INVITATION_DESIGNS.royal.priceEgp,
    luxury: INVITATION_DESIGNS.luxury.priceEgp,
    romantic: INVITATION_DESIGNS.romantic.priceEgp,
    classic: INVITATION_DESIGNS.classic.priceEgp,
    modern: INVITATION_DESIGNS.modern.priceEgp,
    floral: INVITATION_DESIGNS.floral.priceEgp,
    minimal: INVITATION_DESIGNS.minimal.priceEgp,
  });

  // Inspect RSVPs for selected invitation
  const [selectedStatsSlug, setSelectedStatsSlug] = useState<string>(
    invitations[0]?.slug || ''
  );
  const [rsvps, setRsvps] = useState<InvitationRsvpRecord[]>([]);
  const [liveStats, setLiveStats] = useState<InvitationStats | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'attending' | 'declined' | 'messages'>('all');
  const [rsvpQuery, setRsvpQuery] = useState('');

  useEffect(() => {
    apiFetch<{ templatePrices: Record<InvitationDesignId, number> }>('/api/invitation-pricing')
      .then((res) => {
        if (res?.templatePrices) setTemplatePrices((prev) => ({ ...prev, ...res.templatePrices }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (invitations.length === 0) return;
    if (!selectedStatsSlug || !invitations.some((i) => i.slug === selectedStatsSlug)) {
      setSelectedStatsSlug(invitations[0].slug);
    }
  }, [invitations, selectedStatsSlug]);

  const fetchSelectedRsvps = useCallback(async (slugToLoad: string) => {
    if (!slugToLoad) return;
    setRsvpLoading(true);
    setRsvpError('');
    try {
      const res = await apiFetch<{
        invitation: ElectronicInvitationRecord;
        stats: InvitationStats;
        rsvps: InvitationRsvpRecord[];
      }>(`/api/invitations/${encodeURIComponent(slugToLoad)}`);
      setRsvps(res.rsvps || []);
      setLiveStats(res.stats || res.invitation?.stats || null);
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : 'تعذر تحميل سجل ردود المدعوين.');
    } finally {
      setRsvpLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedStatsSlug) return;
    void fetchSelectedRsvps(selectedStatsSlug);
    const interval = window.setInterval(() => {
      void fetchSelectedRsvps(selectedStatsSlug);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [selectedStatsSlug, user?.id, invitations.length, fetchSelectedRsvps]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      onRequireAuth();
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      setCouplePhoto(url);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'تعذر رفع الصورة.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setSaving(true);
    setFeedback('');
    try {
      const res = await apiFetch<{ invitation: ElectronicInvitationRecord }>('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          designId,
          groomName,
          brideName,
          weddingDate,
          weddingTime,
          venueName,
          mapUrl,
          invitationText,
          couplePhoto,
          contactPhone,
        }),
      });
      onInvitationCreated(res.invitation);
      setSelectedStatsSlug(res.invitation.slug);
      setFeedback(
        res.invitation.paymentStatus === 'pending'
          ? `تم حفظ الدعوة (${formatEgp(res.invitation.designPriceEgp || 0)}). الكارت مدفوع: سيتواصل معك فريق VÉLORA لتأكيد الدفع، وبعدها يعمل رابط الدعوة للمدعوين.`
          : 'تم إنشاء الدعوة وحفظها! يمكنك الآن نسخ رابطها ومشاركته مع جميع المدعوين.'
      );
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'تعذر حفظ الدعوة.');
    } finally {
      setSaving(false);
    }
  };

  const copyShareUrl = async (slug: string) => {
    const fullUrl = buildInvitationUrl(window.location.origin, slug);
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedSlug(slug);
      window.setTimeout(() => setCopiedSlug(''), 2500);
    } catch {
      setFeedback(fullUrl);
    }
  };

  const selectedInvitation =
    invitations.find((i) => i.slug === selectedStatsSlug) || invitations[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-10">
      {/* Studio Header */}
      <div className="space-y-1.5 border-b border-[#E8DCF3] pb-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278]">
          <Mail className="w-4 h-4" />
          <span>استوديو الدعوات الإلكترونية الفاخرة</span>
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#24172E]">
          صمّم دعوتك الإلكترونية وشاركها فورًا
        </h1>
        <p className="text-sm text-[#5E4D6B]">
          7 تصاميم مختلفة مع معاينة حية، عداد تنازلي مباشر، ورابط مستقل يفتح للضيوف بدون تسجيل
        </p>
      </div>

      {/* Builder + Live Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Controls */}
        <form onSubmit={handleSaveInvitation} className="lg:col-span-5 velora-card rounded-3xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#24172E]">
              1. اختر تصميم الدعوة (7 تصاميم مختلفة)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
              {(Object.keys(INVITATION_DESIGNS) as InvitationDesignId[]).map((id) => {
                const d = INVITATION_DESIGNS[id];
                const active = designId === id;
                const price = templatePrices[id] ?? d.priceEgp;
                const isFree = price <= 0;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDesignId(id)}
                    className={`p-2.5 rounded-xl border text-right transition-all space-y-1.5 ${
                      active
                        ? 'border-[#5B3278] bg-[#F3ECF9] ring-1 ring-[#5B3278]'
                        : 'border-[#E8DCF3] bg-white hover:bg-[#FAF7FD]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#24172E]">{d.labelAr}</span>
                      {d.bgImage ? (
                        <img
                          src={resolveMediaUrl(d.bgImage)}
                          alt={d.labelAr}
                          className="w-6 h-6 rounded-md object-cover border border-[#E8DCF3] shrink-0"
                        />
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full border border-[#E8DCF3] shrink-0"
                          style={{ background: d.cardBg }}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      {isFree ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#EEF8F2] text-[#1D6B44] border border-[#CDE6D7]">
                          مجاني · شعار VÉLORA
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-[#FDF7EA] text-[#8E6F2D] border border-[#EAD6A5] tabular-nums">
                          مميز · {formatEgp(price)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">اسم العريس</label>
              <input
                required
                value={groomName}
                onChange={(e) => setGroomName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">اسم العروسة</label>
              <input
                required
                value={brideName}
                onChange={(e) => setBrideName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">تاريخ الفرح</label>
              <input
                required
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الوقت</label>
              <input
                required
                type="time"
                value={weddingTime}
                onChange={(e) => setWeddingTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">اسم القاعة / المكان</label>
            <input
              required
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">رابط الخريطة</label>
            <input
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
              رقم التواصل (يظهر عند تأكيد حضور الضيف لاستقبال صور الحفل)
            </label>
            <input
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+20 10..."
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">نص الدعوة</label>
            <textarea
              rows={2}
              value={invitationText}
              onChange={(e) => setInvitationText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
            />
          </div>

          {/* Photo chooser or real file upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#5E4D6B]">صورة الدعوة (اختياري)</label>
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3278] cursor-pointer hover:underline">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'جاري الرفع...' : 'رفع صورة من جهازك'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {VELORA_PRESET_PHOTOS.slice(0, 4).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setCouplePhoto(p.key)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 ${
                    couplePhoto === p.key ? 'border-[#5B3278]' : 'border-transparent'
                  }`}
                >
                  <img src={p.url} alt={p.labelAr} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {feedback && (
            <div className="p-3 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-semibold">
              {feedback}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {saving
                ? 'جاري الحفظ...'
                : (templatePrices[designId] ?? INVITATION_DESIGNS[designId].priceEgp) > 0
                ? `حفظ الدعوة المميزة (${formatEgp(templatePrices[designId] ?? INVITATION_DESIGNS[designId].priceEgp)})`
                : 'حفظ الدعوة ومشاركتها مجانًا'}
            </span>
          </button>
        </form>

        {/* Live Card Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#5E4D6B]">
            <span className="font-bold text-[#5B3278]">معاينة حية للدعوة</span>
            <span className="tabular-nums">
              التصميم المختار: {INVITATION_DESIGNS[designId].labelAr} —{' '}
              {(templatePrices[designId] ?? INVITATION_DESIGNS[designId].priceEgp) > 0
                ? formatEgp(templatePrices[designId] ?? INVITATION_DESIGNS[designId].priceEgp)
                : 'مجاني بشعار الموقع'}
            </span>
          </div>
          <InvitationCardRenderer
            invitation={{
              designId,
              designPriceEgp: templatePrices[designId] ?? INVITATION_DESIGNS[designId].priceEgp,
              groomName,
              brideName,
              weddingDate,
              weddingTime,
              venueName,
              mapUrl,
              invitationText,
              couplePhoto,
            }}
          />
        </div>
      </div>

      {/* Saved Invitations & RSVP Stats (Isolated strictly inside Invitations section) */}
      <section className="space-y-5 pt-4 border-t border-[#E8DCF3]">
        <h2 className="font-display text-2xl font-bold text-[#24172E]">
          الدعوات المحفوظة وإحصائيات الحضور ({invitations.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {invitations.map((inv) => {
            const shareUrl = buildInvitationUrl(
              typeof window !== 'undefined' ? window.location.origin : '',
              inv.slug
            );
            const active = selectedInvitation?.id === inv.id;
            return (
              <div
                key={inv.id}
                className={`velora-card rounded-2xl p-5 space-y-3 ${
                  active ? 'ring-2 ring-[#5B3278]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#F3ECF9] text-[#5B3278] text-[11px] font-bold">
                        {INVITATION_DESIGNS[inv.designId]?.labelAr || inv.designId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-nums ${
                          (inv.designPriceEgp ?? 0) > 0
                            ? 'bg-[#FDF7EA] text-[#8E6F2D]'
                            : 'bg-[#EEF8F2] text-[#1D6B44]'
                        }`}
                      >
                        {(inv.designPriceEgp ?? 0) > 0 ? formatEgp(inv.designPriceEgp!) : 'مجاني · شعار VÉLORA'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#24172E] mt-1">
                      {inv.groomName} و {inv.brideName}
                    </h3>
                    <p className="text-xs text-[#6B5A78]">{inv.weddingDate} · {inv.venueName}</p>
                  </div>
                  {user && (user.id === inv.ownerId || user.role === 'admin') && (
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/invitations/${inv.id}`, { method: 'DELETE' });
                        onInvitationDeleted(inv.id);
                      }}
                      className="p-1.5 text-[#9A2D3C] hover:bg-[#FDF1F2] rounded-lg"
                      aria-label="حذف الدعوة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] text-[11px] font-mono text-[#5E4D6B] truncate" dir="ltr">
                  {shareUrl}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyShareUrl(inv.slug)}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-bold"
                  >
                    {copiedSlug === inv.slug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSlug === inv.slug ? 'تم النسخ' : 'نسخ الرابط'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenGuestLink(inv.slug)}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>معاينة الظرف والدعوة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatsSlug(inv.slug)}
                    className="w-full py-2 rounded-xl border border-[#E8DCF3] text-xs font-semibold text-[#5E4D6B] hover:bg-[#FAF7FD]"
                  >
                    عرض الردود والتهاني ({inv.stats?.totalGuests || 0})
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dedicated Invitation Analytics & Guest Congratulations Board */}
        {selectedInvitation && (() => {
          const stats = liveStats || selectedInvitation.stats;
          const filteredRsvps = rsvps.filter((r) => {
            if (rsvpFilter === 'attending' && r.response !== 'attending') return false;
            if (rsvpFilter === 'declined' && r.response !== 'declined') return false;
            if (rsvpFilter === 'messages' && !r.congratulationMessage?.trim()) return false;
            if (rsvpQuery.trim()) {
              const q = rsvpQuery.trim().toLowerCase();
              if (
                !r.guestName.toLowerCase().includes(q) &&
                !(r.congratulationMessage || '').toLowerCase().includes(q)
              ) {
                return false;
              }
            }
            return true;
          });

          return (
            <div className="velora-card rounded-3xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#24172E]">
                    سجل ردود المدعوين — {selectedInvitation.groomName} &amp; {selectedInvitation.brideName}
                  </h3>
                  <p className="text-xs text-[#6B5A78] mt-0.5 font-mono">{selectedInvitation.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchSelectedRsvps(selectedInvitation.slug)}
                  disabled={rsvpLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F3ECF9] hover:bg-[#E8DCF3] text-[#5B3278] text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rsvpLoading ? 'animate-spin' : ''}`} />
                  <span>{rsvpLoading ? 'جاري التحديث...' : 'تحديث الردود'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3]">
                  <div className="flex items-center gap-1.5 text-xs text-[#6B5A78]">
                    <Users className="w-4 h-4 text-[#5B3278]" />
                    <span>إجمالي المسجلين</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-[#24172E] mt-1 tabular-nums">
                    {stats?.totalGuests || 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F3ECF9] border border-[#DFCEF0]">
                  <div className="flex items-center gap-1.5 text-xs text-[#5B3278]">
                    <UserCheck className="w-4 h-4" />
                    <span>الموافقون على الحضور</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-[#5B3278] mt-1 tabular-nums">
                    {stats?.attendingCount || 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FDF1F2] border border-[#EAC1C7]">
                  <div className="flex items-center gap-1.5 text-xs text-[#9A2D3C]">
                    <UserX className="w-4 h-4" />
                    <span>المعتذرون</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-[#9A2D3C] mt-1 tabular-nums">
                    {stats?.declinedCount || 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3]">
                  <div className="flex items-center gap-1.5 text-xs text-[#6B5A78]">
                    <MessageSquareHeart className="w-4 h-4 text-[#C5A25D]" />
                    <span>رسائل التهنئة</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-[#24172E] mt-1 tabular-nums">
                    {stats?.messagesCount || 0}
                  </p>
                </div>
              </div>

              {/* Filter & Search Bar inside RSVP Log */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: `الكل (${rsvps.length})` },
                    { id: 'attending', label: 'الموافقون' },
                    { id: 'declined', label: 'المعتذرون' },
                    { id: 'messages', label: 'التهاني المكتوبة' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRsvpFilter(tab.id as typeof rsvpFilter)}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        rsvpFilter === tab.id
                          ? 'text-white border-[#5B3278]'
                          : 'bg-white text-[#5E4D6B] border-[#E8DCF3] hover:bg-[#FAF7FD]'
                      }`}
                    >
                      {rsvpFilter === tab.id && (
                        <motion.span
                          layoutId="rsvp-tab-pill"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-[7px] bg-[#5B3278] shadow-xs"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#8C799B] absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={rsvpQuery}
                    onChange={(e) => setRsvpQuery(e.target.value)}
                    placeholder="ابحث باسم المدعو أو التهنئة..."
                    className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs focus:outline-none focus:border-[#5B3278]"
                  />
                </div>
              </div>

              {rsvpError && (
                <div className="p-3 rounded-xl bg-[#FDF1F2] border border-[#EAC1C7] text-xs font-semibold text-[#9A2D3C]">
                  {rsvpError}
                </div>
              )}

              <CinematicTabPanel tabKey={rsvpFilter} className="space-y-2.5">
                {filteredRsvps.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#24172E]">{r.guestName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.response === 'attending'
                              ? 'bg-[#5B3278] text-white'
                              : 'bg-[#FDF1F2] text-[#9A2D3C]'
                          }`}
                        >
                          {r.response === 'attending'
                            ? `حاضر (${r.companionsCount})`
                            : 'معتذر عن الحضور'}
                        </span>
                      </div>
                      {r.congratulationMessage && (
                        <p className="text-xs text-[#5E4D6B]">«{r.congratulationMessage}»</p>
                      )}
                    </div>
                    <span className="text-[11px] text-[#8C799B] tabular-nums">
                      {r.guestPhone || '—'}
                    </span>
                  </div>
                ))}
                {filteredRsvps.length === 0 && !rsvpLoading && (
                  <p className="text-xs text-[#7A6A88]">
                    {rsvps.length === 0
                      ? 'لم يسجل ضيوف ردودهم على هذه الدعوة بعد. شارك الرابط ليظهر تأكيد الحضور هنا فورًا.'
                      : 'لا توجد ردود مطابقة لخيارات الفلترة المحددة.'}
                  </p>
                )}
              </CinematicTabPanel>
            </div>
          );
        })()}
      </section>
    </div>
  );
};
