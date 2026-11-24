import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Star,
  Users,
  XCircle,
} from 'lucide-react';
import type { ReviewRecord, UserProfile, VenueRecord } from '../types/velora';
import { apiFetch } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { formatEgp } from '../utils/veloraLogic';

interface VenueDetailViewProps {
  venueId: string;
  user: UserProfile | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
  onBooked: () => void;
  onRequireAuth: () => void;
}

export const VenueDetailView: React.FC<VenueDetailViewProps> = ({
  venueId,
  user,
  isFavorite,
  onToggleFavorite,
  onBack,
  onBooked,
  onRequireAuth,
}) => {
  const [venue, setVenue] = useState<VenueRecord | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [activePhoto, setActivePhoto] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Availability + Booking
  const [eventDate, setEventDate] = useState('');
  const [availability, setAvailability] = useState<'idle' | 'available' | 'reserved'>('idle');
  const [guestsCount, setGuestsCount] = useState('200');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Review submission
  const [rating, setRating] = useState(5);
  const [commentAr, setCommentAr] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<{ venue: VenueRecord; reviews: ReviewRecord[] }>(`/api/venues/${venueId}`)
      .then((res) => {
        if (!cancelled) {
          setVenue(res.venue);
          setReviews(res.reviews || []);
          setActivePhoto(res.venue.coverImage);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  useEffect(() => {
    if (!eventDate || !venue) {
      setAvailability('idle');
      return;
    }
    let cancelled = false;
    apiFetch<{ specificAvailable: boolean }>(
      `/api/availability?date=${encodeURIComponent(eventDate)}&targetType=venue&targetId=${encodeURIComponent(venue.id)}`
    )
      .then((res) => {
        if (!cancelled) {
          setAvailability(res.specificAvailable ? 'available' : 'reserved');
        }
      })
      .catch(() => {
        if (!cancelled) setAvailability('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [eventDate, venue]);

  if (loading || !venue) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-[#5E4D6B]">
        جاري تحميل تفاصيل القاعة...
      </div>
    );
  }

  const gallery = venue.galleryImages.length > 0 ? venue.galleryImages : [venue.coverImage];
  const discountedPrice = Math.round(venue.pricePerEvent * (1 - venue.discountPercent / 100));

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setBookingLoading(true);
    setBookingFeedback(null);
    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'venue',
          targetId: venue.id,
          eventDate,
          guestsCount: Number(guestsCount) || venue.capacityMin,
          notes,
        }),
      });
      setBookingFeedback({
        ok: true,
        text: 'تم إرسال طلب الحجز بنجاح! يصبح الحجز مؤكدًا بعد موافقة القاعة واعتماد إدارة VÉLORA.',
      });
      onBooked();
    } catch (err) {
      setBookingFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'تعذر إرسال طلب الحجز.',
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
          targetType: 'venue',
          targetId: venue.id,
          rating,
          commentAr,
        }),
      });
      setCommentAr('');
      setReviewMsg('شكرًا لتقييمك! تم إرسال التقييم للمراجعة الإدارية وسيُنشر فور اعتماده.');
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
        <span>العودة إلى القاعات</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Gallery & Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="velora-card rounded-3xl overflow-hidden">
            <img
              src={resolveMediaUrl(activePhoto || venue.coverImage)}
              alt={venue.titleAr}
              className="w-full h-[300px] sm:h-[420px] object-cover"
            />
            {gallery.length > 1 && (
              <div className="p-3 flex gap-2.5 overflow-x-auto bg-[#FAF7FD]">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhoto(img)}
                    className={`w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 ${
                      activePhoto === img ? 'border-[#5B3278]' : 'border-transparent'
                    }`}
                  >
                    <img src={resolveMediaUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="velora-card rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[#5B3278]">
                  {venue.city} · {venue.area}
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E] mt-1">
                  {venue.titleAr}
                </h1>
                <p className="text-sm text-[#5E4D6B] mt-1">{venue.subtitleAr}</p>
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
                <span>{isFavorite ? 'في المفضلة' : 'حفظ بالمفضلة'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F0E7F8] text-xs">
              <div className="p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5B3278]" />
                <div>
                  <span className="text-[#7C678D] block">السعة</span>
                  <span className="font-bold text-[#24172E]">{venue.capacityMin} - {venue.capacityMax} ضيف</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#5B3278]" />
                <div>
                  <span className="text-[#7C678D] block">مواعيد العمل</span>
                  <span className="font-bold text-[#24172E]">{venue.workingHours}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] flex items-center gap-2">
                <Star className="w-4 h-4 fill-[#C5A25D] text-[#C5A25D]" />
                <div>
                  <span className="text-[#7C678D] block">التقييم العام</span>
                  <span className="font-bold text-[#24172E]">{venue.avgRating} / 5 ({venue.reviewsCount} تقييم)</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#24172E]">عن القاعة</h2>
              <p className="text-sm text-[#5E4D6B] leading-relaxed">{venue.descriptionAr}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#24172E] mb-2">المزايا والخدمات المتوفرة</h3>
                <ul className="space-y-1.5">
                  {venue.features.map((f) => (
                    <li key={f} className="text-xs text-[#5E4D6B] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5B3278] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#24172E] mb-2">أنماط الديكور المتاحة</h3>
                <div className="flex flex-wrap gap-1.5">
                  {venue.decorStyles.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-xs font-medium"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <a
                    href={venue.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278] underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>فتح موقع القاعة على الخريطة ({venue.address})</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="velora-card rounded-3xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#24172E]">تقييمات العملاء المعتمدة ({reviews.length})</h2>
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#24172E]">{rev.authorName}</span>
                    <span className="text-xs font-semibold text-[#5B3278]">
                      {'★'.repeat(rev.rating)}
                    </span>
                  </div>
                  <p className="text-xs text-[#5E4D6B] leading-relaxed">{rev.commentAr}</p>
                </div>
              ))}
              {reviews.length === 0 && (
                <p className="text-xs text-[#7A6A88]">لا توجد تقييمات منشورة بعد لهذه القاعة.</p>
              )}
            </div>

            <form onSubmit={handleSubmitReview} className="pt-4 border-t border-[#F0E7F8] space-y-3">
              <h3 className="text-sm font-bold text-[#24172E]">أضف تقييمك للقاعة</h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      rating >= num
                        ? 'bg-[#5B3278] text-white border-[#5B3278]'
                        : 'bg-white text-[#6B5A78] border-[#E8DCF3]'
                    }`}
                  >
                    {num} ★
                  </button>
                ))}
              </div>
              <textarea
                required
                rows={2}
                value={commentAr}
                onChange={(e) => setCommentAr(e.target.value)}
                placeholder="اكتب رأيك حول القاعة والخدمة..."
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
              {reviewMsg && <p className="text-xs font-semibold text-[#5B3278]">{reviewMsg}</p>}
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#F3ECF9] hover:bg-[#5B3278] text-[#5B3278] hover:text-white text-xs font-semibold transition-colors"
              >
                إرسال التقييم للمراجعة
              </button>
            </form>
          </div>
        </div>

        {/* Right Smart Booking Panel */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 velora-card rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#F0E7F8] pb-4">
            <div>
              <span className="text-xs text-[#7A6A88] block">تكلفة الباقة</span>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-[#5B3278] tabular-nums">
                  {formatEgp(discountedPrice)}
                </span>
                {venue.discountPercent > 0 && (
                  <span className="text-xs text-[#8C799B] line-through tabular-nums">
                    {formatEgp(venue.pricePerEvent)}
                  </span>
                )}
              </div>
            </div>
            {venue.discountPercent > 0 && (
              <span className="px-3 py-1 rounded-full bg-[#F3ECF9] text-[#5B3278] text-xs font-bold">
                وفر {venue.discountPercent}%
              </span>
            )}
          </div>

          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#24172E] mb-1.5">
                اختر تاريخ الفرح المطلوب (فحص فوري)
              </label>
              <input
                required
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9B0E3] bg-[#FAF7FD] text-sm focus:outline-none focus:border-[#5B3278]"
              />
              {availability === 'available' && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>متاح في هذا التاريخ — يمكنك تقديم طلب الحجز الآن</span>
                </div>
              )}
              {availability === 'reserved' && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#FDF1F2] text-[#9A2D3C] text-xs font-semibold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>محجوز في هذا التاريخ — يرجى اختيار تاريخ آخر</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24172E] mb-1.5">
                عدد الضيوف المتوقع
              </label>
              <input
                type="number"
                min={venue.capacityMin}
                max={venue.capacityMax}
                value={guestsCount}
                onChange={(e) => setGuestsCount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24172E] mb-1.5">
                ملاحظات أو تجهيزات إضافية
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: نحتاج تنسيق كوشة بنفسجي وعشاء مفتوح..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>

            {bookingFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  bookingFeedback.ok
                    ? 'bg-[#F3ECF9] text-[#5B3278] border border-[#5B3278]/25'
                    : 'bg-[#FDF1F2] text-[#9A2D3C] border border-[#EAC1C7]'
                }`}
              >
                {bookingFeedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={bookingLoading || availability === 'reserved'}
              className="w-full py-3.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>{bookingLoading ? 'جاري إرسال الطلب...' : 'تقديم طلب حجز القاعة'}</span>
            </button>

            <p className="text-[11px] text-[#7A6A88] text-center leading-relaxed">
              تخضع كافة الحجوزات لنظام الاعتماد المزدوج (موافقة صاحب القاعة + اعتماد إدارة VÉLORA)
            </p>
          </form>
        </aside>
      </div>
    </div>
  );
};
