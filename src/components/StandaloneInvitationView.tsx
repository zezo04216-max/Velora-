import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Heart,
  Phone,
  Send,
  Sparkles,
  UserX,
} from 'lucide-react';
import type { ElectronicInvitationRecord, InvitationStats } from '../types/velora';
import { apiFetch } from '../utils/api';
import { COUPLE_FLORAL_ILLUSTRATION, IVORY_ROSES_CARD_BG } from '../utils/veloraAssets';
import { INVITATION_PHOTO_MESSAGE_AR } from '../utils/veloraLogic';
import { FallingPetalsOverlay } from './FallingPetalsOverlay';
import { InvitationCardRenderer, getDesignLook } from './InvitationCardRenderer';

interface StandaloneInvitationViewProps {
  slug: string;
  /** True ONLY when opened inside the platform preview modal; external shared links MUST keep this false so guests never jump to the site */
  allowReturnToPreviewHost?: boolean;
  onExitPreview?: () => void;
}

export const StandaloneInvitationView: React.FC<StandaloneInvitationViewProps> = ({
  slug,
  allowReturnToPreviewHost = false,
  onExitPreview,
}) => {
  const [invitation, setInvitation] = useState<ElectronicInvitationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sealed Envelope Stage: sealed -> opening (1s light burst + flap opens) -> opened (card + RSVP visible)
  const [envelopeStage, setEnvelopeStage] = useState<'sealed' | 'opening' | 'opened'>('sealed');

  // Guest RSVP state — NO login required
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [response, setResponse] = useState<'attending' | 'declined'>('attending');
  const [companionsCount, setCompanionsCount] = useState('1');
  const [congratulationMessage, setCongratulationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedChoice, setSubmittedChoice] = useState<'attending' | 'declined' | null>(null);
  const [submitErr, setSubmitErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setEnvelopeStage('sealed');
    apiFetch<{ invitation: ElectronicInvitationRecord; stats: InvitationStats }>(
      `/api/invitations/${encodeURIComponent(slug)}`
    )
      .then((res) => {
        if (!cancelled) setInvitation(res.invitation);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'تعذر تحميل الدعوة.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleOpenEnvelope = () => {
    if (envelopeStage !== 'sealed') return;
    setEnvelopeStage('opening');
    window.setTimeout(() => {
      setEnvelopeStage('opened');
    }, 950);
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setSubmitting(true);
    setSubmitErr('');
    try {
      await apiFetch(`/api/invitations/${encodeURIComponent(invitation.slug)}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({
          guestName,
          guestPhone,
          response,
          companionsCount: response === 'attending' ? Number(companionsCount) || 1 : 1,
          congratulationMessage,
        }),
      });
      setSubmittedChoice(response);
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'تعذر تسجيل ردك.');
    } finally {
      setSubmitting(false);
    }
  };

  const look = getDesignLook(invitation?.designId || 'royal');
  const foldA = look.dark ? 'rgba(0,0,0,.2)' : 'rgba(70,40,60,.10)';
  const foldB = look.dark ? 'rgba(0,0,0,.3)' : 'rgba(70,40,60,.17)';
  const isRomanticTheme = false; // legacy photo theme retired with the card redesign
  const showRomanticBg = isRomanticTheme && envelopeStage === 'opened';

  return (
    <div
      className={`min-h-screen pb-16 relative overflow-x-hidden transition-colors duration-700 ${
        showRomanticBg
          ? 'bg-[#0B2418]'
          : 'bg-gradient-to-b from-[#FFFFFF] via-[#FAF7FD] to-[#F3ECF9]'
      }`}
      style={envelopeStage !== 'opened' && invitation ? { background: `linear-gradient(180deg, #ffffff 0%, color-mix(in srgb, ${look.bg} 16%, white) 100%)` } : undefined}
    >
      <FallingPetalsOverlay enabled={envelopeStage === 'opened'} />
      {/* Only shown to internal host preview — NEVER shown on external shared guest URLs */}
      {allowReturnToPreviewHost && onExitPreview && (
        <div className="sticky top-0 z-30 velora-glass px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onExitPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E8DCF3] bg-white text-[#5B3278] text-xs font-bold hover:bg-[#F3ECF9]"
          >
            <ArrowRight className="w-4 h-4" />
            <span>إغلاق المعاينة</span>
          </button>
          <span className="text-xs font-semibold text-[#5E4D6B]">معاينة دعوة الضيف</span>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">
        {loading ? (
          <div className="velora-card rounded-3xl p-12 text-center text-sm text-[#5E4D6B]">
            جاري تجهيز ظرف الدعوة الخاص بك...
          </div>
        ) : error || !invitation ? (
          <div className="velora-card rounded-3xl p-10 text-center space-y-3">
            <p className="text-base font-bold text-[#9A2D3C]">{error || 'الدعوة غير متاحة.'}</p>
            <p className="text-xs text-[#6B5A78]">يرجى التأكد من صحة رابط الدعوة المرسل إليك.</p>
          </div>
        ) : envelopeStage !== 'opened' ? (
          /* Stage 1 & 2: Royal VÉLORA Signature Envelope with Couple Names Embossed on Top Flap */
          <div className="min-h-[78vh] flex flex-col items-center justify-center py-6 space-y-7">
            <div className="text-center space-y-1.5">
              <p className="relative font-editorial text-xs tracking-[0.32em] uppercase font-semibold" style={{ color: look.dark ? look.bg : look.head }}>
                {look.eyebrow} · VÉLORA
              </p>
              <p className="relative text-xs sm:text-sm font-medium text-[#5E4D6B]">
                دعوة خاصة لحضور حفل زفاف سعيد
              </p>
            </div>

            <div className="relative w-full max-w-[380px] sm:max-w-[440px] pt-8 pb-4 flex items-center justify-center">
              {/* Soft Royal Violet & Champagne Gold Aura behind the envelope */}
              <div
                aria-hidden="true"
                className={`absolute -inset-x-6 -top-8 bottom-0 rounded-full blur-3xl pointer-events-none ${
                  envelopeStage === 'opening' ? 'animate-envelope-burst' : 'animate-envelope-glow'
                }`}
                style={{
                  background: `radial-gradient(circle at 50% 55%, ${look.accent}99 0%, ${look.accent}55 35%, ${look.bg}33 68%, transparent 100%)`,
                }}
              />

              {/* Upward Light Rays when opening */}
              {envelopeStage === 'opening' && (
                <div
                  aria-hidden="true"
                  className="absolute -top-16 inset-x-8 h-48 pointer-events-none animate-envelope-burst"
                  style={{
                    background:
                      'conic-gradient(from 165deg at 50% 100%, transparent 0deg, rgba(255,248,225,0.95) 20deg, rgba(197,162,93,0.5) 40deg, transparent 60deg)',
                    filter: 'blur(7px)',
                  }}
                />
              )}

              {/* Luxury VÉLORA Royal Purple Velvet Envelope */}
              <button
                type="button"
                onClick={handleOpenEnvelope}
                className="relative w-full aspect-[4/3] rounded-[22px] shadow-2xl cursor-pointer focus:outline-none group"
                style={{
                  perspective: '1200px',
                  boxShadow: `0 25px 50px -12px ${look.accent}66`,
                }}
                aria-label={`افتح ظرف دعوة ${invitation.groomName} و ${invitation.brideName}`}
              >
                {/* Envelope Base Body (Royal Purple Velvet with Gold Frame) */}
                <div
                  className="absolute inset-0 rounded-[22px] overflow-hidden border-2"
                  style={{
                    background: look.bg,
                    borderColor: look.accent,
                  }}
                >
                  {/* Inner Stitched Gold Foil Edge */}
                  <div className="absolute inset-2.5 rounded-2xl border pointer-events-none z-10" style={{ borderColor: `${look.accent}66` }} />

                  {/* Peeking Inner Cream Card Rising on Open */}
                  <div
                    className={`absolute inset-x-5 bottom-3 h-[84%] rounded-t-2xl border-2 shadow-inner flex flex-col items-center justify-center gap-1.5 transition-transform duration-700 ${
                      envelopeStage === 'opening' ? '-translate-y-14 scale-[1.03]' : 'translate-y-4'
                    }`}
                    style={{ background: `linear-gradient(180deg, ${look.bg}, color-mix(in srgb, ${look.bg} 88%, ${look.dark ? '#000' : '#fff'}))`, borderColor: look.accent }}
                  >
                    <p className="font-editorial text-[10px] tracking-[0.28em] font-semibold" style={{ color: look.accent }}>
                      YOU ARE INVITED
                    </p>
                    <p className="font-display text-2xl font-bold" style={{ color: look.head }}>
                      {invitation.groomName} &amp; {invitation.brideName}
                    </p>
                  </div>

                  {/* Side Velvet Envelope Folds */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        `linear-gradient(212deg, ${foldA} 50%, transparent 50.6%), linear-gradient(148deg, ${foldB} 50%, transparent 50.6%)`,
                      transform: 'scaleY(-1)',
                    }}
                  />

                  {/* Bottom Triangular Velvet Pocket with Gold Rim + Venue / Date Print */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-[56%] pointer-events-none border-t flex flex-col items-center justify-end pb-4 px-5"
                    style={{
                      borderColor: `${look.accent}73`,
                      background: `linear-gradient(180deg, ${look.bg}f2 0%, ${look.bg}cc 100%), url(${look.bottom}) center bottom / cover no-repeat, ${look.bg}`,
                      clipPath: 'polygon(0 100%, 50% 10%, 100% 100%)',
                    }}
                  >
                    <div className="text-center space-y-0.5 max-w-[85%]">
                      <p className="text-[11px] font-semibold truncate tabular-nums" style={{ color: look.accent }}>
                        {invitation.weddingDate} · {invitation.venueName}
                      </p>
                      <p className="text-[10px] tracking-[0.18em]" style={{ color: look.body }}>
                        تفضلوا بفتح الظرف
                      </p>
                    </div>
                  </div>
                </div>

                {/* Animated Top Flap with Couple Names Embossed Proudly Directly on the Flap */}
                <div
                  className="absolute inset-x-0 top-0 h-[62%] origin-top transition-transform duration-700 z-20 pointer-events-none"
                  style={{
                    transform: envelopeStage === 'opening' ? 'rotateX(175deg)' : 'rotateX(0deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div
                    className="relative w-full h-full rounded-t-[22px] border-t-2 border-x-2 flex flex-col items-center justify-start pt-4 sm:pt-5 px-6 text-center"
                    style={{
                      borderColor: look.accent,
                      background: `linear-gradient(180deg, ${look.bg}f0 0%, ${look.bg}b3 100%), url(${look.top}) center top / cover no-repeat, ${look.bg}`,
                      clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                    }}
                  >
                    <div className="space-y-1 max-w-[88%]">
                      <p className="font-editorial text-[9px] sm:text-[10px] tracking-[0.28em] uppercase font-semibold" style={{ color: look.accent }}>
                        ✦ VÉLORA WEDDING INVITATION ✦
                      </p>
                      <h1 className="font-display text-2xl sm:text-[28px] font-bold leading-tight drop-shadow-sm" style={{ color: look.head }}>
                        {invitation.groomName}{' '}
                        <span className="font-editorial italic" style={{ color: look.accent }}>&amp;</span>{' '}
                        {invitation.brideName}
                      </h1>
                      <div className="w-20 h-[1px] mx-auto" style={{ background: `linear-gradient(to right, transparent, ${look.accent}, transparent)` }} />
                    </div>
                  </div>
                </div>

                {/* Royal Champagne Gold Wax Seal Centered at Flap Tip */}
                <div
                  className={`absolute left-1/2 top-[59%] -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-500 ${
                    envelopeStage === 'opening' ? 'opacity-0 scale-125' : 'opacity-100 group-hover:scale-105'
                  }`}
                >
                  <div className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-full shadow-xl border-2 border-[#FFF8E6] flex flex-col items-center justify-center text-[#2E183E]" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${look.accent} 45%, white), ${look.accent}, color-mix(in srgb, ${look.accent} 65%, black))`, boxShadow: '0 10px 25px rgba(0,0,0,.35)' }}>
                    <Sparkles className="w-4 h-4 mb-0.5 text-[#3B1A52]" />
                    <span className="font-editorial text-[9px] font-extrabold tracking-widest text-[#2E183E]">
                      VÉLORA
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenEnvelope}
              disabled={envelopeStage !== 'sealed'}
              className="relative px-7 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 border hover:brightness-110"
              style={{ background: look.dark ? look.bg : look.head, color: look.dark ? look.head : '#fff', borderColor: look.accent }}
            >
              <Sparkles className="w-4 h-4" style={{ color: look.accent }} />
              <span>{envelopeStage === 'opening' ? 'جاري فتح الظرف الملكي...' : 'افتح الدعوة الآن'}</span>
            </button>
          </div>
        ) : (
          /* Stage 3: Opened Card + Seamless Integrated RSVP */
          <div className="space-y-8 animate-card-emerge">
            <InvitationCardRenderer invitation={invitation} animate />

            {/* Interactive Guest RSVP Section — Accessible WITHOUT Sign-in */}
            <div className="relative pt-14 sm:pt-16">
              {isRomanticTheme && (
                <div className="absolute inset-x-0 top-0 h-32 flex justify-center pointer-events-none select-none overflow-hidden">
                  <img
                    src={COUPLE_FLORAL_ILLUSTRATION}
                    alt=""
                    aria-hidden="true"
                    className="h-36 sm:h-40 w-auto object-contain rounded-t-3xl opacity-95"
                  />
                </div>
              )}
              <section
                className={`relative z-10 rounded-3xl p-6 sm:p-8 space-y-6 overflow-hidden ${
                  isRomanticTheme
                    ? 'bg-[#FAF8F2]/92 backdrop-blur-md border border-[#D4C5A1] shadow-2xl'
                    : 'velora-card'
                }`}
              >
                {isRomanticTheme && (
                  <img
                    src={IVORY_ROSES_CARD_BG}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none select-none"
                  />
                )}
                <div className="relative z-10">
              {submittedChoice ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#F3ECF9] text-[#5B3278] flex items-center justify-center">
                    {submittedChoice === 'attending' ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : (
                      <Heart className="w-7 h-7" />
                    )}
                  </div>

                  {submittedChoice === 'attending' ? (
                    <>
                      <h3 className="font-display text-2xl font-bold text-[#24172E]">
                        يسعدنا تشريفكم وحضوركم معنا!
                      </h3>
                      <p className="text-sm text-[#5E4D6B]">
                        تم تسجيل تأكيد حضورك ({guestName}) بنجاح. نتطلع لرؤيتكم في ليلة العمر.
                      </p>

                      {/* Exact required photo-sharing message & couple contact phone */}
                      <div className="mt-4 p-5 rounded-2xl bg-[#F3ECF9] border border-[#C9B0E3] space-y-2.5 text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3278]">
                          <Camera className="w-4 h-4" />
                          <span>مشاركة أجمل اللحظات</span>
                        </div>
                        <p className="text-sm font-bold text-[#24172E] leading-relaxed">
                          {INVITATION_PHOTO_MESSAGE_AR}
                        </p>
                        <div
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#DFCEF0] text-sm font-bold text-[#5B3278]"
                          dir="ltr"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{invitation.contactPhone || 'غير محدد'}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="font-display text-2xl font-bold text-[#24172E]">
                        شكرًا لمشاركتنا مشاعركم الطيبة
                      </h3>
                      <p className="text-sm text-[#5E4D6B]">
                        تم تسجيل اعتذارك وإيصال تهنئتك إلى {invitation.groomName} و{' '}
                        {invitation.brideName}.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handleRsvpSubmit} className="space-y-5">
                  <div className="text-center space-y-1">
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
                      هتشاركنا فرحتنا؟
                    </h3>
                    <p className="text-xs text-[#5E4D6B]">
                      أدخل اسمك وأكد حضورك أو أرسل تهنئة للعروسين في ثوانٍ
                    </p>
                  </div>

                  {/* Choice buttons: حاضر / أعتذر عن الحضور */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setResponse('attending')}
                      className={`py-3.5 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        response === 'attending'
                          ? 'bg-[#5B3278] text-white border-[#5B3278]'
                          : 'bg-white text-[#5E4D6B] border-[#E8DCF3]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حاضر</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponse('declined')}
                      className={`py-3.5 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        response === 'declined'
                          ? 'bg-[#9A2D3C] text-white border-[#9A2D3C]'
                          : 'bg-white text-[#5E4D6B] border-[#E8DCF3]'
                      }`}
                    >
                      <UserX className="w-4 h-4" />
                      <span>أعتذر عن الحضور</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                        اسمك
                      </label>
                      <input
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="اكتب اسمك الكامل"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                        رقم الهاتف (اختياري)
                      </label>
                      <input
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="010..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                      />
                    </div>
                  </div>

                  {response === 'attending' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                        عدد الحضور المرافقين (شاملاً لك)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={companionsCount}
                        onChange={(e) => setCompanionsCount(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                      رسالة تهنئة للعروسين
                    </label>
                    <textarea
                      rows={3}
                      value={congratulationMessage}
                      onChange={(e) => setCongratulationMessage(e.target.value)}
                      placeholder="اكتب كلمة جميلة للعروسين..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                    />
                  </div>

                  {submitErr && (
                    <p className="text-xs font-semibold text-[#9A2D3C]">{submitErr}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                      isRomanticTheme
                        ? 'bg-[#3D5542] hover:bg-[#2F4233]'
                        : 'bg-[#5B3278] hover:bg-[#482461]'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'جاري تسجيل ردك...' : 'تأكيد الحضور'}</span>
                  </button>
                </form>
              )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
