import React, { useEffect, useState } from 'react';
import { Check, MessageSquarePlus, X } from 'lucide-react';
import type { CustomerRequestRecord, RequestReplyRecord, ServiceRecord, UserProfile } from '../types/velora';
import { apiFetch } from '../utils/api';
import { formatEgp } from '../utils/veloraLogic';

const PROVIDER_ROLES = ['venue_owner', 'photographer', 'service_provider'];

interface Props {
  request: CustomerRequestRecord;
  user: UserProfile | null;
  /** the provider's own services, to optionally attach one to the reply */
  services?: ServiceRecord[];
}

export const RequestReplies: React.FC<Props> = ({ request, user, services = [] }) => {
  const isOwner = !!user && request.clientId === user.id;
  const isProvider = !!user && PROVIDER_ROLES.includes(user.role) && !isOwner;
  const [replies, setReplies] = useState<RequestReplyRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [showList, setShowList] = useState(false);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [sharePhone, setSharePhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const res = await apiFetch<{ replies: RequestReplyRecord[] }>(`/api/requests/${request.id}/replies`);
      setReplies(res.replies || []);
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    if (isOwner || isProvider) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, user?.id]);

  if (!user || (!isOwner && !isProvider)) return null;

  const mine = replies.find((r) => r.providerId === user.id);
  const myServices = services.filter((s) => s.ownerId === user.id);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await apiFetch(`/api/requests/${request.id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ priceEgp: Number(price), noteAr: note, serviceId, sharePhone }),
      });
      setOpen(false);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'تعذر إرسال الرد.');
    } finally {
      setBusy(false);
    }
  };
  const decide = async (r: RequestReplyRecord, status: 'accepted' | 'ignored') => {
    try {
      await apiFetch(`/api/requests/${request.id}/replies/${r.id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'تعذر التنفيذ.');
    }
  };
  const withdraw = async () => {
    try {
      await apiFetch(`/api/requests/${request.id}/replies`, { method: 'DELETE' });
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'تعذر السحب.');
    }
  };

  const inputCls = 'w-full rounded-xl border border-[#E8DCF3] bg-white px-3 py-2 text-sm text-[#24172E] focus:outline-none focus:border-[#5B3278]';

  return (
    <div className="pt-3 border-t border-[#F0E7F8] space-y-3" data-testid="request-replies">
      {isOwner && (
        <>
          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-bold text-[#5B3278]"
          >
            <span>العروض على طلبك ({replies.length})</span>
            <span className="text-xs text-[#8C799B]">{showList ? 'إخفاء' : 'عرض'}</span>
          </button>
          {showList &&
            (replies.length === 0 ? (
              <p className="text-xs text-[#5E4D6B]">لم يصلك أي عرض بعد. هتوصلك رسالة أول ما حد يرد.</p>
            ) : (
              replies.map((r) => (
                <div key={r.id} className="rounded-xl bg-[#FAF7FD] border border-[#EFE5F7] p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#24172E] text-sm">{r.providerName}</span>
                    <span className="font-bold text-[#5B3278] tabular-nums">{formatEgp(r.priceEgp)}</span>
                  </div>
                  {r.serviceTitle && <p className="text-[#8C799B]">الخدمة: {r.serviceTitle}</p>}
                  <p className="text-[#5E4D6B] leading-relaxed">{r.noteAr}</p>
                  {r.status === 'sent' ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => decide(r, 'accepted')} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#5B3278] text-white py-2 font-bold">
                        <Check className="w-3.5 h-3.5" /> قبول
                      </button>
                      <button type="button" onClick={() => decide(r, 'ignored')} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-[#E8DCF3] text-[#5E4D6B] py-2 font-semibold">
                        <X className="w-3.5 h-3.5" /> تجاهل
                      </button>
                    </div>
                  ) : r.status === 'accepted' ? (
                    <div className="text-[#2E7D4F] font-bold">
                      تم قبول العرض
                      {r.providerPhone ? (
                        <a href={`tel:${r.providerPhone}`} className="block mt-1 text-[#5B3278] tabular-nums" dir="ltr">{r.providerPhone}</a>
                      ) : (
                        <span className="block mt-1 font-normal text-[#5E4D6B]">مقدم الخدمة هيتواصل معاك.</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[#8C799B]">تم تجاهل العرض</div>
                  )}
                </div>
              ))
            ))}
        </>
      )}

      {isProvider && (
        <>
          {mine && !open && (
            <div className="rounded-xl bg-[#FAF7FD] border border-[#EFE5F7] p-3 text-xs space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-[#24172E]">ردّك: {formatEgp(mine.priceEgp)}</span>
                <span className={mine.status === 'accepted' ? 'text-[#2E7D4F]' : mine.status === 'ignored' ? 'text-[#8C799B]' : 'text-[#5B3278]'}>
                  {mine.status === 'accepted' ? 'تم قبول عرضك' : mine.status === 'ignored' ? 'لم يتم اختيار عرضك' : 'في انتظار العميل'}
                </span>
              </div>
              <p className="text-[#5E4D6B]">{mine.noteAr}</p>
              {mine.status === 'sent' && (
                <div className="flex gap-3 pt-1">
                  <button type="button" className="text-[#5B3278] font-bold" onClick={() => { setPrice(String(mine.priceEgp)); setNote(mine.noteAr); setServiceId(mine.serviceId || ''); setSharePhone(!!mine.providerPhone); setOpen(true); }}>تعديل</button>
                  <button type="button" className="text-[#B3261E] font-bold" onClick={withdraw}>سحب الرد</button>
                </div>
              )}
            </div>
          )}
          {!mine && !open && request.status === 'open' && (
            <button type="button" onClick={() => setOpen(true)} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B3278] text-white py-2.5 text-sm font-bold">
              <MessageSquarePlus className="w-4 h-4" /> رد على الطلب
            </button>
          )}
          {open && (
            <form onSubmit={send} className="space-y-2.5">
              <input type="number" min={0} required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="سعرك بالجنيه" className={inputCls} />
              <textarea required rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder="رسالة قصيرة للعميل (تفاصيل عرضك)" className={inputCls} />
              {myServices.length > 0 && (
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
                  <option value="">بدون ربط بخدمة</option>
                  {myServices.map((s) => (
                    <option key={s.id} value={s.id}>{s.titleAr}</option>
                  ))}
                </select>
              )}
              {user.phone && (
                <label className="flex items-center gap-2 text-xs text-[#5E4D6B]">
                  <input type="checkbox" checked={sharePhone} onChange={(e) => setSharePhone(e.target.checked)} />
                  أشارك رقمي مع العميل (اختياري، يظهر له بعد قبوله العرض)
                </label>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-[#5B3278] text-white py-2.5 text-sm font-bold disabled:opacity-60">{busy ? 'جارٍ الإرسال…' : 'إرسال العرض'}</button>
                <button type="button" onClick={() => setOpen(false)} className="px-4 rounded-xl border border-[#E8DCF3] text-sm text-[#5E4D6B]">إلغاء</button>
              </div>
            </form>
          )}
        </>
      )}
      {err && <p className="text-xs text-[#B3261E]">{err}</p>}
    </div>
  );
};
