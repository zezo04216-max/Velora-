import { ContactRow } from './ContactRow';
import { ShareLink } from './ShareLink';
import { TierBadge, tierFrameClass } from './TierFrame';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Heart,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Star,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type {
  CustomerRequestRecord,
  FavoriteRecord,
  UserProfile,
  UserRole,
  VenueRecord,
} from '../types/velora';
import { apiFetch, uploadImageFile } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { EGYPT_GOVERNORATES, formatEgp, getAllEgyptGovernoratesWithExtras, matchesGovernorateStrict } from '../utils/veloraLogic';
import { motion } from 'motion/react';
import { RequestReplies } from './RequestReplies';
import { CinematicTabPanel, VELORA_EASE } from './CinematicMotion';

interface VenuesViewProps {
  venues: VenueRecord[];
  requests: CustomerRequestRecord[];
  favorites: FavoriteRecord[];
  user: UserProfile | null;
  onSelectVenue: (id: string) => void;
  onToggleFavorite: (targetType: 'venue', targetId: string) => void;
  onRequestCreated: (req: CustomerRequestRecord) => void;
  onVenueCreated: () => void;
  onRequireAuth: (role?: UserRole) => void;
}

export const VenuesView: React.FC<VenuesViewProps> = ({
  venues,
  requests,
  favorites,
  user,
  onSelectVenue,
  onToggleFavorite,
  onRequestCreated,
  onVenueCreated,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'offers' | 'requests'>('offers');
  const [cityFilter, setCityFilter] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'capacity_desc'>('rating');
  const [checkDate, setCheckDate] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [reservedIds, setReservedIds] = useState<string[]>([]);

  // Add Venue Modal state
  const [showAddVenueModal, setShowAddVenueModal] = useState(false);
  const [showRolePrompt, setShowRolePrompt] = useState(false);
  const [venueTitle, setVenueTitle] = useState('');
  const [venueCity, setVenueCity] = useState('القاهرة');
  const [venueArea, setVenueArea] = useState('التجمع الخامس');
  const [venuePrice, setVenuePrice] = useState('55000');
  const [venueCapMin, setVenueCapMin] = useState('120');
  const [venueCapMax, setVenueCapMax] = useState('400');
  const [venueDesc, setVenueDesc] = useState('');
  const [venuePubPhone, setvenuePubPhone] = useState('');
  const [venueCover, setVenueCover] = useState(
    '/src/assets/images/velora_venue_palace_1795424759214.jpg'
  );
  const [venueUploading, setVenueUploading] = useState(false);
  const [venueSaving, setVenueSaving] = useState(false);
  const [venueFeedback, setVenueFeedback] = useState('');

  // Request Modal state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqCity, setReqCity] = useState('القاهرة');
  const [reqArea, setReqArea] = useState('');
  const [reqGuests, setReqGuests] = useState('200');
  const [reqBudget, setReqBudget] = useState('65000');
  const [reqType, setReqType] = useState('قاعة داخلية + حديقة');
  const [reqNotes, setReqNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  useEffect(() => {
    if (!checkDate) {
      setReservedIds([]);
      return;
    }
    let cancelled = false;
    apiFetch<{ reservedVenueIds: string[] }>(`/api/availability?date=${encodeURIComponent(checkDate)}`)
      .then((res) => {
        if (!cancelled) setReservedIds(res.reservedVenueIds || []);
      })
      .catch(() => {
        if (!cancelled) setReservedIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [checkDate]);

  const availableCities = useMemo(
    () => getAllEgyptGovernoratesWithExtras(venues.map((v) => v.city).filter(Boolean)),
    [venues]
  );

  const filteredVenues = useMemo(() => {
    const list = venues.filter((v) => {
      if (selectedCity && !matchesGovernorateStrict(v.city, v.area, selectedCity)) return false;
      if (cityFilter.trim()) {
        const q = cityFilter.trim().toLowerCase();
        if (
          !v.city.toLowerCase().includes(q) &&
          !v.area.toLowerCase().includes(q) &&
          !v.titleAr.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (minCapacity && Number(minCapacity) > 0 && v.capacityMax < Number(minCapacity)) {
        return false;
      }
      if (maxPrice && Number(maxPrice) > 0 && v.pricePerEvent > Number(maxPrice)) {
        return false;
      }
      if (checkDate && onlyAvailable && reservedIds.includes(v.id)) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.pricePerEvent - b.pricePerEvent;
      if (sortBy === 'capacity_desc') return b.capacityMax - a.capacityMax;
      return b.avgRating - a.avgRating;
    });
  }, [venues, selectedCity, cityFilter, minCapacity, maxPrice, checkDate, onlyAvailable, reservedIds, sortBy]);

  const handleOpenAddVenue = () => {
    if (!user || !['venue_owner', 'admin'].includes(user.role)) {
      setShowRolePrompt(true);
      return;
    }
    setVenueFeedback('');
    setShowAddVenueModal(true);
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setVenueSaving(true);
    setVenueFeedback('');
    try {
      await apiFetch('/api/venues', {
        method: 'POST',
        body: JSON.stringify({
          titleAr: venueTitle,
          city: venueCity,
          area: venueArea || venueCity,
          pricePerEvent: Number(venuePrice) || 45000,
          capacityMin: Number(venueCapMin) || 100,
          capacityMax: Number(venueCapMax) || 350,
          descriptionAr: venueDesc,
          contactPhone: venuePubPhone.trim(),
          coverImage: venueCover,
          galleryImages: [venueCover],
        }),
      });
      setVenueTitle('');
      setVenueDesc('');
      setvenuePubPhone('');
      setShowAddVenueModal(false);
      setVenueFeedback(
        user?.role === 'admin'
          ? 'تمت إضافة القاعة ونشرها مباشرة للعملاء.'
          : 'تم استلام القاعة بنجاح! حالتها الآن «قيد المراجعة» وستظهر للجميع فور موافقة الإدارة.'
      );
      onVenueCreated();
    } catch (err) {
      setVenueFeedback(err instanceof Error ? err.message : 'تعذر إضافة القاعة.');
    } finally {
      setVenueSaving(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth('client');
      return;
    }
    setSubmitting(true);
    setFormMsg('');
    try {
      const res = await apiFetch<{ request: CustomerRequestRecord }>('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          requestSection: 'venue',
          titleAr: reqTitle,
          eventDate: reqDate,
          city: reqCity,
          area: reqArea || reqCity,
          guestsCount: Number(reqGuests) || 150,
          budgetEgp: Number(reqBudget) || 50000,
          preferredType: reqType,
          requestedServices: ['تجهيز القاعة', 'بوفيه وضيافة'],
          notesAr: reqNotes,
        }),
      });
      onRequestCreated(res.request);
      setShowRequestForm(false);
      setReqTitle('');
      setReqDate('');
      setReqNotes('');
      setFormMsg('تم نشر طلبك بنجاح في قسم طلبات القاعات.');
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'تعذر إرسال الطلب.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-7">
      {/* Header & Strict Tab Separation + Add Venue Action */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E8DCF3] pb-5">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278]">
            <Building2 className="w-4 h-4" />
            <span>قسم القاعات</span>
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#24172E]">
            قاعات الأفراح والاحتفالات
          </h1>
          <p className="text-sm text-[#5E4D6B]">
            تصفح عروض القاعات المعتمدة أو استعرض طلبات العملاء المنفصلة تمامًا
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddVenue}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قاعة</span>
          </button>

          <div className="inline-flex p-1 rounded-xl bg-[#F3ECF9] border border-[#E8DCF3]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'offers'}
              onClick={() => setActiveTab('offers')}
              className={`relative px-5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'offers'
                  ? 'text-white'
                  : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              {activeTab === 'offers' && (
                <motion.span
                  layoutId="venues-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">العروض ({venues.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'requests'}
              onClick={() => setActiveTab('requests')}
              className={`relative px-5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'requests'
                  ? 'text-white'
                  : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              {activeTab === 'requests' && (
                <motion.span
                  layoutId="venues-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">الطلبات ({requests.length})</span>
            </button>
          </div>
        </div>
      </div>

      {venueFeedback && !showAddVenueModal && (
        <div className="p-4 rounded-2xl bg-[#F3ECF9] border border-[#5B3278]/25 text-xs font-bold text-[#5B3278]">
          {venueFeedback}
        </div>
      )}

      <CinematicTabPanel tabKey={activeTab}>
      {activeTab === 'offers' ? (
        <div className="space-y-6">
          {/* Smart Filters + Date Availability Checker */}
          <div className="velora-card rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1.5">
                  المدينة
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold"
                >
                  <option value="">كل المدن</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1.5">
                  بحث بالاسم أو المنطقة
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8C799B] absolute right-3 top-3" />
                  <input
                    type="text"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    placeholder="الزمالك، التجمع..."
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs focus:outline-none focus:border-[#5B3278]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1.5">
                  أقل سعة ضيوف
                </label>
                <input
                  type="number"
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  placeholder="مثال: 200"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs focus:outline-none focus:border-[#5B3278]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1.5">
                  السعر الأقصى (ج.م)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="مثال: 80000"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs focus:outline-none focus:border-[#5B3278]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5B3278] mb-1.5">
                  فحص التوفر بتاريخ الفرح
                </label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#C9B0E3] bg-white text-xs focus:outline-none focus:border-[#5B3278]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1.5">
                  ترتيب حسب
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold"
                >
                  <option value="rating">الأعلى تقييمًا</option>
                  <option value="price_asc">الأقل سعرًا</option>
                  <option value="capacity_desc">الأكبر سعة</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F0E7F8]">
              <div className="flex flex-wrap items-center gap-3">
                {checkDate && (
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      className="rounded border-[#C9B0E3] text-[#5B3278]"
                    />
                    <span>متاح فقط في هذا التاريخ</span>
                  </label>
                )}
                {(selectedCity || cityFilter || minCapacity || maxPrice || checkDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity('');
                      setCityFilter('');
                      setMinCapacity('');
                      setMaxPrice('');
                      setCheckDate('');
                      setOnlyAvailable(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B3278] hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>مسح الفلاتر</span>
                  </button>
                )}
              </div>
              <span className="text-xs text-[#6B5A78] font-medium">
                {filteredVenues.length} قاعة مطابقة
              </span>
            </div>
          </div>

          {/* Venues Offers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue, idx) => {
              const isFav = favorites.some(
                (f) => f.targetType === 'venue' && f.targetId === venue.id
              );
              const isReservedOnDate = checkDate ? reservedIds.includes(venue.id) : false;

              return (
                <motion.article
                  key={venue.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.36, delay: Math.min(idx * 0.045, 0.25), ease: VELORA_EASE }}
                  className={`group velora-card rounded-2xl overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-lg hover:shadow-[#5B3278]/10 ${tierFrameClass(venue.membershipTier)}`}
                >
                  <div>
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={resolveMediaUrl(venue.coverImage)}
                        alt={venue.titleAr}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                      <button
                        type="button"
                        onClick={() => onToggleFavorite('venue', venue.id)}
                        className={`absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                          isFav
                            ? 'bg-[#5B3278] text-white'
                            : 'bg-white/90 text-[#5B3278] hover:bg-white'
                        }`}
                        aria-label="إضافة للمفضلة"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {checkDate && (
                        <span
                          className={`absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs ${
                            isReservedOnDate
                              ? 'bg-[#9A2D3C] text-white'
                              : 'bg-[#FFFFFF] text-[#5B3278] border border-[#5B3278]'
                          }`}
                        >
                          {isReservedOnDate ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>محجوز في هذا التاريخ</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>متاح في هذا التاريخ</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-[#6B5A78]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#5B3278]" />
                          {venue.city} · {venue.area}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-[#5B3278]">
                          <Star className="w-3.5 h-3.5 fill-[#C5A25D] text-[#C5A25D]" />
                          {venue.avgRating} ({venue.reviewsCount})
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[#24172E]">{venue.titleAr}</h2>
                      <p className="text-xs text-[#5E4D6B] line-clamp-2">{venue.descriptionAr}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FAF7FD] border border-[#E8DCF3] text-[11px] text-[#5E4D6B]">
                          <Users className="w-3 h-3 text-[#5B3278]" />
                          {venue.capacityMin} – {venue.capacityMax} ضيف
                        </span>
                        {venue.features.slice(0, 2).map((feat) => (
                          <span
                            key={feat}
                            className="px-2 py-0.5 rounded bg-[#FAF7FD] border border-[#E8DCF3] text-[11px] text-[#5E4D6B]"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4 border-t border-[#F0E7F8] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#7A6A88] block">السعر التقديري</span>
                      <span className="text-sm font-bold text-[#5B3278] tabular-nums">
                        {formatEgp(venue.pricePerEvent)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectVenue(venue.id)}
                      className="px-4 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-semibold transition-colors"
                    >
                      عرض القاعة والحجز
                    </button>
                  </div>
                  <TierBadge tier={venue.membershipTier} label={venue.membershipLabelAr} className="mx-5 mb-2" />
                  {(venue as { isDemo?: boolean }).isDemo && (
                    <span className="mx-5 mb-2 inline-block rounded-full bg-[#F3ECF9] px-2.5 py-1 text-[11px] font-bold text-[#5B3278]">نموذج تجريبي</span>
                  )}
                  <ShareLink path={`/venues/${venue.id}`} title={venue.titleAr} className="px-5 pb-3" />
                  <ContactRow phone={venue.contactPhone} subject={venue.titleAr} className="px-5 pb-4" />
                </motion.article>
              );
            })}
          </div>
        </div>
      ) : (
        /* Tab 2: Separated Customer Requests for Venues ONLY */
        <div className="space-y-6">
          <div className="velora-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F3ECF9]/60">
            <div>
              <h2 className="text-lg font-bold text-[#24172E]">طلبات العملاء لقاعات الأفراح</h2>
              <p className="text-xs text-[#5E4D6B]">
                هذا القسم مخصص لطلبات العملاء الباحثين عن قاعة بمواصفات وميزانية محددة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  onRequireAuth();
                  return;
                }
                setShowRequestForm((p) => !p);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-semibold shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>أضف طلب قاعة جديد</span>
            </button>
          </div>

          {formMsg && (
            <div className="p-3.5 rounded-xl bg-[#F3ECF9] border border-[#5B3278]/25 text-xs font-semibold text-[#5B3278]">
              {formMsg}
            </div>
          )}

          {showRequestForm && (
            <form onSubmit={handleSubmitRequest} className="velora-card rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#24172E]">تفاصيل طلب القاعة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">عنوان الطلب</label>
                  <input
                    required
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="مثال: مطلوب قاعة زفاف مفتوحة لـ 250 فرد بالتجمع الخامس"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">تاريخ الفرح</label>
                  <input
                    required
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المحافظة</label>
                  <select
                    required
                    value={reqCity}
                    onChange={(e) => setReqCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm font-semibold"
                  >
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">عدد الضيوف المتوقع</label>
                  <input
                    type="number"
                    value={reqGuests}
                    onChange={(e) => setReqGuests(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الميزانية التقريبية (ج.م)</label>
                  <input
                    type="number"
                    value={reqBudget}
                    onChange={(e) => setReqBudget(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">نوع القاعة المفضل</label>
                  <input
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المنطقة</label>
                  <input
                    value={reqArea}
                    onChange={(e) => setReqArea(e.target.value)}
                    placeholder="الزمالك / المعادي / الشيخ زايد"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">ملاحظات إضافية</label>
                  <textarea
                    rows={2}
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    placeholder="أضف تفاصيل الخدمات المطلوبة..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DCF3] text-xs font-semibold text-[#5E4D6B]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'جاري النشر...' : 'نشر طلب القاعة'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {requests.map((req, idx) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.32, delay: Math.min(idx * 0.04, 0.2), ease: VELORA_EASE }}
                className="velora-card rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-xs font-bold">
                    طلب قاعة · {req.preferredType || 'عام'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-[#6B5A78] tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-[#5B3278]" />
                    {req.eventDate}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#24172E]">{req.titleAr}</h3>
                <p className="text-xs text-[#5E4D6B] leading-relaxed">{req.notesAr}</p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F0E7F8] text-xs">
                  <div>
                    <span className="text-[#8C799B] block">المنطقة</span>
                    <span className="font-semibold text-[#24172E]">{req.city}</span>
                  </div>
                  <div>
                    <span className="text-[#8C799B] block">الضيوف</span>
                    <span className="font-semibold text-[#24172E] tabular-nums">{req.guestsCount}</span>
                  </div>
                  <div>
                    <span className="text-[#8C799B] block">الميزانية</span>
                    <span className="font-semibold text-[#5B3278] tabular-nums">{formatEgp(req.budgetEgp)}</span>
                  </div>
                </div>
              <RequestReplies request={req} user={user} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      </CinematicTabPanel>

      {/* Add Venue Modal for Venue Owners & Admins */}
      {showAddVenueModal && (
        <div className="fixed inset-0 z-50 bg-[#24172E]/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateVenue}
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-[#E8DCF3]"
          >
            <div className="flex items-center justify-between border-b border-[#F0E7F8] pb-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#24172E]">إضافة قاعة جديدة</h2>
                <p className="text-xs text-[#6B5A78]">
                  {user?.role === 'admin'
                    ? 'تُنشر القاعة مباشرة بصلاحية الإدارة'
                    : 'تُرسل القاعة للاعتماد الإداري قبل ظهورها للعملاء'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVenueModal(false)}
                className="w-9 h-9 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5B3278]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">اسم القاعة</label>
                <input
                  required
                  value={venueTitle}
                  onChange={(e) => setVenueTitle(e.target.value)}
                  placeholder="مثال: قاعة اللؤلؤة الملكية"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المحافظة</label>
                <select
                  required
                  value={venueCity}
                  onChange={(e) => setVenueCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm font-semibold"
                >
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المنطقة</label>
                <input
                  value={venueArea}
                  onChange={(e) => setVenueArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">السعر للحفل (ج.م)</label>
                <input
                  required
                  type="number"
                  value={venuePrice}
                  onChange={(e) => setVenuePrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">أقل سعة</label>
                  <input
                    type="number"
                    value={venueCapMin}
                    onChange={(e) => setVenueCapMin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">أقصى سعة</label>
                  <input
                    type="number"
                    value={venueCapMax}
                    onChange={(e) => setVenueCapMax(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">وصف القاعة والمميزات</label>
                <textarea
                  required
                  rows={3}
                  value={venueDesc}
                  onChange={(e) => setVenueDesc(e.target.value)}
                  placeholder="اكتب مواصفات القاعة، الجناح الخاص، نظام الإضاءة والضيافة..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">رقم للتواصل العام (اختياري)</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={venuePubPhone}
                  onChange={(e) => setvenuePubPhone(e.target.value)}
                  placeholder="اتركه فارغًا إن لم ترغب في إظهار رقمك"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
                <p className="mt-1 text-[11px] text-[#6B5A78]">إذا أضفت رقمًا سيظهر لكل زوار الموقع على إعلانك. لن نعرضه إلا بموافقتك هنا.</p>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{venueUploading ? 'جاري رفع الصورة...' : 'رفع صورة للقاعة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (ev) => {
                      const f = ev.target.files?.[0];
                      if (!f) return;
                      setVenueUploading(true);
                      try {
                        const url = await uploadImageFile(f);
                        setVenueCover(url);
                      } finally {
                        setVenueUploading(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <img
                  src={resolveMediaUrl(venueCover)}
                  alt="معاينة القاعة"
                  className="w-16 h-12 rounded-xl object-cover border border-[#E8DCF3]"
                />
              </div>
            </div>

            {venueFeedback && (
              <div className="p-3 rounded-xl bg-[#FDF1F2] text-xs font-semibold text-[#9A2D3C]">
                {venueFeedback}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddVenueModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E8DCF3] text-xs font-semibold text-[#5E4D6B]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={venueSaving || venueUploading}
                className="px-5 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold disabled:opacity-50"
              >
                {venueSaving ? 'جاري الإرسال...' : 'حفظ وإرسال القاعة'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role Guidance Prompt when Visitor / Client clicks Add Venue */}
      {showRolePrompt && (
        <div className="fixed inset-0 z-50 bg-[#24172E]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#E8DCF3]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#24172E]">إضافة قاعة على VÉLORA</h2>
              <button
                type="button"
                onClick={() => setShowRolePrompt(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5B3278]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              لإضافة قاعة أفراح وعرضها أمام آلاف العرسان واستقبال طلبات الحجز، يرجى تسجيل الدخول بحساب{' '}
              <strong className="text-[#5B3278]">صاحب قاعة أفراح</strong> أو إنشاء حساب شريك الآن مجانًا.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRolePrompt(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E8DCF3] text-xs font-semibold"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRolePrompt(false);
                  onRequireAuth('venue_owner');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold"
              >
                تسجيل حساب صاحب قاعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
