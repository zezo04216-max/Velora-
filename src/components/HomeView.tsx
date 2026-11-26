import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  Compass,
  Crown,
  Heart,
  Mail,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';
import { Compass as ToolCompass, Gift as ToolGift, Heart as ToolHeart, Mail as ToolMail } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import type {
  PhotographerRecord,
  ServiceRecord,
  VenueRecord,
} from '../types/velora';
import { apiFetch } from '../utils/api';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { SERVICE_CATEGORIES, formatEgp, getAllEgyptGovernoratesWithExtras } from '../utils/veloraLogic';
import {
  CinematicSection,
  CinematicStaggerGrid,
  CinematicStaggerItem,
  VELORA_EASE,
} from './CinematicMotion';
import { InvitationCardRenderer } from './InvitationCardRenderer';
import type { VeloraRoute } from './VeloraHeader';
import { VeloraBrandMark } from './VeloraBrandMark';

interface HomeViewProps {
  venues: VenueRecord[];
  photographers: PhotographerRecord[];
  services: ServiceRecord[];
  onNavigate: (route: VeloraRoute) => void;
  onSelectVenue: (id: string) => void;
  onSelectPhotographer: (id: string) => void;
  onOpenSampleInvitation: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  venues,
  photographers,
  services,
  onNavigate,
  onSelectVenue,
  onSelectPhotographer,
  onOpenSampleInvitation,
}) => {
  // Global Site-Wide Filter State
  const [filterSection, setFilterSection] = useState<'all' | 'venue' | 'photographer' | 'service'>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterMaxBudget, setFilterMaxBudget] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [onlyAvailableOnDate, setOnlyAvailableOnDate] = useState(false);
  const [reservedVenueIds, setReservedVenueIds] = useState<string[]>([]);
  const [reservedPhotoIds, setReservedPhotoIds] = useState<string[]>([]);

  const heroRef = useRef<HTMLElement | null>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress: rawHeroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroScrollProgress = useSpring(rawHeroScroll, {
    stiffness: 170,
    damping: 30,
    mass: 0.35,
  });

  // Bidirectional hero disintegrate on scroll down & reassemble on scroll up
  const heroTextOpacity = useTransform(heroScrollProgress, [0, 0.25, 0.9], [1, 1, 0.06]);
  const heroTextY = useTransform(heroScrollProgress, [0, 0.25, 0.9], [0, 0, -40]);
  const heroTextX = useTransform(heroScrollProgress, [0, 0.25, 0.9], [0, 0, 28]);
  const heroTextScale = useTransform(heroScrollProgress, [0, 0.25, 0.9], [1, 1, 0.93]);
  const heroTextFilter = useTransform(heroScrollProgress, [0, 0.25, 0.9], ['blur(0px)', 'blur(0px)', 'blur(5px)']);

  const heroImagesOpacity = useTransform(heroScrollProgress, [0, 0.22, 0.92], [1, 1, 0.06]);
  const heroPrimaryY = useTransform(heroScrollProgress, [0, 1], [0, -56]);
  const heroPrimaryX = useTransform(heroScrollProgress, [0, 1], [0, -34]);
  const heroPrimaryRotate = useTransform(heroScrollProgress, [0, 1], [0, -3.5]);
  const heroSecondaryY = useTransform(heroScrollProgress, [0, 1], [0, 32]);
  const heroSecondaryX = useTransform(heroScrollProgress, [0, 1], [0, -44]);
  const heroSecondaryRotate = useTransform(heroScrollProgress, [0, 1], [0, 4]);

  useEffect(() => {
    if (!filterDate) {
      setReservedVenueIds([]);
      setReservedPhotoIds([]);
      return;
    }
    let cancelled = false;
    apiFetch<{ reservedVenueIds: string[]; reservedPhotographerIds: string[] }>(
      `/api/availability?date=${encodeURIComponent(filterDate)}`
    )
      .then((res) => {
        if (!cancelled) {
          setReservedVenueIds(res.reservedVenueIds || []);
          setReservedPhotoIds(res.reservedPhotographerIds || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReservedVenueIds([]);
          setReservedPhotoIds([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filterDate]);

  const allCities = useMemo(() => {
    const extras: string[] = [];
    venues.forEach((v) => v.city && extras.push(v.city));
    photographers.forEach((p) => p.city && extras.push(p.city));
    services.forEach((s) => s.city && extras.push(s.city));
    return getAllEgyptGovernoratesWithExtras(extras);
  }, [venues, photographers, services]);

  const isFiltering = Boolean(
    filterQuery.trim() ||
      filterSection !== 'all' ||
      filterCity ||
      filterMaxBudget ||
      filterDate
  );

  const globalResults = useMemo(() => {
    if (!isFiltering) return [];
    const q = filterQuery.trim().toLowerCase();
    const maxB = Number(filterMaxBudget) || 0;

    const list: Array<{
      id: string;
      kind: 'venue' | 'photographer' | 'service';
      kindLabel: string;
      title: string;
      subtitle: string;
      city: string;
      price: number;
      rating: number;
      image: string;
      available: boolean;
    }> = [];

    if (filterSection === 'all' || filterSection === 'venue') {
      venues.forEach((v) => {
        if (filterCity && v.city !== filterCity) return;
        if (maxB > 0 && v.pricePerEvent > maxB) return;
        if (
          q &&
          !`${v.titleAr} ${v.subtitleAr} ${v.city} ${v.area} ${v.descriptionAr}`
            .toLowerCase()
            .includes(q)
        ) {
          return;
        }
        const available = !filterDate || !reservedVenueIds.includes(v.id);
        if (filterDate && onlyAvailableOnDate && !available) return;
        list.push({
          id: v.id,
          kind: 'venue',
          kindLabel: 'قاعة أفراح',
          title: v.titleAr,
          subtitle: `${v.city} · ${v.area}`,
          city: v.city,
          price: v.pricePerEvent,
          rating: v.avgRating,
          image: v.coverImage,
          available,
        });
      });
    }

    if (filterSection === 'all' || filterSection === 'photographer') {
      photographers.forEach((p) => {
        if (filterCity && p.city !== filterCity) return;
        if (maxB > 0 && p.startingPrice > maxB) return;
        if (
          q &&
          !`${p.displayName} ${p.specialtyAr} ${p.city} ${p.studioLocation}`
            .toLowerCase()
            .includes(q)
        ) {
          return;
        }
        const available = !filterDate || !reservedPhotoIds.includes(p.id);
        if (filterDate && onlyAvailableOnDate && !available) return;
        list.push({
          id: p.id,
          kind: 'photographer',
          kindLabel: 'مصور أفراح',
          title: p.displayName,
          subtitle: `${p.city} · ${p.specialtyAr}`,
          city: p.city,
          price: p.startingPrice,
          rating: p.avgRating,
          image: p.coverImage,
          available,
        });
      });
    }

    if (filterSection === 'all' || filterSection === 'service') {
      services.forEach((s) => {
        if (filterCity && s.city !== filterCity) return;
        if (maxB > 0 && s.startingPrice > maxB) return;
        const catLabel =
          SERVICE_CATEGORIES.find((c) => c.key === s.category)?.labelAr || s.category;
        if (
          q &&
          !`${s.titleAr} ${s.providerName} ${catLabel} ${s.city} ${s.descriptionAr}`
            .toLowerCase()
            .includes(q)
        ) {
          return;
        }
        list.push({
          id: s.id,
          kind: 'service',
          kindLabel: catLabel,
          title: s.titleAr,
          subtitle: `${s.city} · ${s.providerName}`,
          city: s.city,
          price: s.startingPrice,
          rating: s.avgRating,
          image: s.coverImage,
          available: true,
        });
      });
    }

    return list;
  }, [
    isFiltering,
    filterQuery,
    filterSection,
    filterCity,
    filterMaxBudget,
    filterDate,
    onlyAvailableOnDate,
    reservedVenueIds,
    reservedPhotoIds,
    venues,
    photographers,
    services,
  ]);

  const resetFilters = () => {
    setFilterSection('all');
    setFilterQuery('');
    setFilterCity('');
    setFilterMaxBudget('');
    setFilterDate('');
    setOnlyAvailableOnDate(false);
  };

  const featuredVenues = venues.slice(0, 3);
  const featuredPhotographers = photographers.slice(0, 3);
  const featuredOffers = [
    ...venues
      .filter((v) => v.discountPercent > 0)
      .map((v) => ({
        id: v.id,
        type: 'venue' as const,
        title: v.titleAr,
        subtitle: `${v.city} · ${v.area}`,
        discount: v.discountPercent,
        price: v.pricePerEvent,
        image: v.coverImage,
      })),
    ...photographers
      .filter((p) => p.discountPercent > 0)
      .map((p) => ({
        id: p.id,
        type: 'photographer' as const,
        title: p.displayName,
        subtitle: p.specialtyAr,
        discount: p.discountPercent,
        price: p.startingPrice,
        image: p.coverImage,
      })),
    ...services
      .filter((s) => s.discountPercent > 0)
      .map((s) => ({
        id: s.id,
        type: 'service' as const,
        title: s.titleAr,
        subtitle: s.providerName,
        discount: s.discountPercent,
        price: s.startingPrice,
        image: s.coverImage,
      })),
  ].slice(0, 3);

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Luxury Editorial Hero with Bidirectional Scroll Dissolve & Reassembly */}
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#FAF7FD] to-[#F3ECF9] border-b border-[#E8DCF3]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <motion.div
            style={
              prefersReduced
                ? undefined
                : {
                    opacity: heroTextOpacity,
                    y: heroTextY,
                    x: heroTextX,
                    scale: heroTextScale,
                    filter: heroTextFilter,
                    willChange: 'transform, opacity, filter',
                  }
            }
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: VELORA_EASE }}
            className="lg:col-span-6 space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: VELORA_EASE }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DCF3] text-[#5B3278] text-xs font-semibold shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A25D]" />
              <span>منصة VÉLORA لتنظيم الأفراح في مصر</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12, ease: VELORA_EASE }}
              className="font-display text-3xl sm:text-5xl lg:text-[52px] font-bold text-[#24172E] leading-[1.2] text-balance"
            >
              كل تفاصيل فرحتك{' '}
              <span className="text-[#5B3278]">تبدأ من هنا</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: VELORA_EASE }}
              className="text-base sm:text-lg text-[#5E4D6B] leading-relaxed max-w-xl"
            >
              منصة فاخرة تجمع لك أرقى قاعات الأفراح، أشهر المصورين، و11 فئة من خدمات الزفاف مع
              نظام حجز ذكي يمنع تعارض التواريخ ودعوات إلكترونية تفاعلية بـ 7 تصاميم مختلفة.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26, ease: VELORA_EASE }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('find_wedding')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-sm font-semibold shadow-md shadow-[#5B3278]/20 transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>اعثر على فرحك الآن</span>
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('workspace')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-[#F3ECF9] text-[#5B3278] border border-[#D8C5EC] text-sm font-semibold transition-colors"
              >
                <Heart className="w-4 h-4" />
                <span>مساحة فرحنا</span>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('invitations')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-[#F3ECF9] text-[#5B3278] border border-[#E8DCF3] text-sm font-semibold transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>صمّم دعوتك</span>
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.34, ease: VELORA_EASE }}
              className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E8DCF3] max-w-md"
            >
              <div>
                <p className="font-display text-2xl font-bold text-[#5B3278] tabular-nums">+11</p>
                <p className="text-xs text-[#6B5A78]">فئة تجهيز زفاف</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-[#5B3278] tabular-nums">7</p>
                <p className="text-xs text-[#6B5A78]">تصاميم دعوات فاخرة</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-[#5B3278] tabular-nums">100%</p>
                <p className="text-xs text-[#6B5A78]">فحص تواريخ ذكي</p>
              </div>
            </motion.div>

            <div className="grid grid-cols-4 gap-2 max-w-md" aria-label="أدوات إضافية">
              {[
                { route: 'invitations' as VeloraRoute, label: 'الدعوات', Icon: ToolMail },
                { route: 'find_wedding' as VeloraRoute, label: 'اعثر على فرحك', Icon: ToolCompass },
                { route: 'workspace' as VeloraRoute, label: 'مساحة فرحنا', Icon: ToolHeart },
                { route: 'packages' as VeloraRoute, label: 'الباقات', Icon: ToolGift },
              ].map(({ route, label, Icon }) => (
                <button
                  key={route}
                  type="button"
                  onClick={() => onNavigate(route)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E8DCF3] bg-white px-1 py-3 text-[11px] font-semibold text-[#5B3278] hover:bg-[#F3ECF9] transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Editorial Photo Collage with Scroll Fragment & Reassembly */}
          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-12 gap-3 sm:gap-4 items-end">
              <motion.div
                style={
                  prefersReduced
                    ? undefined
                    : {
                        y: heroPrimaryY,
                        x: heroPrimaryX,
                        rotate: heroPrimaryRotate,
                        opacity: heroImagesOpacity,
                        willChange: 'transform, opacity',
                      }
                }
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.72, delay: 0.14, ease: VELORA_EASE }}
                className="col-span-8 rounded-2xl overflow-hidden border border-[#E8DCF3] shadow-lg shadow-[#5B3278]/10 bg-white"
              >
                <img
                  src={resolveMediaUrl('/src/assets/images/velora_hero_wedding_1795424759489.jpg')}
                  alt="حفل زفاف فاخر في قصر مضاء"
                  className="w-full h-[270px] sm:h-[360px] object-cover hover:scale-105 transition-transform duration-700"
                />
              </motion.div>
              <motion.div
                style={
                  prefersReduced
                    ? undefined
                    : {
                        y: heroSecondaryY,
                        x: heroSecondaryX,
                        rotate: heroSecondaryRotate,
                        opacity: heroImagesOpacity,
                        willChange: 'transform, opacity',
                      }
                }
                initial={{ opacity: 0, y: 28, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.75, delay: 0.24, ease: VELORA_EASE }}
                className="col-span-4 space-y-3 sm:space-y-4"
              >
                <div className="rounded-2xl overflow-hidden border border-[#E8DCF3] shadow-md bg-white">
                  <img
                    src={resolveMediaUrl('/src/assets/images/velora_photographer_couple_1795424759634.jpg')}
                    alt="جلسة تصوير عروسين"
                    className="w-full h-[128px] sm:h-[168px] object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden border border-[#E8DCF3] shadow-md bg-white">
                  <img
                    src={resolveMediaUrl('/src/assets/images/velora_invitation_editorial_1795424758769.jpg')}
                    alt="دعوة زفاف فاخرة"
                    className="w-full h-[128px] sm:h-[172px] object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 1.5 Global Site-Wide Search & Smart Filter Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 space-y-5">
        <div className="velora-card rounded-3xl p-5 sm:p-6 shadow-lg shadow-[#5B3278]/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#F3ECF9] text-[#5B3278] flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[#24172E]">
                  البحث والفلترة الشاملة في VÉLORA
                </h2>
                <p className="text-[11px] text-[#6B5A78]">
                  ابحث وفلتر القاعات والمصورين وخدمات الفرح حسب المدينة، الميزانية، وتاريخ المناسبة
                </p>
              </div>
            </div>
            {isFiltering && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7FD] border border-[#E8DCF3] text-xs font-bold text-[#5B3278] hover:bg-[#F3ECF9]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مسح الفلاتر</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">القسم</label>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value as typeof filterSection)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold text-[#24172E]"
                aria-label="فلترة القسم"
              >
                <option value="all">جميع الأقسام</option>
                <option value="venue">قاعات الأفراح ({venues.length})</option>
                <option value="photographer">المصورون ({photographers.length})</option>
                <option value="service">الخدمات والتجهيزات ({services.length})</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">المدينة</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs font-semibold text-[#24172E]"
                aria-label="فلترة المدينة"
              >
                <option value="">كل المدن</option>
                {allCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">كلمة البحث</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C799B] absolute right-3 top-3" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="أوركيد، كريم، كوشة، التجمع..."
                  className="w-full pr-8 pl-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5E4D6B] mb-1">
                الميزانية القصوى (ج.م)
              </label>
              <input
                type="number"
                value={filterMaxBudget}
                onChange={(e) => setFilterMaxBudget(e.target.value)}
                placeholder="مثال: 60000"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5B3278] mb-1">
                تاريخ الفرح المتاح
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#C9B0E3] bg-white text-xs"
              />
            </div>
          </div>

          {filterDate && (
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B3278] cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAvailableOnDate}
                onChange={(e) => setOnlyAvailableOnDate(e.target.checked)}
                className="rounded border-[#C9B0E3] text-[#5B3278]"
              />
              <span>إظهار المتاح فقط في تاريخ {filterDate}</span>
            </label>
          )}
        </div>

        {/* Dynamic Site-Wide Filter Results */}
        {isFiltering && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#24172E]">
                نتائج الفلترة ({globalResults.length})
              </p>
            </div>
            {globalResults.length === 0 ? (
              <div className="velora-card rounded-2xl p-8 text-center space-y-2">
                <p className="text-sm font-bold text-[#24172E]">
                  لا توجد نتائج مطابقة لاختيارات الفلترة الحالية
                </p>
                <p className="text-xs text-[#6B5A78]">
                  جرّب توسيع الميزانية أو مسح أحد الفلاتر لعرض جميع العروض.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {globalResults.map((item) => (
                  <article
                    key={`${item.kind}-${item.id}`}
                    className="velora-card rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={resolveMediaUrl(item.image)}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/95 text-[#5B3278] text-[11px] font-bold">
                          {item.kindLabel}
                        </span>
                        {filterDate && (
                          <span
                            className={`absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                              item.available
                                ? 'bg-white text-[#5B3278] border border-[#5B3278]'
                                : 'bg-[#9A2D3C] text-white'
                            }`}
                          >
                            {item.available ? 'متاح في التاريخ' : 'محجوز في التاريخ'}
                          </span>
                        )}
                      </div>
                      <div className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-[#6B5A78]">
                          <span>{item.subtitle}</span>
                          <span className="inline-flex items-center gap-1 font-bold text-[#5B3278]">
                            <Star className="w-3.5 h-3.5 fill-[#C5A25D] text-[#C5A25D]" />
                            {item.rating}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#24172E]">{item.title}</h3>
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-[#F0E7F8] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5B3278] tabular-nums">
                        {formatEgp(item.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.kind === 'venue') onSelectVenue(item.id);
                          else if (item.kind === 'photographer') onSelectPhotographer(item.id);
                          else onNavigate('services');
                        }}
                        className="px-3.5 py-2 rounded-lg bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-semibold"
                      >
                        التفاصيل
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 1.8 Couple Spaces Showcase (Home-Exclusive Entry Points) */}
      <CinematicSection className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="velora-card rounded-3xl p-6 sm:p-7 bg-gradient-to-l from-white to-[#F7F1FC] flex flex-col justify-between gap-4 border border-[#E2D2F2]">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3278]">
                <Compass className="w-4 h-4 text-[#C5A25D]" />
                <span>أداة ترشيح ذكية لحفل الزفاف</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-[#24172E]">اعثر على فرحك</h2>
              <p className="text-xs sm:text-sm text-[#5E4D6B] leading-relaxed">
                أدخل المحافظة، تاريخ الفرح، الميزانية، عدد المدعوين، ونوع الفرح — ليجهز لك VÉLORA باقات متكاملة
                من القاعات والمصورين والخدمات المتاحة في نفس يوم فرحك.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAE0F6]">
              <span className="text-[11px] font-semibold text-[#6B5A78]">
                ترشيح فوري حسب التوافر الفعلي والميزانية
              </span>
              <button
                type="button"
                onClick={() => onNavigate('find_wedding')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold transition-colors"
              >
                <span>ابدأ البحث الآن</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="velora-card rounded-3xl p-6 sm:p-7 bg-gradient-to-l from-white to-[#FAF7FD] flex flex-col justify-between gap-4 border border-[#E8DCF3]">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3278]">
                <Heart className="w-4 h-4 text-[#C5A25D]" />
                <span>مساحة خاصة لكل عريس وعروسة</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-[#24172E]">مساحة فرحنا</h2>
              <p className="text-xs sm:text-sm text-[#5E4D6B] leading-relaxed">
                تابع ميزانية الفرح والمصروف والمتبقي، قائمة التجهيزات الكاملة، مقارنة 3 قاعات أو مصورين،
                جدول الاتفاقات والمهام، وترشيحات ذكية لميزانيتك.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAE0F6]">
              <span className="text-[11px] font-semibold text-[#6B5A78]">
                تخطيط منظم · مقارنة أسعار · مهام وحجوزات
              </span>
              <button
                type="button"
                onClick={() => onNavigate('workspace')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F3ECF9] hover:bg-[#5B3278] text-[#5B3278] hover:text-white border border-[#DFCEF0] text-xs font-bold transition-colors"
              >
                <span>افتح مساحة فرحنا</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </CinematicSection>

      {/* 2. Platform Value Pillars */}
      <CinematicSection className="max-w-7xl mx-auto px-4 sm:px-6">
        <CinematicStaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <CinematicStaggerItem scatterIndex={0} className="velora-card rounded-2xl p-6 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F3ECF9] text-[#5B3278] flex items-center justify-center">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#24172E]">حجز ذكي بدون تعارض</h2>
            <p className="text-sm text-[#5E4D6B] leading-relaxed">
              اعرف فورًا هل القاعة أو المصور متاح أو محجوز في تاريخ فرحك قبل إرسال طلبك، مع منع الحجز المزدوج آليًا.
            </p>
          </CinematicStaggerItem>
          <CinematicStaggerItem scatterIndex={1} className="velora-card rounded-2xl p-6 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F3ECF9] text-[#5B3278] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#24172E]">اعتماد مزدوج وموثوق</h2>
            <p className="text-sm text-[#5E4D6B] leading-relaxed">
              لا يتم تأكيد أي حجز نهائيًا إلا بموافقة مقدم الخدمة واعتماد إدارة VÉLORA مع إشعارات فورية في كل خطوة.
            </p>
          </CinematicStaggerItem>
          <CinematicStaggerItem scatterIndex={2} className="velora-card rounded-2xl p-6 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F3ECF9] text-[#5B3278] flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#24172E]">دعوات إلكترونية برونق خاص</h2>
            <p className="text-sm text-[#5E4D6B] leading-relaxed">
              شارك رابط دعوتك مباشرة مع ضيوفك ليؤكدوا الحضور ويرسلوا التهاني دون الحاجة لتسجيل حساب، مع عداد تنازلي حي.
            </p>
          </CinematicStaggerItem>
        </CinematicStaggerGrid>
      </CinematicSection>

      {/* 3. Venues Showcase */}
      <CinematicSection className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#7A4C9E] mb-1">قاعات الأفراح المختارة</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
              أرقى القاعات والحدائق
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('venues')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B3278] hover:text-[#482461]"
          >
            <span>عرض كل القاعات</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <CinematicStaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredVenues.map((venue, idx) => (
            <CinematicStaggerItem key={venue.id} scatterIndex={idx} className="h-full">
              <article className="velora-card h-full rounded-2xl overflow-hidden flex flex-col hover:border-[#C9B0E3] transition-colors group">
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={resolveMediaUrl(venue.coverImage)}
                    alt={venue.titleAr}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {venue.discountPercent > 0 && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#5B3278] text-white text-xs font-semibold">
                      خصم {venue.discountPercent}%
                    </span>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#6B5A78]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#5B3278]" />
                        {venue.city} · {venue.area}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#5B3278] font-semibold">
                        <Star className="w-3.5 h-3.5 fill-[#C5A25D] text-[#C5A25D]" />
                        {venue.avgRating}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#24172E]">{venue.titleAr}</h3>
                    <p className="text-sm text-[#5E4D6B] line-clamp-2">{venue.subtitleAr}</p>
                  </div>
                  <div className="pt-3 border-t border-[#F0E7F8] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#7A6A88] block">تبدأ من</span>
                      <span className="text-sm font-bold text-[#5B3278] tabular-nums">
                        {formatEgp(venue.pricePerEvent)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectVenue(venue.id)}
                      className="px-4 py-2 rounded-lg bg-[#F3ECF9] hover:bg-[#5B3278] text-[#5B3278] hover:text-white text-xs font-semibold transition-colors"
                    >
                      التفاصيل والحجز
                    </button>
                  </div>
                </div>
              </article>
            </CinematicStaggerItem>
          ))}
        </CinematicStaggerGrid>
      </CinematicSection>

      {/* 4. Photographers Showcase */}
      <CinematicSection className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#7A4C9E] mb-1">عدسات استثنائية ليوم العمر</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
              مصورون محترفون
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('photographers')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B3278] hover:text-[#482461]"
          >
            <span>استكشف المصورين</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <CinematicStaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredPhotographers.map((p, idx) => (
            <CinematicStaggerItem key={p.id} scatterIndex={idx} className="h-full">
              <article className="velora-card h-full rounded-2xl overflow-hidden flex flex-col hover:border-[#C9B0E3] transition-colors group">
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={resolveMediaUrl(p.coverImage)}
                    alt={p.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#6B5A78]">
                      <span>{p.city} · خبرة {p.yearsExperience} سنوات</span>
                      <span className="inline-flex items-center gap-1 text-[#5B3278] font-semibold">
                        <Star className="w-3.5 h-3.5 fill-[#C5A25D] text-[#C5A25D]" />
                        {p.avgRating}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#24172E]">{p.displayName}</h3>
                    <p className="text-sm text-[#5E4D6B]">{p.specialtyAr}</p>
                  </div>
                  <div className="pt-3 border-t border-[#F0E7F8] flex items-center justify-between">
                    <span className="text-sm font-bold text-[#5B3278] tabular-nums">
                      من {formatEgp(p.startingPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectPhotographer(p.id)}
                      className="px-4 py-2 rounded-lg bg-[#F3ECF9] hover:bg-[#5B3278] text-[#5B3278] hover:text-white text-xs font-semibold transition-colors"
                    >
                      عرض البورتفوليو
                    </button>
                  </div>
                </div>
              </article>
            </CinematicStaggerItem>
          ))}
        </CinematicStaggerGrid>
      </CinematicSection>

      {/* 5. Wedding Services Categories Grid */}
      <CinematicSection className="bg-[#F3ECF9]/70 border-y border-[#E8DCF3] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#7A4C9E] mb-1">كافة تجهيزات الزفاف</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
                11 فئة متكاملة لتنسيق فرحك
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="px-4 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-semibold hover:bg-[#482461] transition-colors"
            >
              تصفح جميع الخدمات
            </button>
          </div>

          <CinematicStaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {SERVICE_CATEGORIES.map((cat, idx) => (
              <CinematicStaggerItem key={cat.key} scatterIndex={idx}>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="w-full h-full text-right bg-white rounded-xl p-4 border border-[#E8DCF3] hover:border-[#5B3278] transition-colors shadow-2xs"
                >
                  <p className="text-sm font-bold text-[#24172E] mb-1">{cat.labelAr}</p>
                  <p className="text-xs text-[#6B5A78] line-clamp-2">{cat.descriptionAr}</p>
                </button>
              </CinematicStaggerItem>
            ))}
          </CinematicStaggerGrid>
        </div>
      </CinematicSection>

      {/* 6. Featured Ivory Roses Live Invitation Card + Spotlight & Offers */}
      <CinematicSection className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <CinematicStaggerItem scatterIndex={0} liftOnHover={false} className="lg:col-span-6">
            <div className="rounded-3xl bg-[#5B3278] text-white p-7 sm:p-10 flex flex-col justify-between space-y-6 shadow-xl shadow-[#5B3278]/15">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-medium text-[#F5E6C8]">
                  <Heart className="w-3.5 h-3.5" />
                  <span>الدعوات الإلكترونية الفاخرة</span>
                </span>
                <h2 className="font-display text-2xl sm:text-4xl font-bold leading-snug">
                  صمّم دعوتك الإلكترونية في دقائق وشاركها برابط خاص
                </h2>
                <p className="text-sm sm:text-base text-[#EAE0F6] leading-relaxed">
                  اختر من بين 7 تصاميم مختلفة (ملكي، فاخر، رومانسي بالورود العاجية، كلاسيكي، عصري، أزرق مائي، بسيط وأنيق)
                  مع عداد تنازلي حي، خريطة القاعة، وتأكيد حضور فوري للضيوف بدون أي تسجيل.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('invitations')}
                  className="px-5 py-3 rounded-xl bg-white text-[#5B3278] hover:bg-[#F3ECF9] text-sm font-bold transition-colors"
                >
                  إنشاء دعوتك الآن
                </button>
                <button
                  type="button"
                  onClick={onOpenSampleInvitation}
                  className="px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-sm font-semibold transition-colors"
                >
                  معاينة دعوة الظرف الحية
                </button>
              </div>
            </div>
          </CinematicStaggerItem>

          {/* Live Rendered Ivory-Roses Wedding Invitation Preview */}
          <CinematicStaggerItem scatterIndex={2} className="lg:col-span-6">
            <div className="rounded-[32px] p-4 sm:p-6 bg-[#0B2418] border border-[#234532] shadow-2xl space-y-3">
              <div className="flex items-center justify-between px-1 text-[11px] text-[#EAD4A0]">
                <span className="font-semibold">معاينة حية · تصميم الورود العاجية والأخضر الزيتوني</span>
                <button
                  type="button"
                  onClick={() => onNavigate('invitations')}
                  className="underline hover:text-white transition-colors"
                >
                  تخصيص الكارت
                </button>
              </div>
              <InvitationCardRenderer
                invitation={{
                  designId: 'romantic',
                  groomName: 'محمد',
                  brideName: 'منه',
                  weddingDate: '2026-11-30',
                  weddingTime: '19:25',
                  venueName: 'قصر الأوركيد الملكي — التجمع الخامس',
                  mapUrl: 'https://maps.google.com/?q=30.0255,31.4847',
                  invitationText: 'يسعدنا حضوركم ومشاركتكم أجمل لحظاتنا',
                  couplePhoto: '',
                }}
              />
            </div>
          </CinematicStaggerItem>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-[#24172E]">أبرز العروض والخصومات</h2>
            <span className="text-xs font-semibold text-[#5B3278]">عروض معتمدة</span>
          </div>
          <CinematicStaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredOffers.map((offer, idx) => (
              <CinematicStaggerItem key={offer.id} scatterIndex={idx}>
                <div className="velora-card rounded-2xl p-3.5 flex items-center gap-4">
                  <img
                    src={resolveMediaUrl(offer.image)}
                    alt={offer.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-[#F3ECF9] text-[#5B3278] text-[11px] font-bold">
                        خصم {offer.discount}%
                      </span>
                      <span className="text-xs text-[#6B5A78] truncate">{offer.subtitle}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#24172E] truncate">{offer.title}</h3>
                    <p className="text-xs text-[#5B3278] font-semibold mt-1 tabular-nums">
                      {formatEgp(offer.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (offer.type === 'venue') onSelectVenue(offer.id);
                      else if (offer.type === 'photographer') onSelectPhotographer(offer.id);
                      else onNavigate('services');
                    }}
                    className="px-3.5 py-2 rounded-lg border border-[#E8DCF3] hover:bg-[#F3ECF9] text-xs font-semibold text-[#5B3278] shrink-0"
                  >
                    عرض
                  </button>
                </div>
              </CinematicStaggerItem>
            ))}
          </CinematicStaggerGrid>
        </div>
      </CinematicSection>

      {/* 7. How VÉLORA Works */}
      <CinematicSection className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
            كيف تعمل منصة VÉLORA؟
          </h2>
          <p className="text-sm text-[#5E4D6B]">
            أربع خطوات واضحة من اختيار القاعة حتى إرسال الدعوة واستقبال الضيوف
          </p>
        </div>
        <CinematicStaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '01', title: 'استكشف وقارن', desc: 'تصفح القاعات والمصورين والخدمات وافحص التواريخ المتاحة فورًا.' },
            { step: '02', title: 'احجز بأمان', desc: 'أرسل طلب حجزك ليتم فحص التاريخ ومنع أي تداخل مع حجوزات أخرى.' },
            { step: '03', title: 'تأكيد مزدوج', desc: 'توافق الجهة المقدمة للخدمة ثم الإدارة ليصبح حجزك مؤكدًا رسميًا.' },
            { step: '04', title: 'صمّم وشارك دعوتك', desc: 'أنشئ بطاقة دعوة خاصة وشارك رابطها للضيوف لتأكيد الحضور والتهاني.' },
          ].map((item, idx) => (
            <CinematicStaggerItem key={item.step} scatterIndex={idx}>
              <div className="velora-card h-full rounded-2xl p-5 space-y-2">
                <span className="inline-block font-mono text-xs font-bold text-[#C5A25D]">
                  STEP {item.step}
                </span>
                <h3 className="text-base font-bold text-[#24172E]">{item.title}</h3>
                <p className="text-xs text-[#5E4D6B] leading-relaxed">{item.desc}</p>
              </div>
            </CinematicStaggerItem>
          ))}
        </CinematicStaggerGrid>
      </CinematicSection>

      {/* 8. Provider Onboarding Callout */}
      <CinematicSection className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="velora-card rounded-3xl p-6 sm:p-10 bg-gradient-to-l from-[#FFFFFF] to-[#F3ECF9] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278]">
              <CheckCircle2 className="w-4 h-4" />
              <span>لأصحاب القاعات والمصورين ومقدمي خدمات الزفاف</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
              انضم إلى شبكة VÉLORA واستقبل حجوزات منظمة
            </h2>
            <p className="text-sm text-[#5E4D6B]">
              أنشئ حسابك، ارفع صور وألبومات أعمالك وعروضك، واستقبل طلبات العملاء بعد اعتماد الإدارة.
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('auth')}
            className="px-6 py-3.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-sm font-semibold shrink-0 transition-colors"
          >
            سجّل كمقدم خدمة
          </motion.button>
        </div>
      </CinematicSection>

      {/* 9. Complete Footer */}
      <footer className="border-t border-[#E8DCF3] bg-white pt-10 pb-20 lg:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <VeloraBrandMark size="sm" />
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              منصة VÉLORA المتكاملة لتنظيم حفلات الزفاف، القاعات، التصوير، تجهيزات الفرح، والدعوات الإلكترونية الفاخرة.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#24172E]">أقسام المنصة</h3>
            <ul className="space-y-1.5 text-xs text-[#5E4D6B]">
              <li><button type="button" onClick={() => onNavigate('venues')} className="hover:text-[#5B3278]">قاعات الأفراح</button></li>
              <li><button type="button" onClick={() => onNavigate('photographers')} className="hover:text-[#5B3278]">المصورون</button></li>
              <li><button type="button" onClick={() => onNavigate('services')} className="hover:text-[#5B3278]">الخدمات والتجهيزات</button></li>
              <li><button type="button" onClick={() => onNavigate('invitations')} className="hover:text-[#5B3278]">الدعوات الإلكترونية</button></li>
              <li><button type="button" onClick={() => onNavigate('find_wedding')} className="hover:text-[#5B3278]">اعثر على فرحك</button></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#24172E]">الحساب والحجوزات</h3>
            <ul className="space-y-1.5 text-xs text-[#5E4D6B]">
              <li><button type="button" onClick={() => onNavigate('workspace')} className="hover:text-[#5B3278]">مساحة فرحنا</button></li>
              <li><button type="button" onClick={() => onNavigate('bookings')} className="hover:text-[#5B3278]">متابعة حجوزاتي</button></li>
              <li><button type="button" onClick={() => onNavigate('packages')} className="hover:text-[#5B3278]">الباقات والاشتراكات</button></li>
              <li><button type="button" onClick={() => onNavigate('auth')} className="hover:text-[#5B3278]">تسجيل الدخول / حساب جديد</button></li>
              <li><button type="button" onClick={onOpenSampleInvitation} className="hover:text-[#5B3278]">نموذج دعوة مباشرة</button></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-sm font-bold text-[#24172E]">الإدارة والباقات</h3>
            <p className="text-xs text-[#5E4D6B]">
              إدارة الطلبات والمراجعات أو اختيار باقات الاشتراك للقاعات والمصورين والعروسين.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-xs font-semibold hover:bg-[#E8DCF3] transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>لوحة تحكم الإدارة</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('packages')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#5B3278] text-white text-xs font-semibold hover:bg-[#482461] transition-colors shadow-xs"
              >
                <Crown className="w-3.5 h-3.5 text-[#F5E6C8]" />
                <span>الباقات والاشتراكات</span>
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-5 border-t border-[#F0E7F8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#7C678D]">
          <span>© {new Date().getFullYear()} VÉLORA — جميع الحقوق محفوظة</span>
          <span>كل تفاصيل فرحتك تبدأ من هنا</span>
        </div>
      </footer>
    </div>
  );
};
