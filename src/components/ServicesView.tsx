import { ContactRow } from './ContactRow';
import { ShareLink } from './ShareLink';
import React, { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Heart,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react';
import type {
  CustomerRequestRecord,
  FavoriteRecord,
  ReviewRecord,
  ServiceCategoryKey,
  ServiceRecord,
  UserProfile,
  UserRole,
} from '../types/velora';
import { apiFetch, uploadImageFile } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import {
  EGYPT_GOVERNORATES,
  SERVICE_CATEGORIES,
  formatEgp,
  getAllEgyptGovernoratesWithExtras,
  matchesGovernorateStrict,
} from '../utils/veloraLogic';
import { motion } from 'motion/react';
import { CinematicTabPanel, VELORA_EASE } from './CinematicMotion';

interface ServicesViewProps {
  services: ServiceRecord[];
  requests: CustomerRequestRecord[];
  favorites: FavoriteRecord[];
  user: UserProfile | null;
  onToggleFavorite: (targetType: 'service', targetId: string) => void;
  onRequestCreated: (req: CustomerRequestRecord) => void;
  onServiceCreated: () => void;
  onBooked: () => void;
  onRequireAuth: (role?: UserRole) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  requests,
  favorites,
  user,
  onToggleFavorite,
  onRequestCreated,
  onServiceCreated,
  onBooked,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'offers' | 'requests'>('offers');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryKey | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'discount_desc'>('rating');

  // Add Service Modal state
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showRolePrompt, setShowRolePrompt] = useState(false);
  const [srvTitle, setSrvTitle] = useState('');
  const [srvCategory, setSrvCategory] = useState<ServiceCategoryKey>('kosha');
  const [srvCity, setSrvCity] = useState('القاهرة');
  const [srvArea, setSrvArea] = useState('المعادي');
  const [srvPrice, setSrvPrice] = useState('12000');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvPubPhone, setsrvPubPhone] = useState('');
  const [srvCover, setSrvCover] = useState(
    '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg'
  );
  const [srvUploading, setSrvUploading] = useState(false);
  const [srvSaving, setSrvSaving] = useState(false);
  const [srvFeedback, setSrvFeedback] = useState('');

  // Booking & Detail Modal
  const [activeService, setActiveService] = useState<ServiceRecord | null>(null);
  const [serviceReviews, setServiceReviews] = useState<ReviewRecord[]>([]);
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingFeedback, setBookingFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewStatusMsg, setReviewStatusMsg] = useState('');

  // Client Service Request Form
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState<ServiceCategoryKey>('kosha');
  const [reqDate, setReqDate] = useState('');
  const [reqCity, setReqCity] = useState('القاهرة');
  const [reqBudget, setReqBudget] = useState('18000');
  const [reqNotes, setReqNotes] = useState('');
  const [reqMsg, setReqMsg] = useState('');

  const availableCities = useMemo(
    () => getAllEgyptGovernoratesWithExtras(services.map((s) => s.city).filter(Boolean)),
    [services]
  );

  const filteredServices = useMemo(() => {
    const list = services.filter((s) => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (selectedCity && !matchesGovernorateStrict(s.city, s.area, selectedCity)) return false;
      if (maxPrice && Number(maxPrice) > 0 && s.startingPrice > Number(maxPrice)) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !`${s.titleAr} ${s.providerName} ${s.descriptionAr} ${s.city}`
            .toLowerCase()
            .includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.startingPrice - b.startingPrice;
      if (sortBy === 'discount_desc') return b.discountPercent - a.discountPercent;
      return b.avgRating - a.avgRating;
    });
  }, [services, selectedCategory, selectedCity, maxPrice, query, sortBy]);

  const handleOpenAddService = () => {
    if (!user || !['service_provider', 'admin'].includes(user.role)) {
      setShowRolePrompt(true);
      return;
    }
    setSrvFeedback('');
    setShowAddServiceModal(true);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSrvSaving(true);
    setSrvFeedback('');
    try {
      await apiFetch('/api/services', {
        method: 'POST',
        body: JSON.stringify({
          titleAr: srvTitle,
          category: srvCategory,
          city: srvCity,
          area: srvArea || srvCity,
          startingPrice: Number(srvPrice) || 8000,
          descriptionAr: srvDesc,
          contactPhone: srvPubPhone.trim(),
          coverImage: srvCover,
          galleryImages: [srvCover],
        }),
      });
      setSrvTitle('');
      setSrvDesc('');
      setsrvPubPhone('');
      setShowAddServiceModal(false);
      setSrvFeedback(
        user?.role === 'admin'
          ? 'تمت إضافة الخدمة ونشرها مباشرة للعملاء.'
          : 'تم استلام الخدمة بنجاح! حالتها الآن «قيد المراجعة» وستظهر للجميع فور اعتماد الإدارة.'
      );
      onServiceCreated();
    } catch (err) {
      setSrvFeedback(err instanceof Error ? err.message : 'تعذر إضافة الخدمة.');
    } finally {
      setSrvSaving(false);
    }
  };

  const openServiceModal = async (srv: ServiceRecord) => {
    setActiveService(srv);
    setBookingFeedback(null);
    setReviewStatusMsg('');
    try {
      const res = await apiFetch<{ reviews: ReviewRecord[] }>(
        `/api/reviews?targetType=service&targetId=${encodeURIComponent(srv.id)}`
      );
      setServiceReviews(res.reviews || []);
    } catch {
      setServiceReviews([]);
    }
  };

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService) return;
    if (!user) {
      onRequireAuth('client');
      return;
    }
    setBookingFeedback(null);
    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'service',
          targetId: activeService.id,
          eventDate,
          guestsCount: 150,
          notes,
        }),
      });
      setBookingFeedback({
        ok: true,
        text: 'تم إرسال طلب حجز الخدمة بنجاح بانتظار موافقة مقدم الخدمة والإدارة.',
      });
      onBooked();
    } catch (err) {
      setBookingFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'تعذر إرسال الطلب.',
      });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService) return;
    if (!user) {
      onRequireAuth('client');
      return;
    }
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'service',
          targetId: activeService.id,
          rating: reviewRating,
          commentAr: reviewText,
        }),
      });
      setReviewText('');
      setReviewStatusMsg('تم إرسال تقييمك للمراجعة الإدارية.');
    } catch (err) {
      setReviewStatusMsg(err instanceof Error ? err.message : 'تعذر إرسال التقييم.');
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth('client');
      return;
    }
    setReqMsg('');
    try {
      const catLabel =
        SERVICE_CATEGORIES.find((c) => c.key === reqCategory)?.labelAr || 'خدمة زفاف';
      const res = await apiFetch<{ request: CustomerRequestRecord }>('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          requestSection: 'service',
          serviceCategory: reqCategory,
          titleAr: reqTitle,
          eventDate: reqDate,
          city: reqCity,
          area: reqCity,
          guestsCount: 150,
          budgetEgp: Number(reqBudget) || 15000,
          preferredType: catLabel,
          requestedServices: [catLabel],
          notesAr: reqNotes,
        }),
      });
      onRequestCreated(res.request);
      setShowReqForm(false);
      setReqTitle('');
      setReqNotes('');
      setReqMsg('تمت إضافة طلب الخدمة بنجاح.');
    } catch (err) {
      setReqMsg(err instanceof Error ? err.message : 'تعذر إرسال الطلب.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-7">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E8DCF3] pb-5">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278]">
            <Sparkles className="w-4 h-4" />
            <span>الخدمات وتجهيزات الفرح</span>
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#24172E]">
            خدمات تجهيز الزفاف الشاملة
          </h1>
          <p className="text-sm text-[#5E4D6B]">
            11 فئة من الديكورات والكوشة والورود والفساتين والتجميل والموسيقى والبوفيه
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddService}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة خدمة</span>
          </button>

          <div className="inline-flex p-1 rounded-xl bg-[#F3ECF9] border border-[#E8DCF3]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'offers'}
              onClick={() => setActiveTab('offers')}
              className={`relative px-5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'offers' ? 'text-white' : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              {activeTab === 'offers' && (
                <motion.span
                  layoutId="services-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">العروض ({services.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'requests'}
              onClick={() => setActiveTab('requests')}
              className={`relative px-5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'requests' ? 'text-white' : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              {activeTab === 'requests' && (
                <motion.span
                  layoutId="services-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">طلبات العميل ({requests.length})</span>
            </button>
          </div>
        </div>
      </div>

      {srvFeedback && !showAddServiceModal && (
        <div className="p-4 rounded-2xl bg-[#F3ECF9] border border-[#5B3278]/25 text-xs font-bold text-[#5B3278]">
          {srvFeedback}
        </div>
      )}

      <CinematicTabPanel tabKey={activeTab}>
      {activeTab === 'offers' ? (
        <div className="space-y-6">
          {/* Search, City, Budget & Sort Filters */}
          <div className="velora-card rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1.5">
                  بحث في الخدمات
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8C799B] absolute right-3 top-3" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="كوشة، فستان، ميكب، دي جي..."
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                  />
                </div>
              </div>
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
                  الميزانية القصوى (ج.م)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="مثال: 25000"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
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
                  <option value="discount_desc">الأعلى خصمًا</option>
                </select>
              </div>
            </div>
            {(selectedCategory !== 'all' || query || selectedCity || maxPrice) && (
              <div className="flex items-center justify-between pt-2 border-t border-[#F0E7F8]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setQuery('');
                    setSelectedCity('');
                    setMaxPrice('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B3278] hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>مسح فلاتر الخدمات</span>
                </button>
                <span className="text-xs text-[#6B5A78] font-medium">
                  {filteredServices.length} خدمة مطابقة
                </span>
              </div>
            )}
          </div>

          {/* 11 Wedding Categories Selector */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                selectedCategory === 'all'
                  ? 'text-white border-[#5B3278]'
                  : 'bg-white text-[#5E4D6B] border-[#E8DCF3] hover:bg-[#F3ECF9]'
              }`}
            >
              {selectedCategory === 'all' && (
                <motion.span
                  layoutId="services-cat-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-[11px] bg-[#5B3278]"
                />
              )}
              <span className="relative z-10">الكل ({services.length})</span>
            </button>
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  selectedCategory === cat.key
                    ? 'text-white border-[#5B3278]'
                    : 'bg-white text-[#5E4D6B] border-[#E8DCF3] hover:bg-[#F3ECF9]'
                }`}
              >
                {selectedCategory === cat.key && (
                  <motion.span
                    layoutId="services-cat-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-[11px] bg-[#5B3278]"
                  />
                )}
                <span className="relative z-10">{cat.labelAr}</span>
              </button>
            ))}
          </div>

          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((srv, idx) => {
                const isFav = favorites.some(
                  (f) => f.targetType === 'service' && f.targetId === srv.id
                );
                const catName =
                  SERVICE_CATEGORIES.find((c) => c.key === srv.category)?.labelAr || srv.category;
                return (
                  <motion.article
                    key={srv.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.36, delay: Math.min(idx * 0.045, 0.25), ease: VELORA_EASE }}
                    className="group velora-card rounded-2xl overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-lg hover:shadow-[#5B3278]/10"
                  >
                    <div>
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={resolveMediaUrl(srv.coverImage)}
                          alt={srv.titleAr}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        />
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/95 text-[#5B3278] text-xs font-bold">
                          {catName}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite('service', srv.id)}
                          className={`absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center ${
                            isFav ? 'bg-[#5B3278] text-white' : 'bg-white/90 text-[#5B3278]'
                          }`}
                          aria-label="حفظ بالمفضلة"
                        >
                          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-[#6B5A78]">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#5B3278]" />
                            {srv.city}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#5B3278]">
                            <Star className="w-3.5 h-3.5 fill-[#C5A25D] text-[#C5A25D]" />
                            {srv.avgRating}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-[#24172E]">{srv.titleAr}</h2>
                        <p className="text-xs text-[#7C678D] font-medium">{srv.providerName}</p>
                        <p className="text-xs text-[#5E4D6B] line-clamp-2">{srv.descriptionAr}</p>
                      </div>
                    </div>
                    <div className="px-5 py-4 border-t border-[#F0E7F8] flex items-center justify-between">
                      <span className="text-sm font-bold text-[#5B3278] tabular-nums">
                        من {formatEgp(srv.startingPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openServiceModal(srv)}
                        className="px-4 py-2 rounded-xl bg-[#5B3278] text-white text-xs font-semibold hover:bg-[#482461]"
                      >
                        التفاصيل والحجز
                      </button>
                    </div>
                    {(srv as { isDemo?: boolean }).isDemo && (
                      <span className="mx-5 mb-2 inline-block rounded-full bg-[#F3ECF9] px-2.5 py-1 text-[11px] font-bold text-[#5B3278]">نموذج تجريبي</span>
                    )}
                    <ShareLink path="/services" title={srv.titleAr} className="px-5 pb-3" />
                    <ContactRow phone={srv.contactPhone} subject={srv.titleAr} className="px-5 pb-4" />
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="velora-card rounded-2xl p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-[#24172E]">
                لا توجد عروض معتمدة في هذه الفئة حاليًا
              </p>
              <p className="text-xs text-[#5E4D6B]">
                يمكنك اختيار فئة أخرى أو نشر طلبك في تبويب «طلبات العميل» وسيتواصل معك المختصون.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="velora-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F3ECF9]/60">
            <div>
              <h2 className="text-lg font-bold text-[#24172E]">طلبات تجهيزات الفرح من العملاء</h2>
              <p className="text-xs text-[#5E4D6B]">
                أضف طلبًا لأي من خدمات الزفاف الـ 11 ليصلك أنسب عرض.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  onRequireAuth();
                  return;
                }
                setShowReqForm((p) => !p);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-semibold shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>أضف طلب خدمة</span>
            </button>
          </div>

          {reqMsg && (
            <div className="p-3.5 rounded-xl bg-[#F3ECF9] text-xs font-semibold text-[#5B3278]">
              {reqMsg}
            </div>
          )}

          {showReqForm && (
            <form onSubmit={handleRequestSubmit} className="velora-card rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">عنوان الطلب</label>
                  <input
                    required
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="مثال: مطلوب تصميم كوشة وتنسيق ورود لـ 20 طاولة"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الفئة</label>
                  <select
                    value={reqCategory}
                    onChange={(e) => setReqCategory(e.target.value as ServiceCategoryKey)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.labelAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">تاريخ المناسبة</label>
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
                  onClick={() => setShowReqForm(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DCF3] text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-semibold"
                >
                  نشر طلب الخدمة
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {requests.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.32, delay: Math.min(idx * 0.04, 0.2), ease: VELORA_EASE }}
                className="velora-card rounded-2xl p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-xs font-bold">
                    {r.preferredType || 'خدمة زفاف'}
                  </span>
                  <span className="text-xs text-[#6B5A78] tabular-nums">{r.eventDate}</span>
                </div>
                <h3 className="text-base font-bold text-[#24172E]">{r.titleAr}</h3>
                <p className="text-xs text-[#5E4D6B]">{r.notesAr}</p>
                <div className="pt-2 border-t border-[#F0E7F8] flex justify-between text-xs">
                  <span>{r.city}</span>
                  <span className="font-bold text-[#5B3278] tabular-nums">{formatEgp(r.budgetEgp)}</span>
                </div>
              </motion.div>
            ))}
            {requests.length === 0 && (
              <div className="md:col-span-2 velora-card rounded-2xl p-8 text-center text-xs text-[#5E4D6B]">
                لا توجد طلبات عملاء في قسم الخدمات حاليًا — كن أول من يضيف طلبه.
              </div>
            )}
          </div>
        </div>
      )}
      </CinematicTabPanel>

      {/* Service Detail & Booking Modal */}
      {activeService && (
        <div className="fixed inset-0 z-50 bg-[#24172E]/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto border border-[#E8DCF3]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#24172E]">
                {activeService.titleAr}
              </h2>
              <button
                type="button"
                onClick={() => setActiveService(null)}
                className="w-9 h-9 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5B3278]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={resolveMediaUrl(activeService.coverImage)}
              alt={activeService.titleAr}
              className="w-full h-52 object-cover rounded-2xl"
            />
            <p className="text-sm text-[#5E4D6B] leading-relaxed">{activeService.descriptionAr}</p>
            <div className="flex flex-wrap gap-2">
              {activeService.packagesAr.map((pkg) => (
                <span key={pkg} className="px-3 py-1 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-xs font-semibold">
                  {pkg}
                </span>
              ))}
            </div>

            <form onSubmit={handleBookService} className="space-y-3 pt-3 border-t border-[#E8DCF3]">
              <h3 className="text-sm font-bold text-[#24172E]">طلب حجز هذه الخدمة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تفاصيل إضافية..."
                  className="px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              {bookingFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    bookingFeedback.ok ? 'bg-[#F3ECF9] text-[#5B3278]' : 'bg-[#FDF1F2] text-[#9A2D3C]'
                  }`}
                >
                  {bookingFeedback.text}
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#5B3278] text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <CalendarCheck2 className="w-4 h-4" />
                <span>تقديم طلب حجز ({formatEgp(activeService.startingPrice)})</span>
              </button>
            </form>

            {/* Reviews inside Modal */}
            <div className="pt-3 border-t border-[#E8DCF3] space-y-3">
              <h3 className="text-sm font-bold text-[#24172E]">التقييمات ({serviceReviews.length})</h3>
              {serviceReviews.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-[#FAF7FD] text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#24172E]">
                    <span>{r.authorName}</span>
                    <span className="text-[#5B3278]">{'★'.repeat(r.rating)}</span>
                  </div>
                  <p className="text-[#5E4D6B]">{r.commentAr}</p>
                </div>
              ))}
              <form onSubmit={handleReviewSubmit} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-[#E8DCF3] text-xs"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} نجوم</option>
                  ))}
                </select>
                <input
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="أضف تقييمك للخدمة..."
                  className="flex-1 px-3 py-2 rounded-xl border border-[#E8DCF3] text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-bold"
                >
                  إرسال
                </button>
              </form>
              {reviewStatusMsg && <p className="text-xs font-semibold text-[#5B3278]">{reviewStatusMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-[#24172E]/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateService}
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-[#E8DCF3]"
          >
            <div className="flex items-center justify-between border-b border-[#F0E7F8] pb-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#24172E]">إضافة خدمة زفاف جديدة</h2>
                <p className="text-xs text-[#6B5A78]">
                  {user?.role === 'admin'
                    ? 'تُنشر الخدمة مباشرة بصلاحية الإدارة'
                    : 'تُرسل الخدمة للاعتماد الإداري قبل ظهورها للعملاء'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddServiceModal(false)}
                className="w-9 h-9 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5B3278]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">اسم الخدمة / العرض</label>
                <input
                  required
                  value={srvTitle}
                  onChange={(e) => setSrvTitle(e.target.value)}
                  placeholder="مثال: تصميم كوشة ملكية وإضاءة فاخرة"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">تصنيف الخدمة</label>
                <select
                  value={srvCategory}
                  onChange={(e) => setSrvCategory(e.target.value as ServiceCategoryKey)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                >
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.labelAr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المحافظة</label>
                <select
                  required
                  value={srvCity}
                  onChange={(e) => setSrvCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm font-semibold"
                >
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الأسعار تبدأ من (ج.م)</label>
                <input
                  required
                  type="number"
                  value={srvPrice}
                  onChange={(e) => setSrvPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المنطقة</label>
                <input
                  value={srvArea}
                  onChange={(e) => setSrvArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">تفاصيل الخدمة والباقات</label>
                <textarea
                  required
                  rows={2}
                  value={srvDesc}
                  onChange={(e) => setSrvDesc(e.target.value)}
                  placeholder="اكتب مواصفات الخدمة وما تشمله الباقة..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">رقم للتواصل العام (اختياري)</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={srvPubPhone}
                  onChange={(e) => setsrvPubPhone(e.target.value)}
                  placeholder="اتركه فارغًا إن لم ترغب في إظهار رقمك"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
                <p className="mt-1 text-[11px] text-[#6B5A78]">إذا أضفت رقمًا سيظهر لكل زوار الموقع على إعلانك. لن نعرضه إلا بموافقتك هنا.</p>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{srvUploading ? 'جاري رفع الصورة...' : 'رفع صورة للخدمة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (ev) => {
                      const f = ev.target.files?.[0];
                      if (!f) return;
                      setSrvUploading(true);
                      try {
                        const url = await uploadImageFile(f);
                        setSrvCover(url);
                      } finally {
                        setSrvUploading(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <img
                  src={resolveMediaUrl(srvCover)}
                  alt="معاينة الخدمة"
                  className="w-16 h-12 rounded-xl object-cover border border-[#E8DCF3]"
                />
              </div>
            </div>

            {srvFeedback && (
              <div className="p-3 rounded-xl bg-[#FDF1F2] text-xs font-semibold text-[#9A2D3C]">
                {srvFeedback}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddServiceModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E8DCF3] text-xs font-semibold text-[#5E4D6B]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={srvSaving || srvUploading}
                className="px-5 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold disabled:opacity-50"
              >
                {srvSaving ? 'جاري الإرسال...' : 'حفظ وإرسال الخدمة'}
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
              <h2 className="font-display text-xl font-bold text-[#24172E]">إضافة خدمة على VÉLORA</h2>
              <button
                type="button"
                onClick={() => setShowRolePrompt(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5B3278]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              لإضافة خدمات وتجهيزات الفرح عبر VÉLORA، يرجى تسجيل الدخول بحساب{' '}
              <strong className="text-[#5B3278]">مقدم خدمات وتجهيزات</strong> أو إنشاء حساب شريك الآن.
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
                  onRequireAuth('service_provider');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold"
              >
                تسجيل حساب مقدم خدمات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
