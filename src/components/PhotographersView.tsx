import { ContactRow } from './ContactRow';
import { ShareLink } from './ShareLink';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Heart,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Star,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type {
  CustomerRequestRecord,
  FavoriteRecord,
  PhotographerRecord,
  UserProfile,
  UserRole,
} from '../types/velora';
import { apiFetch, uploadImageFile } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { EGYPT_GOVERNORATES, formatEgp, getAllEgyptGovernoratesWithExtras, matchesGovernorateStrict } from '../utils/veloraLogic';
import { motion } from 'motion/react';
import { CinematicTabPanel, VELORA_EASE } from './CinematicMotion';

interface PhotographersViewProps {
  photographers: PhotographerRecord[];
  requests: CustomerRequestRecord[];
  favorites: FavoriteRecord[];
  user: UserProfile | null;
  onSelectPhotographer: (id: string) => void;
  onToggleFavorite: (targetType: 'photographer', targetId: string) => void;
  onRequestCreated: (req: CustomerRequestRecord) => void;
  onPhotographerCreated: () => void;
  onRequireAuth: (role?: UserRole) => void;
}

export const PhotographersView: React.FC<PhotographersViewProps> = ({
  photographers,
  requests,
  favorites,
  user,
  onSelectPhotographer,
  onToggleFavorite,
  onRequestCreated,
  onPhotographerCreated,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'offers' | 'requests'>('offers');
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'experience_desc'>('rating');
  const [checkDate, setCheckDate] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [reservedIds, setReservedIds] = useState<string[]>([]);

  // Add Photographer Modal state (button resides strictly in top header toolbar, never in cards)
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [showRolePrompt, setShowRolePrompt] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [specialtyAr, setSpecialtyAr] = useState('تصوير أفراح سينمائي وفوتوغرافي');
  const [photoCity, setPhotoCity] = useState('القاهرة');
  const [studioLocation, setStudioLocation] = useState('الزمالك');
  const [yearsExperience, setYearsExperience] = useState('6');
  const [startingPrice, setStartingPrice] = useState('14000');
  const [equipmentAr, setEquipmentAr] = useState('Sony A7 IV · عدسات G-Master · إضاءة سينمائية');
  const [bioAr, setBioAr] = useState('');
  const [photogPubPhone, setphotogPubPhone] = useState('');
  const [coverImage, setCoverImage] = useState(
    '/src/assets/images/velora_photographer_couple_1795424759634.jpg'
  );
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState('');

  // Request Form inside Requests tab ONLY
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqCity, setReqCity] = useState('القاهرة');
  const [reqBudget, setReqBudget] = useState('15000');
  const [reqType, setReqType] = useState('فوتو سيشن + فيديو 4K');
  const [reqNotes, setReqNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!checkDate) {
      setReservedIds([]);
      return;
    }
    let cancelled = false;
    apiFetch<{ reservedPhotographerIds: string[] }>(`/api/availability?date=${encodeURIComponent(checkDate)}`)
      .then((res) => {
        if (!cancelled) setReservedIds(res.reservedPhotographerIds || []);
      })
      .catch(() => {
        if (!cancelled) setReservedIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [checkDate]);

  const availableCities = useMemo(
    () => getAllEgyptGovernoratesWithExtras(photographers.map((p) => p.city).filter(Boolean)),
    [photographers]
  );

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    photographers.forEach((p) => p.shootingTypes.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [photographers]);

  const filtered = useMemo(() => {
    const list = photographers.filter((p) => {
      if (selectedCity && !matchesGovernorateStrict(p.city, p.studioLocation, selectedCity)) return false;
      if (selectedType && !p.shootingTypes.includes(selectedType)) return false;
      if (maxPrice && Number(maxPrice) > 0 && p.startingPrice > Number(maxPrice)) return false;
      if (checkDate && onlyAvailable && reservedIds.includes(p.id)) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !p.displayName.toLowerCase().includes(q) &&
          !p.city.toLowerCase().includes(q) &&
          !p.specialtyAr.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.startingPrice - b.startingPrice;
      if (sortBy === 'experience_desc') return b.yearsExperience - a.yearsExperience;
      return b.avgRating - a.avgRating;
    });
  }, [photographers, selectedCity, selectedType, maxPrice, checkDate, onlyAvailable, reservedIds, query, sortBy]);

  const handleOpenAddPhotographer = () => {
    if (!user || !['photographer', 'admin'].includes(user.role)) {
      setShowRolePrompt(true);
      return;
    }
    setPhotoFeedback('');
    setShowAddPhotoModal(true);
  };

  const handleCreatePhotographer = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoSaving(true);
    setPhotoFeedback('');
    try {
      await apiFetch('/api/photographers', {
        method: 'POST',
        body: JSON.stringify({
          displayName,
          specialtyAr,
          city: photoCity,
          studioLocation: studioLocation || photoCity,
          yearsExperience: Number(yearsExperience) || 5,
          startingPrice: Number(startingPrice) || 12000,
          equipmentAr,
          bioAr,
          contactPhone: photogPubPhone.trim(),
          coverImage,
          avatarUrl: coverImage,
          albumPhotos: [coverImage],
        }),
      });
      setDisplayName('');
      setBioAr('');
      setphotogPubPhone('');
      setShowAddPhotoModal(false);
      setPhotoFeedback(
        user?.role === 'admin'
          ? 'تمت إضافة المصور ونشر ملفه مباشرة.'
          : 'تم إرسال ملف المصور والألبوم بنجاح وهو الآن «قيد المراجعة» لحين اعتماد الإدارة.'
      );
      onPhotographerCreated();
    } catch (err) {
      setPhotoFeedback(err instanceof Error ? err.message : 'تعذر إضافة المصور.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth('client');
      return;
    }
    setSubmitting(true);
    setMsg('');
    try {
      const res = await apiFetch<{ request: CustomerRequestRecord }>('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          requestSection: 'photographer',
          titleAr: reqTitle,
          eventDate: reqDate,
          city: reqCity,
          area: reqCity,
          guestsCount: 150,
          budgetEgp: Number(reqBudget) || 12000,
          preferredType: reqType,
          requestedServices: ['تغطية الحفل', 'تعديل الصور'],
          notesAr: reqNotes,
        }),
      });
      onRequestCreated(res.request);
      setShowRequestForm(false);
      setReqTitle('');
      setReqDate('');
      setReqNotes('');
      setMsg('تمت إضافة طلب التصوير بنجاح.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'تعذر نشر الطلب.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-7">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E8DCF3] pb-5">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278]">
            <Camera className="w-4 h-4" />
            <span>قسم المصورين</span>
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#24172E]">
            مصورون وفنانو توثيق الزفاف
          </h1>
          <p className="text-sm text-[#5E4D6B]">
            اكتشف عروض المصورين وألبوماتهم الاحترافية أو استعرض طلبات التصوير في التبويب المخصص
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddPhotographer}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مصور</span>
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
                  layoutId="photographers-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">عروض المصورين ({photographers.length})</span>
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
                  layoutId="photographers-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">طلبات العملاء ({requests.length})</span>
            </button>
          </div>
        </div>
      </div>

      {photoFeedback && !showAddPhotoModal && (
        <div className="p-4 rounded-2xl bg-[#F3ECF9] border border-[#5B3278]/25 text-xs font-bold text-[#5B3278]">
          {photoFeedback}
        </div>
      )}

      <CinematicTabPanel tabKey={activeTab}>
      {activeTab === 'offers' ? (
        <div className="space-y-6">
          {/* Search & Availability Filter ONLY — Zero client request buttons mixed here */}
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
                  نوع التغطية
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold"
                >
                  <option value="">كل التخصصات</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1.5">
                  بحث بالاسم
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8C799B] absolute right-3 top-3" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="كريم، سينمائي..."
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1.5">
                  السعر الأقصى (ج.م)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="مثال: 20000"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5B3278] mb-1.5">
                  توفر التاريخ
                </label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#C9B0E3] bg-white text-xs"
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
                  <option value="experience_desc">الأكثر خبرة</option>
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
                {(selectedCity || selectedType || query || maxPrice || checkDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity('');
                      setSelectedType('');
                      setQuery('');
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
                {filtered.length} مصور مطابق
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, idx) => {
              const isFav = favorites.some(
                (f) => f.targetType === 'photographer' && f.targetId === p.id
              );
              const isReserved = checkDate ? reservedIds.includes(p.id) : false;

              return (
                <motion.article
                  key={p.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.36, delay: Math.min(idx * 0.045, 0.25), ease: VELORA_EASE }}
                  className="group velora-card rounded-2xl overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-lg hover:shadow-[#5B3278]/10"
                >
                  <div>
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={resolveMediaUrl(p.coverImage)}
                        alt={p.displayName}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                      <button
                        type="button"
                        onClick={() => onToggleFavorite('photographer', p.id)}
                        className={`absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          isFav
                            ? 'bg-[#5B3278] text-white'
                            : 'bg-white/90 text-[#5B3278]'
                        }`}
                        aria-label="إضافة للمفضلة"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {checkDate && (
                        <span
                          className={`absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isReserved
                              ? 'bg-[#9A2D3C] text-white'
                              : 'bg-white text-[#5B3278] border border-[#5B3278]'
                          }`}
                        >
                          {isReserved ? (
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
                          {p.city} · {p.yearsExperience} سنوات خبرة
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-[#5B3278]">
                          <Star className="w-3.5 h-3.5 fill-[#C5A25D] text-[#C5A25D]" />
                          {p.avgRating}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[#24172E]">{p.displayName}</h2>
                      <p className="text-xs text-[#5E4D6B]">{p.specialtyAr}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {p.shootingTypes.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded bg-[#FAF7FD] border border-[#E8DCF3] text-[11px] text-[#5E4D6B]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4 border-t border-[#F0E7F8] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#7A6A88] block">الباقات تبدأ من</span>
                      <span className="text-sm font-bold text-[#5B3278] tabular-nums">
                        {formatEgp(p.startingPrice)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectPhotographer(p.id)}
                      className="px-4 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-semibold transition-colors"
                    >
                      الألبومات والحجز
                    </button>
                  </div>
                  {(p as { isDemo?: boolean }).isDemo && (
                    <span className="mx-5 mb-2 inline-block rounded-full bg-[#F3ECF9] px-2.5 py-1 text-[11px] font-bold text-[#5B3278]">نموذج تجريبي</span>
                  )}
                  <ShareLink path={`/photographers/${p.id}`} title={p.displayName} className="px-5 pb-3" />
                  <ContactRow phone={p.contactPhone} subject={p.displayName} className="px-5 pb-4" />
                </motion.article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="velora-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F3ECF9]/60">
            <div>
              <h2 className="text-lg font-bold text-[#24172E]">طلبات العملاء للتصوير الفوتوغرافي والسينمائي</h2>
              <p className="text-xs text-[#5E4D6B]">
                قسم مخصص لطلبات العملاء الباحثين عن مصور بتاريخ وميزانية محددة.
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-semibold shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>أضف طلب تصوير</span>
            </button>
          </div>

          {msg && (
            <div className="p-3.5 rounded-xl bg-[#F3ECF9] border border-[#5B3278]/25 text-xs font-semibold text-[#5B3278]">
              {msg}
            </div>
          )}

          {showRequestForm && (
            <form onSubmit={handleSubmitRequest} className="velora-card rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#24172E]">تفاصيل طلب التصوير</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">عنوان الطلب</label>
                  <input
                    required
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="مثال: مطلوب مصور وفيديو لحفل زفاف بالزمالك"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">التاريخ</label>
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
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">نوع التصوير المطلوب</label>
                  <input
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الميزانية (ج.م)</label>
                  <input
                    type="number"
                    value={reqBudget}
                    onChange={(e) => setReqBudget(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">ملاحظات</label>
                  <textarea
                    rows={2}
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DCF3] text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-semibold"
                >
                  {submitting ? 'جاري النشر...' : 'نشر الطلب'}
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
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-xs font-bold">
                    طلب تصوير · {req.preferredType}
                  </span>
                  <span className="text-xs text-[#6B5A78] tabular-nums">{req.eventDate}</span>
                </div>
                <h3 className="text-base font-bold text-[#24172E]">{req.titleAr}</h3>
                <p className="text-xs text-[#5E4D6B]">{req.notesAr}</p>
                <div className="pt-2 border-t border-[#F0E7F8] flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#24172E]">{req.city}</span>
                  <span className="font-bold text-[#5B3278] tabular-nums">
                    الميزانية: {formatEgp(req.budgetEgp)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      </CinematicTabPanel>

      {/* Add Photographer Modal */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 bg-[#24172E]/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreatePhotographer}
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-[#E8DCF3]"
          >
            <div className="flex items-center justify-between border-b border-[#F0E7F8] pb-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#24172E]">إضافة ملف مصور جديد</h2>
                <p className="text-xs text-[#6B5A78]">
                  {user?.role === 'admin'
                    ? 'يُنشر ملف المصور مباشرة بصلاحية الإدارة'
                    : 'يُرسل الملف للاعتماد الإداري قبل ظهوره للعملاء'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPhotoModal(false)}
                className="w-9 h-9 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5B3278]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">اسم المصور أو الاستوديو</label>
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: سيف الدين للتصوير السينمائي"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">التخصص</label>
                <input
                  value={specialtyAr}
                  onChange={(e) => setSpecialtyAr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المحافظة</label>
                <select
                  required
                  value={photoCity}
                  onChange={(e) => setPhotoCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm font-semibold"
                >
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">موقع الاستوديو</label>
                <input
                  value={studioLocation}
                  onChange={(e) => setStudioLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">سنوات الخبرة</label>
                <input
                  type="number"
                  min={1}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الباقات تبدأ من (ج.م)</label>
                <input
                  required
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المعدات المستخدمة</label>
                <input
                  value={equipmentAr}
                  onChange={(e) => setEquipmentAr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">نبذة عن أسلوب التصوير</label>
                <textarea
                  required
                  rows={2}
                  value={bioAr}
                  onChange={(e) => setBioAr(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن خبرتك وتغطية حفلات الزفاف..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">رقم للتواصل العام (اختياري)</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={photogPubPhone}
                  onChange={(e) => setphotogPubPhone(e.target.value)}
                  placeholder="اتركه فارغًا إن لم ترغب في إظهار رقمك"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
                <p className="mt-1 text-[11px] text-[#6B5A78]">إذا أضفت رقمًا سيظهر لكل زوار الموقع على إعلانك. لن نعرضه إلا بموافقتك هنا.</p>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoUploading ? 'جاري رفع الصورة...' : 'رفع صورة غلاف للألبوم'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (ev) => {
                      const f = ev.target.files?.[0];
                      if (!f) return;
                      setPhotoUploading(true);
                      try {
                        const url = await uploadImageFile(f);
                        setCoverImage(url);
                      } finally {
                        setPhotoUploading(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <img
                  src={resolveMediaUrl(coverImage)}
                  alt="معاينة المصور"
                  className="w-16 h-12 rounded-xl object-cover border border-[#E8DCF3]"
                />
              </div>
            </div>

            {photoFeedback && (
              <div className="p-3 rounded-xl bg-[#FDF1F2] text-xs font-semibold text-[#9A2D3C]">
                {photoFeedback}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPhotoModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E8DCF3] text-xs font-semibold text-[#5E4D6B]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={photoSaving || photoUploading}
                className="px-5 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold disabled:opacity-50"
              >
                {photoSaving ? 'جاري الإرسال...' : 'حفظ وإرسال الملف'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role Guidance Modal */}
      {showRolePrompt && (
        <div className="fixed inset-0 z-50 bg-[#24172E]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#E8DCF3]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#24172E]">انضم كمصور على VÉLORA</h2>
              <button
                type="button"
                onClick={() => setShowRolePrompt(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5B3278]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              لإضافة ملفك المهني وألبومات التصوير، يرجى تسجيل الدخول بحساب{' '}
              <strong className="text-[#5B3278]">مصور أفراح</strong> أو إنشاء حساب شريك الآن.
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
                  onRequireAuth('photographer');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold"
              >
                تسجيل حساب مصور
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
