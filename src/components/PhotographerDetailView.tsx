import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Star,
  XCircle,
} from 'lucide-react';
import type { PhotographerRecord, ReviewRecord, UserProfile } from '../types/velora';
import { apiFetch } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { formatEgp } from '../utils/veloraLogic';

interface PhotographerDetailViewProps {
  photographerId: string;
  user: UserProfile | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
  onBooked: () => void;
  onRequireAuth: () => void;
}

export const PhotographerDetailView: React.FC<PhotographerDetailViewProps> = ({
  photographerId,
  user,
  isFavorite,
  onToggleFavorite,
  onBack,
  onBooked,
  onRequireAuth,
}) => {
  const [photographer, setPhotographer] = useState<PhotographerRecord | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAlbumId, setExpandedAlbumId] = useState<string>('');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const [eventDate, setEventDate] = useState('');
  const [availability, setAvailability] = useState<'idle' | 'available' | 'reserved'>('idle');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMsg, setBookingMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [rating, setRating] = useState(5);
  const [commentAr, setCommentAr] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<{ photographer: PhotographerRecord; reviews: ReviewRecord[] }>(
      `/api/photographers/${photographerId}`
    )
      .then((res) => {
        if (!cancelled) {
          setPhotographer(res.photographer);
          setReviews(res.reviews || []);
          if (res.photographer.albums.length > 0) {
            setExpandedAlbumId(res.photographer.albums[0].id);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [photographerId]);

  useEffect(() => {
    if (!eventDate || !photographer) {
      setAvailability('idle');
      return;
    }
    let cancelled = false;
    apiFetch<{ specificAvailable: boolean }>(
      `/api/availability?date=${encodeURIComponent(eventDate)}&targetType=photographer&targetId=${encodeURIComponent(photographer.id)}`
    )
      .then((res) => {
        if (!cancelled) setAvailability(res.specificAvailable ? 'available' : 'reserved');
      })
      .catch(() => {
        if (!cancelled) setAvailability('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [eventDate, photographer]);

  if (loading || !photographer) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-[#5E4D6B]">
        جاري تحميل ملف المصور والألبومات...
      </div>
    );
  }

  const finalPrice = Math.round(
    photographer.startingPrice * (1 - photographer.discountPercent / 100)
  );

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setBookingLoading(true);
    setBookingMsg(null);
    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'photographer',
          targetId: photographer.id,
          eventDate,
          guestsCount: 150,
          notes,
        }),
      });
      setBookingMsg({
        ok: true,
        text: 'تم إرسال طلب حجز المصور بنجاح، بانتظار موافقة المصور والإدارة.',
      });
      onBooked();
    } catch (err) {
      setBookingMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'تعذر إتمام طلب الحجز.',
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setReviewMsg('');
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'photographer',
          targetId: photographer.id,
          rating,
          commentAr,
        }),
      });
      setCommentAr('');
      setReviewMsg('تم إرسال تقييمك للمراجعة الإدارية بنجاح.');
    } catch (err) {
      setReviewMsg(err instanceof Error ? err.message : 'تعذر إرسال التقييم.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278] hover:underline"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة إلى قائمة المصورين</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Portfolio Header Card */}
          <div className="velora-card rounded-3xl overflow-hidden">
            <div className="relative h-64">
              <img
                src={resolveMediaUrl(photographer.coverImage)}
                alt={photographer.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={resolveMediaUrl(photographer.avatarUrl)}
                    alt={photographer.displayName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E8DCF3]"
                  />
                  <div>
                    <h1 className="font-display text-2xl font-bold text-[#24172E]">
                      {photographer.displayName}
                    </h1>
                    <p className="text-xs font-semibold text-[#5B3278]">{photographer.specialtyAr}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold ${
                    isFavorite
                      ? 'bg-[#5B3278] text-white border-[#5B3278]'
                      : 'bg-white text-[#5B3278] border-[#E8DCF3]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  <span>{isFavorite ? 'في المفضلة' : 'حفظ'}</span>
                </button>
              </div>

              <p className="text-sm text-[#5E4D6B] leading-relaxed">{photographer.bioAr}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div className="p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#5B3278]" />
                  <div>
                    <span className="text-[#7C678D] block">الخبرة</span>
                    <span className="font-bold text-[#24172E]">{photographer.yearsExperience} سنوات</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#5B3278]" />
                  <div>
                    <span className="text-[#7C678D] block">الاستوديو</span>
                    <span className="font-bold text-[#24172E]">{photographer.studioLocation}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#5B3278]" />
                  <div>
                    <span className="text-[#7C678D] block">المواعيد</span>
                    <span className="font-bold text-[#24172E]">{photographer.workingHours}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F3ECF9]/60 border border-[#E8DCF3] text-xs space-y-1">
                <span className="font-bold text-[#5B3278] block">المعدات الاحترافية المستخدمة</span>
                <p className="text-[#5E4D6B]">{photographer.equipmentAr}</p>
              </div>
            </div>
          </div>

          {/* Expandable Multi-Photo Albums */}
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold text-[#24172E]">
              ألبومات الأعمال وجلسات التصوير ({photographer.albums.length})
            </h2>

            {photographer.albums.map((alb) => {
              const isOpen = expandedAlbumId === alb.id;
              return (
                <div key={alb.id} className="velora-card rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedAlbumId(isOpen ? '' : alb.id)}
                    className="w-full p-5 text-right flex items-center justify-between gap-4 hover:bg-[#FAF7FD]"
                  >
                    <div>
                      <h3 className="text-base font-bold text-[#24172E]">{alb.titleAr}</h3>
                      <p className="text-xs text-[#6B5A78] mt-0.5">
                        {alb.locationAr} · {alb.sessionDate} · {alb.photos.length} صور
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-xs font-semibold shrink-0">
                      {isOpen ? 'إغلاق الألبوم' : 'فتح الألبوم'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-3 border-t border-[#F0E7F8] pt-4">
                      <p className="text-xs text-[#5E4D6B]">{alb.descriptionAr}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {alb.photos.map((photo, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxImg(resolveMediaUrl(photo))}
                            className="rounded-xl overflow-hidden border border-[#E8DCF3] h-36 group"
                          >
                            <img
                              src={resolveMediaUrl(photo)}
                              alt={alb.titleAr}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Approved Reviews */}
          <div className="velora-card rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#24172E]">تقييمات العملاء ({reviews.length})</h2>
            {reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#24172E]">{rev.authorName}</span>
                  <span className="text-xs font-semibold text-[#5B3278]">
                    {'★'.repeat(rev.rating)}
                  </span>
                </div>
                <p className="text-xs text-[#5E4D6B]">{rev.commentAr}</p>
              </div>
            ))}
            <form onSubmit={handleSubmitReview} className="pt-3 border-t border-[#F0E7F8] space-y-3">
              <h3 className="text-sm font-bold text-[#24172E]">أضف تقييمك</h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      rating >= n ? 'bg-[#5B3278] text-white border-[#5B3278]' : 'bg-white border-[#E8DCF3]'
                    }`}
                  >
                    {n} ★
                  </button>
                ))}
              </div>
              <textarea
                required
                rows={2}
                value={commentAr}
                onChange={(e) => setCommentAr(e.target.value)}
                placeholder="شارك تجربتك مع هذا المصور..."
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
              {reviewMsg && <p className="text-xs font-semibold text-[#5B3278]">{reviewMsg}</p>}
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-semibold"
              >
                إرسال التقييم
              </button>
            </form>
          </div>
        </div>

        {/* Right Booking Panel */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 velora-card rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#F0E7F8] pb-4">
            <div>
              <span className="text-xs text-[#7A6A88] block">تبدأ الباقة من</span>
              <span className="font-display text-2xl font-bold text-[#5B3278] tabular-nums">
                {formatEgp(finalPrice)}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B3278]">
              <Star className="w-4 h-4 fill-[#C5A25D] text-[#C5A25D]" />
              {photographer.avgRating}
            </span>
          </div>

          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#24172E] mb-1.5">
                اختر تاريخ التصوير
              </label>
              <input
                required
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9B0E3] bg-[#FAF7FD] text-sm"
              />
              {availability === 'available' && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>متاح في هذا التاريخ</span>
                </div>
              )}
              {availability === 'reserved' && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#FDF1F2] text-[#9A2D3C] text-xs font-semibold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>محجوز في هذا التاريخ</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24172E] mb-1.5">
                تفاصيل الجلسة أو القاعة
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تغطية التحضيرات + فوتو سيشن + الحفل حتى الساعة 11..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>

            {bookingMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  bookingMsg.ok ? 'bg-[#F3ECF9] text-[#5B3278]' : 'bg-[#FDF1F2] text-[#9A2D3C]'
                }`}
              >
                {bookingMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={bookingLoading || availability === 'reserved'}
              className="w-full py-3.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>{bookingLoading ? 'جاري الإرسال...' : 'إرسال طلب حجز المصور'}</span>
            </button>
          </form>
        </aside>
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-[#24172E]/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="max-w-3xl w-full bg-white rounded-3xl overflow-hidden p-2">
            <img src={lightboxImg} alt="معاينة الصورة" className="w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};
