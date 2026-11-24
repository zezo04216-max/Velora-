import React, { useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { BookingRecord, UserProfile } from '../types/velora';
import { apiFetch } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { formatEgp, getBookingStatusMeta } from '../utils/veloraLogic';
import { motion } from 'motion/react';
import { CinematicTabPanel, VELORA_EASE } from './CinematicMotion';

interface BookingsViewProps {
  bookings: BookingRecord[];
  user: UserProfile | null;
  onRefreshBookings: () => void;
  onRequireAuth: () => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  bookings,
  user,
  onRefreshBookings,
  onRequireAuth,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'as_client' | 'as_provider'>('all');
  const [actionBusyId, setActionBusyId] = useState<string>('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 pb-24">
        <div className="velora-card rounded-3xl p-8 text-center space-y-4">
          <CalendarCheck2 className="w-10 h-10 text-[#5B3278] mx-auto" />
          <h1 className="font-display text-2xl font-bold text-[#24172E]">سجل الحجوزات الخاص بك</h1>
          <p className="text-sm text-[#5E4D6B]">
            سجّل دخولك لمتابعة حالة حجوزاتك لحظة بلحظة أو إدارة الحجوزات الواردة لخدماتك.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-6 py-3 rounded-xl bg-[#5B3278] text-white text-sm font-bold"
          >
            تسجيل الدخول للمتابعة
          </button>
        </div>
      </div>
    );
  }

  const clientBookings = bookings.filter((b) => b.clientId === user.id);
  const providerBookings = bookings.filter((b) => b.providerOwnerId === user.id);

  const visibleList =
    filterMode === 'as_client'
      ? clientBookings
      : filterMode === 'as_provider'
        ? providerBookings
        : bookings;

  const handleProviderDecision = async (bookingId: string, decision: 'approve' | 'reject') => {
    setActionBusyId(bookingId);
    setFeedback(null);
    try {
      await apiFetch(`/api/bookings/${bookingId}/provider-action`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          note: decision === 'approve' ? 'تمت الموافقة من مقدم الخدمة.' : 'اعتذر مقدم الخدمة عن الموعد.',
        }),
      });
      setFeedback({
        ok: true,
        text:
          decision === 'approve'
            ? 'تم تسجيل موافقتك! يكتمل التأكيد النهائي فور اعتماد الإدارة.'
            : 'تم رفض الحجز وإبلاغ العميل.',
      });
      onRefreshBookings();
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'تعذر تنفيذ القرار.',
      });
    } finally {
      setActionBusyId('');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setActionBusyId(bookingId);
    setFeedback(null);
    try {
      await apiFetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
      setFeedback({ ok: true, text: 'تم إلغاء الحجز بنجاح.' });
      onRefreshBookings();
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'تعذر الإلغاء.',
      });
    } finally {
      setActionBusyId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-7">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8DCF3] pb-5">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278]">
            <CalendarCheck2 className="w-4 h-4" />
            <span>متابعة الحجوزات والاعتماد المزدوج</span>
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#24172E]">حجوزاتي</h1>
          <p className="text-sm text-[#5E4D6B]">
            حالة كل حجز واضحة بالكامل: قيد الانتظار، موافقة مبدئية، مؤكد نهائيًا، مرفوض، أو ملغي
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-[#F3ECF9] border border-[#E8DCF3]">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'all' ? 'text-white' : 'text-[#5E4D6B] hover:text-[#24172E]'
            }`}
          >
            {filterMode === 'all' && (
              <motion.span
                layoutId="bookings-tab-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
              />
            )}
            <span className="relative z-10">الكل ({bookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('as_client')}
            className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'as_client' ? 'text-white' : 'text-[#5E4D6B] hover:text-[#24172E]'
            }`}
          >
            {filterMode === 'as_client' && (
              <motion.span
                layoutId="bookings-tab-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
              />
            )}
            <span className="relative z-10">طلباتي ({clientBookings.length})</span>
          </button>
          {providerBookings.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode('as_provider')}
              className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                filterMode === 'as_provider' ? 'text-white' : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              {filterMode === 'as_provider' && (
                <motion.span
                  layoutId="bookings-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">الحجوزات الواردة ({providerBookings.length})</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold ${
            feedback.ok
              ? 'bg-[#F3ECF9] text-[#5B3278] border border-[#5B3278]/25'
              : 'bg-[#FDF1F2] text-[#9A2D3C] border border-[#EAC1C7]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <CinematicTabPanel tabKey={filterMode}>
      {visibleList.length === 0 ? (
        <div className="velora-card rounded-3xl p-10 text-center space-y-2">
          <p className="text-base font-bold text-[#24172E]">لا توجد حجوزات مسجلة حتى الآن</p>
          <p className="text-xs text-[#5E4D6B]">
            تصفح القاعات والمصورين والخدمات واختر تاريخ مناسبتك لإرسال طلب حجز جديد.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visibleList.map((bk, idx) => {
            const meta = getBookingStatusMeta(bk.status);
            const isProviderForThis = bk.providerOwnerId === user.id;
            const isClientForThis = bk.clientId === user.id;

            return (
              <motion.article
                key={bk.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.32, delay: Math.min(idx * 0.045, 0.22), ease: VELORA_EASE }}
                className="velora-card rounded-2xl p-5 space-y-4 transition-shadow hover:shadow-md hover:shadow-[#5B3278]/10"
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={resolveMediaUrl(bk.targetImage)}
                    alt={bk.targetTitle}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[#E8DCF3]"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                      >
                        {bk.status === 'confirmed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : bk.status === 'rejected' || bk.status === 'cancelled' ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span>{meta.labelAr}</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-[#5B3278] tabular-nums">
                        {bk.eventDate}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#24172E] truncate">{bk.targetTitle}</h2>
                    <p className="text-xs text-[#6B5A78]">
                      العميل: {bk.clientName} · {bk.guestsCount} ضيف ·{' '}
                      <span className="font-bold text-[#5B3278] tabular-nums">
                        {formatEgp(bk.estimatedTotalEgp)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Dual Approval Tracker */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#F0E7F8]">
                  <div
                    className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                      bk.providerApproved
                        ? 'bg-[#F3ECF9] border-[#C9B0E3] text-[#5B3278]'
                        : 'bg-[#FAF7FD] border-[#E8DCF3] text-[#7A6A88]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>موافقة مقدم الخدمة: {bk.providerApproved ? 'تمت' : 'قيد الانتظار'}</span>
                  </div>
                  <div
                    className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                      bk.adminApproved
                        ? 'bg-[#F3ECF9] border-[#C9B0E3] text-[#5B3278]'
                        : 'bg-[#FAF7FD] border-[#E8DCF3] text-[#7A6A88]'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>اعتماد الإدارة: {bk.adminApproved ? 'تم' : 'قيد الانتظار'}</span>
                  </div>
                </div>

                {bk.notes && (
                  <p className="text-xs text-[#5E4D6B] bg-[#FAF7FD] p-2.5 rounded-xl border border-[#E8DCF3]">
                    {bk.notes}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isProviderForThis &&
                    !bk.providerApproved &&
                    bk.status !== 'rejected' &&
                    bk.status !== 'cancelled' && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusyId === bk.id}
                          onClick={() => handleProviderDecision(bk.id, 'approve')}
                          className="px-4 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-bold hover:bg-[#482461]"
                        >
                          موافقة مقدم الخدمة
                        </button>
                        <button
                          type="button"
                          disabled={actionBusyId === bk.id}
                          onClick={() => handleProviderDecision(bk.id, 'reject')}
                          className="px-4 py-2 rounded-xl bg-[#FDF1F2] text-[#9A2D3C] border border-[#EAC1C7] text-xs font-bold"
                        >
                          رفض
                        </button>
                      </>
                    )}

                  {isClientForThis &&
                    bk.status !== 'cancelled' &&
                    bk.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={actionBusyId === bk.id}
                        onClick={() => handleCancelBooking(bk.id)}
                        className="px-3.5 py-2 rounded-xl border border-[#E8DCF3] text-xs font-semibold text-[#6D5F79] hover:bg-[#FDF1F2] hover:text-[#9A2D3C]"
                      >
                        إلغاء الطلب
                      </button>
                    )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
      </CinematicTabPanel>
    </div>
  );
};
