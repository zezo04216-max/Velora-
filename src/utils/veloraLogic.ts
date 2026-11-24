import type {
  BookingRecord,
  BookingStatus,
  CoupleAgreementItem,
  CoupleChecklistCategory,
  CouplePrepItem,
  CoupleTaskItem,
  CoupleWorkspaceRecord,
  ElectronicInvitationRecord,
  FindWeddingInput,
  InvitationDesignId,
  InvitationDesignSpec,
  InvitationRsvpRecord,
  InvitationStats,
  PhotographerRecord,
  ServiceCategoryKey,
  ServiceRecord,
  TargetEntityType,
  VenueRecord,
  WeddingDreamStyle,
  WeddingMatchPackage,
  WhatsAppMilestone,
} from '../types/velora.ts';

export const INVITATION_PHOTO_MESSAGE_AR =
  'لو التقطت صورة للعروسين أثناء الحفل، يسعدنا إرسالها على رقم التواصل التالي';

export const SERVICE_CATEGORIES: Array<{
  key: ServiceCategoryKey;
  labelAr: string;
  descriptionAr: string;
}> = [
  { key: 'decor', labelAr: 'الديكورات', descriptionAr: 'تصميم المساحات والإضاءة والطاولات الملكية' },
  { key: 'planning', labelAr: 'تنظيم الحفلات', descriptionAr: 'إدارة كاملة للجدول الزمني والتنسيق الميداني' },
  { key: 'flowers', labelAr: 'الزهور والورود', descriptionAr: 'تنسيقات ورود طبيعية وبوكيهات العروس الفاخرة' },
  { key: 'kosha', labelAr: 'الكوشة', descriptionAr: 'كوشات زفاف مصممة خصيصًا بطابع عصري وكلاسيكي' },
  { key: 'dresses', labelAr: 'الفساتين', descriptionAr: 'فساتين زفاف وخطوبة بأرقى دور الأزياء' },
  { key: 'makeup', labelAr: 'المكياج والتجميل', descriptionAr: 'خبيرات تجميل لإطلالة زفاف متألقة وثابتة' },
  { key: 'hair', labelAr: 'الكوافير', descriptionAr: 'تصفيف شعر احترافي وطرحات زفاف متقنة' },
  { key: 'cars', labelAr: 'السيارات', descriptionAr: 'سيارات زفاف فاخرة وكلاسيكية مع سائق خاص' },
  { key: 'music', labelAr: 'الموسيقى وفرق الزفاف', descriptionAr: 'زفة مصرية، لايف باند، ودي جي احترافي' },
  { key: 'catering', labelAr: 'البوفيه والضيافة', descriptionAr: 'بوفيهات راقية وحلويات وتورتات الزفاف' },
  { key: 'other', labelAr: 'تجهيزات أخرى', descriptionAr: 'بطاقات تذكارية، إضاءة ليزر، وضيافة متكاملة' },
];

export const INVITATION_DESIGNS: Record<InvitationDesignId, InvitationDesignSpec> = {
  royal: {
    id: 'royal',
    labelAr: 'ملكي',
    taglineAr: 'إطار بنفسجي ملكي عميق مع حواف ذهبية رصينة',
    tier: 'paid',
    priceEgp: 250,
    cardBg: 'linear-gradient(155deg, #4A2364 0%, #5B3278 58%, #3B1B52 100%)',
    cardBorder: '#C5A25D',
    accentColor: '#EAD4A0',
    headingColor: '#FFFFFF',
    bodyColor: '#F3ECF9',
    badgeBg: 'rgba(197, 162, 93, 0.2)',
    badgeText: '#F8E6BE',
    countdownBg: 'rgba(255, 255, 255, 0.1)',
    frameStyle: 'double_royal',
  },
  luxury: {
    id: 'luxury',
    labelAr: 'فاخر',
    taglineAr: 'عاجي ناعم بإطار بنفسجي مزدوج وتفاصيل شامبين',
    tier: 'free',
    priceEgp: 0,
    cardBg: 'linear-gradient(180deg, #FFFFFF 0%, #F7F1FC 100%)',
    cardBorder: '#5B3278',
    accentColor: '#C5A25D',
    headingColor: '#24172E',
    bodyColor: '#5E4D6B',
    badgeBg: '#F3ECF9',
    badgeText: '#5B3278',
    countdownBg: '#EFE5F8',
    frameStyle: 'velvet_edge',
  },
  romantic: {
    id: 'romantic',
    labelAr: 'رومانسي (ورود عاجية وزيتوني)',
    taglineAr: 'ورود عاجية وأوراق زيتون خضراء على خلفية كريمية بإطار ذهبي دافئ',
    tier: 'paid',
    priceEgp: 350,
    cardBg: 'linear-gradient(180deg, #FAF8F2 0%, #F5F1E6 100%)',
    cardBorder: '#D4C5A1',
    accentColor: '#B08D42',
    headingColor: '#3D5542',
    bodyColor: '#4D6151',
    badgeBg: 'rgba(61, 85, 66, 0.08)',
    badgeText: '#3D5542',
    countdownBg: 'rgba(255, 255, 255, 0.78)',
    frameStyle: 'silk_halo',
    bgImage: '/src/assets/images/ivory_roses_fullbleed_1795512118161.jpg',
  },
  classic: {
    id: 'classic',
    labelAr: 'كلاسيكي (كحلي بالورود)',
    taglineAr: 'إطار كحلي ملكي مزين بباقات الورود والخطوط الذهبية',
    tier: 'paid',
    priceEgp: 300,
    cardBg: 'linear-gradient(180deg, #FFFFFF 0%, #F4F6FA 100%)',
    cardBorder: '#3C4D72',
    accentColor: '#EAD4A0',
    headingColor: '#FFFFFF',
    bodyColor: '#EEF2F8',
    badgeBg: 'rgba(255, 255, 255, 0.16)',
    badgeText: '#FFFFFF',
    countdownBg: 'rgba(255, 255, 255, 0.14)',
    frameStyle: 'classic_arch',
    bgImage: '/assets/aistudio/navy-floral_1d2595c1.png',
  },
  modern: {
    id: 'modern',
    labelAr: 'عصري',
    taglineAr: 'تقسيم تحريري معاصر بخطوط هندسية جريئة',
    tier: 'free',
    priceEgp: 0,
    cardBg: 'linear-gradient(135deg, #FFFFFF 0%, #F5EFFB 100%)',
    cardBorder: '#5B3278',
    accentColor: '#5B3278',
    headingColor: '#1E1128',
    bodyColor: '#524260',
    badgeBg: '#5B3278',
    badgeText: '#FFFFFF',
    countdownBg: '#F3ECF9',
    frameStyle: 'modern_split',
  },
  floral: {
    id: 'floral',
    labelAr: 'بالورود (أزرق مائي)',
    taglineAr: 'ورق رخامي أبيض بزهور زرقاء مائية وزخارف ذهبية',
    tier: 'paid',
    priceEgp: 300,
    cardBg: 'linear-gradient(160deg, #FFFFFF 0%, #F7F9FC 100%)',
    cardBorder: '#3C5E8C',
    accentColor: '#2B4C7E',
    headingColor: '#1E3254',
    bodyColor: '#465B7A',
    badgeBg: 'rgba(60, 94, 140, 0.12)',
    badgeText: '#2B4C7E',
    countdownBg: 'rgba(255, 255, 255, 0.88)',
    frameStyle: 'botanical_crest',
    bgImage: '/assets/aistudio/blue-floral_9f0088a8.png',
  },
  minimal: {
    id: 'minimal',
    labelAr: 'بسيط وأنيق',
    taglineAr: 'مساحة بيضاء واسعة بخطوط رفيعة فائقة الرقي',
    tier: 'free',
    priceEgp: 0,
    cardBg: '#FFFFFF',
    cardBorder: '#E2D4EE',
    accentColor: '#5B3278',
    headingColor: '#24172E',
    bodyColor: '#6B5A78',
    badgeBg: '#FAF7FD',
    badgeText: '#5B3278',
    countdownBg: '#FAF7FD',
    frameStyle: 'minimal_gallery',
  },
};

export interface CountdownBreakdown {
  state: 'future' | 'live_now' | 'passed';
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  statusMessageAr: string;
}

export function computeCountdown(
  weddingDate: string,
  weddingTime = '19:00',
  nowMs = Date.now()
): CountdownBreakdown {
  const safeDate = (weddingDate || '').trim();
  const safeTime = /^\d{1,2}:\d{2}/.test((weddingTime || '').trim()) ? weddingTime.trim().slice(0, 5) : '19:00';
  const targetIso = `${safeDate}T${safeTime}:00`;
  const targetMs = Date.parse(targetIso);

  if (!Number.isFinite(targetMs)) {
    return {
      state: 'future',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      statusMessageAr: 'في انتظار تحديد موعد الحفل',
    };
  }

  const diffMs = targetMs - nowMs;
  // Treat a 5-hour window after start time as "live_now"
  if (diffMs <= 0 && diffMs >= -5 * 3600 * 1000) {
    return {
      state: 'live_now',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      statusMessageAr: 'اليوم تبدأ فرحتنا — أهلاً بكم في الحفل الآن',
    };
  }

  if (diffMs < -5 * 3600 * 1000) {
    return {
      state: 'passed',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      statusMessageAr: 'تمت الفرحة بحضوركم الكريم — شكرًا لمشاركتنا أجمل الذكريات',
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    state: 'future',
    days,
    hours,
    minutes,
    seconds,
    statusMessageAr: 'العد التنازلي ليوم الفرح',
  };
}

export function sanitizeSlug(input: string): string {
  const cleaned = (input || '')
    .toLowerCase()
    .trim()
    .replace(/[\u0600-\u06FF]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomTail = Math.random().toString(36).slice(2, 7);
  return cleaned ? `${cleaned}-${randomTail}` : `velora-${randomTail}`;
}

export function buildInvitationUrl(origin: string, slug: string): string {
  const base = (origin || 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/?invite=${encodeURIComponent(slug)}`;
}

/**
 * Prevents double-booking a venue or photographer on the same wedding date
 * when another booking is already approved/confirmed (dual-hold or confirmed).
 */
export function hasBookingConflict(
  existingBookings: Pick<BookingRecord, 'targetType' | 'targetId' | 'eventDate' | 'status'>[],
  targetType: TargetEntityType,
  targetId: string,
  eventDate: string
): boolean {
  if (targetType === 'service') {
    // Services like flowers/makeup/etc can serve multiple clients unless explicitly locked by a specific booking rule;
    // however venue and photographer MUST strictly block overlapping date holds/confirmations.
    return false;
  }
  const normalizedDate = eventDate.trim().slice(0, 10);
  const blockingStatuses: BookingStatus[] = ['confirmed', 'provider_approved', 'admin_approved'];
  return existingBookings.some(
    (b) =>
      b.targetType === targetType &&
      b.targetId === targetId &&
      b.eventDate.trim().slice(0, 10) === normalizedDate &&
      blockingStatuses.includes(b.status)
  );
}

/**
 * Dual-approval business rule:
 * A booking only reaches 'confirmed' when BOTH providerApproved and adminApproved are true.
 */
export function resolveNextBookingStatus(params: {
  providerApproved: boolean;
  adminApproved: boolean;
  rejected?: boolean;
  cancelled?: boolean;
}): BookingStatus {
  if (params.cancelled) return 'cancelled';
  if (params.rejected) return 'rejected';
  if (params.providerApproved && params.adminApproved) return 'confirmed';
  if (params.providerApproved) return 'provider_approved';
  if (params.adminApproved) return 'admin_approved';
  return 'pending';
}

export function getBookingStatusMeta(status: BookingStatus): {
  labelAr: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'confirmed':
      return {
        labelAr: 'تم التأكيد النهائي',
        bgClass: 'bg-[#5B3278]',
        textClass: 'text-white',
        borderClass: 'border-[#5B3278]',
      };
    case 'provider_approved':
      return {
        labelAr: 'موافقة مقدم الخدمة · بانتظار الإدارة',
        bgClass: 'bg-[#F3ECF9]',
        textClass: 'text-[#5B3278]',
        borderClass: 'border-[#C9B0E3]',
      };
    case 'admin_approved':
      return {
        labelAr: 'موافقة الإدارة · بانتظار مقدم الخدمة',
        bgClass: 'bg-[#FBF6EC]',
        textClass: 'text-[#7F6023]',
        borderClass: 'border-[#DFC793]',
      };
    case 'rejected':
      return {
        labelAr: 'مرفوض',
        bgClass: 'bg-[#FDF1F2]',
        textClass: 'text-[#9A2D3C]',
        borderClass: 'border-[#EAC1C7]',
      };
    case 'cancelled':
      return {
        labelAr: 'ملغي',
        bgClass: 'bg-[#F5F2F8]',
        textClass: 'text-[#6D5F79]',
        borderClass: 'border-[#DDD4E6]',
      };
    default:
      return {
        labelAr: 'قيد الانتظار',
        bgClass: 'bg-[#FAF7FD]',
        textClass: 'text-[#5E4D6B]',
        borderClass: 'border-[#E8DCF3]',
      };
  }
}

export function summarizeInvitationRsvps(rsvps: InvitationRsvpRecord[]): InvitationStats {
  let attendingCount = 0;
  let declinedCount = 0;
  let messagesCount = 0;
  for (const row of rsvps) {
    if (row.response === 'attending') {
      attendingCount += Math.max(1, Number(row.companionsCount) || 1);
    } else if (row.response === 'declined') {
      declinedCount += 1;
    }
    if ((row.congratulationMessage || '').trim().length > 0) {
      messagesCount += 1;
    }
  }
  return {
    totalGuests: rsvps.length,
    attendingCount,
    declinedCount,
    messagesCount,
  };
}

export function validateContactIdentifier(contact: string): {
  kind: 'email' | 'phone' | 'invalid';
  normalized: string;
} {
  const trimmed = (contact || '').trim();
  if (!trimmed) return { kind: 'invalid', normalized: '' };
  if (trimmed.includes('@')) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return emailOk
      ? { kind: 'email', normalized: trimmed.toLowerCase() }
      : { kind: 'invalid', normalized: '' };
  }
  const digits = trimmed.replace(/[\s\-()]/g, '');
  const phoneOk = /^\+?[0-9]{8,15}$/.test(digits);
  return phoneOk
    ? { kind: 'phone', normalized: digits }
    : { kind: 'invalid', normalized: '' };
}

export function formatEgp(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `${safe.toLocaleString('en-US')} ج.م`;
}

export function formatInvitationHeadline(inv: Pick<ElectronicInvitationRecord, 'groomName' | 'brideName'>): string {
  return `${inv.groomName} & ${inv.brideName}`;
}

export const WHATSAPP_MILESTONES: Array<{
  milestone: WhatsAppMilestone;
  hoursBefore: number;
  labelAr: string;
}> = [
  { milestone: '3d', hoursBefore: 72, labelAr: 'قبل الفرح بـ 3 أيام' },
  { milestone: '1d', hoursBefore: 24, labelAr: 'قبل الفرح بيوم واحد' },
  { milestone: '6h', hoursBefore: 6, labelAr: 'قبل الفرح بـ 6 ساعات' },
];

/**
 * Normalizes Egyptian & international phone numbers to international WhatsApp digits (without '+').
 * Examples:
 *  - '01012345678' -> '201012345678'
 *  - '+20 101 234 5678' -> '201012345678'
 *  - '00201012345678' -> '201012345678'
 */
export function normalizeEgyptWhatsAppPhone(raw: string): string | null {
  let digits = (raw || '').replace(/\D+/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (/^01[0125][0-9]{8}$/.test(digits)) {
    digits = `2${digits}`;
  } else if (/^1[0125][0-9]{8}$/.test(digits)) {
    digits = `20${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  return digits;
}

/**
 * Computes UTC offset in hours for Africa/Cairo on a given UTC timestamp (handles EET UTC+2 and EEST UTC+3 accurately).
 */
export function getCairoUtcOffsetHours(utcGuessMs: number): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date(utcGuessMs));
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tzPart.trim());
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hrs = Number(match[2]) || 0;
      const mins = Number(match[3]) || 0;
      return sign * (hrs + mins / 60);
    }
  } catch {
    // Fallback below
  }
  return 2;
}

/**
 * Converts a Cairo-local wedding date (YYYY-MM-DD) and time (HH:mm, default 19:00) into an exact UTC epoch ms.
 */
export function resolveCairoEventTimestamp(eventDate: string, weddingTime = '19:00'): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec((eventDate || '').trim().slice(0, 10));
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec((weddingTime || '').trim().slice(0, 5));
  const hour = timeMatch ? Math.min(23, Math.max(0, Number(timeMatch[1]))) : 19;
  const minute = timeMatch ? Math.min(59, Math.max(0, Number(timeMatch[2]))) : 0;

  const utcNominal = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset1 = getCairoUtcOffsetHours(utcNominal);
  const firstPass = utcNominal - offset1 * 3600 * 1000;
  const offset2 = getCairoUtcOffsetHours(firstPass);
  return utcNominal - offset2 * 3600 * 1000;
}

/**
 * Determines which milestone is currently due without contradictions:
 * - '3d': (24h, 72h] before wedding
 * - '1d': (6h, 24h] before wedding
 * - '6h': (0h, 6h] before wedding
 */
export function determineDueMilestones(eventTimestampMs: number, nowMs = Date.now()): WhatsAppMilestone[] {
  const diffHours = (eventTimestampMs - nowMs) / (3600 * 1000);
  if (!Number.isFinite(diffHours) || diffHours <= 0) {
    return [];
  }
  if (diffHours <= 6) {
    return ['6h'];
  }
  if (diffHours <= 24) {
    return ['1d'];
  }
  if (diffHours <= 72) {
    return ['3d'];
  }
  return [];
}

export function formatTimeArabic12h(time24: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time24 || '').trim().slice(0, 5));
  if (!m) return '7:00 مساءً';
  const h24 = Number(m[1]);
  const min = m[2];
  const period = h24 >= 12 ? 'مساءً' : 'صباحًا';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min} ${period}`;
}

export function buildWhatsAppReminderMessage(params: {
  milestone: WhatsAppMilestone;
  clientName: string;
  targetTitle: string;
  eventDate: string;
  eventTime: string;
}): string {
  const name = (params.clientName || 'عميلنا العزيز').trim();
  const venueOrService = (params.targetTitle || 'حجزك في VÉLORA').trim();
  const dateStr = (params.eventDate || '').trim();
  const timeStr = formatTimeArabic12h(params.eventTime || '19:00');

  if (params.milestone === '3d') {
    return [
      `أهلاً بك يا ${name} من VÉLORA 💜✨`,
      `اقترب أجمل أيام العمر! يتبقى *3 أيام* فقط على موعد زفافك المؤكد (${dateStr}).`,
      `📍 الحجز: ${venueOrService}`,
      `⏰ الموعد: الساعة ${timeStr} بتوقيت القاهرة`,
      `لأي تنسيق إضافي قبل الحفل، فريق VÉLORA جاهز لخدمتك دائمًا.`,
    ].join('\n');
  }

  if (params.milestone === '1d') {
    return [
      `غدًا ليلة العمر يا ${name}! 💍✨`,
      `تذكير من VÉLORA: يتبقى *يوم واحد* (24 ساعة) على موعدكم في ${venueOrService}.`,
      `📅 التاريخ: ${dateStr} · ⏰ الساعة ${timeStr}`,
      `ننصح بمراجعة تفاصيل الوصول وتنسيق المعازيم، وألف مبروك مقدمًا 💜`,
    ].join('\n');
  }

  return [
    `اليوم فرحتنا يا ${name}! 🎉🤍`,
    `تبقى *6 ساعات* فقط على انطلاق حفل زفافك في ${venueOrService} اليوم (${dateStr}) الساعة ${timeStr}.`,
    `نتمنى لكما ليلة لا تُنسى مليئة بالسعادة والبهجة — فريق VÉLORA معكم لحظة بلحظة 💜`,
  ].join('\n');
}

export const EGYPT_GOVERNORATES: string[] = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الدقهلية',
  'الشرقية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'مطروح',
  'شمال سيناء',
  'جنوب سيناء',
  'الوادي الجديد',
];

export function normalizeArabicText(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function getAllEgyptGovernoratesWithExtras(extras: string[] = []): string[] {
  const seen = new Set<string>(EGYPT_GOVERNORATES);
  for (const item of extras) {
    const clean = (item || '').trim();
    if (clean) seen.add(clean);
  }
  return Array.from(seen);
}

export const WEDDING_DREAM_STYLES: Array<{
  id: WeddingDreamStyle;
  labelAr: string;
  subtitleAr: string;
  keywords: string[];
}> = [
  {
    id: 'royal_palace',
    labelAr: 'فرح ملكي في قصر',
    subtitleAr: 'قاعات رخامية فخمة وكوشة أوبرالية وتفاصيل لؤلؤية',
    keywords: ['ملكي', 'قصر', 'أوركيد', 'كريستال', 'رخام', 'فخم', 'كلاسيك', 'أوبرا'],
  },
  {
    id: 'nile_garden',
    labelAr: 'حديقة مفتوحة وإطلالة نيلية',
    subtitleAr: 'أجواء غروب رومانسية على النيل أو فيلا حدائق',
    keywords: ['نيل', 'حديقة', 'تراس', 'مفتوحة', 'فيلا', 'غروب', 'ورود', 'لافندر'],
  },
  {
    id: 'modern_chic',
    labelAr: 'زفاف عصري أنيق',
    subtitleAr: 'إضاءة درامية نظيفة وتصوير تحريري معاصر',
    keywords: ['مودرن', 'عصري', 'سينمائي', 'تحريري', 'أبيض', 'حديث'],
  },
  {
    id: 'intimate_boutique',
    labelAr: 'حفل عائلي بوتيكي دافئ',
    subtitleAr: 'عدد مدعوين محدود بخصوصية عالية وتنسيق مريح',
    keywords: ['بوتيك', 'عائلي', 'فيلا', 'دافئ', 'بوهيمي', 'خاص'],
  },
  {
    id: 'classic_heritage',
    labelAr: 'زفة كلاسيكية وأجواء تراثية',
    subtitleAr: 'تنظيم متكامل مع زفة تقليدية وضيافة فندقية أصيلة',
    keywords: ['كلاسيك', 'زفة', 'ضيافة', 'تراثي', 'بوفيه', 'ذهبي'],
  },
];

export const COUPLE_PREP_CATEGORIES: Array<{
  category: CoupleChecklistCategory;
  labelAr: string;
  defaultAllocatedEgp: number;
}> = [
  { category: 'venue', labelAr: 'قاعة الفرح', defaultAllocatedEgp: 75000 },
  { category: 'photographer', labelAr: 'المصور وتوثيق الفيديو', defaultAllocatedEgp: 18000 },
  { category: 'kosha', labelAr: 'الكوشة وتصميم الممر', defaultAllocatedEgp: 22000 },
  { category: 'decor', labelAr: 'الديكور والإضاءة', defaultAllocatedEgp: 15000 },
  { category: 'flowers', labelAr: 'الزهور وبوكيه العروس', defaultAllocatedEgp: 8000 },
  { category: 'dress', labelAr: 'فستان الزفاف والطرحة', defaultAllocatedEgp: 25000 },
  { category: 'suit', labelAr: 'بدلة العريس والإكسسوارات', defaultAllocatedEgp: 12000 },
  { category: 'makeup_hair', labelAr: 'المكياج والكوافير', defaultAllocatedEgp: 14000 },
  { category: 'music', labelAr: 'الموسيقى والزفة والدي جي', defaultAllocatedEgp: 10000 },
  { category: 'catering', labelAr: 'البوفيه وتورتة الفرح', defaultAllocatedEgp: 28000 },
  { category: 'invitations', labelAr: 'الدعوات الإلكترونية الذكية', defaultAllocatedEgp: 0 },
];

export function createDefaultCoupleWorkspace(userId: string, coupleName?: string): CoupleWorkspaceRecord {
  const defaultDate = new Date(Date.now() + 45 * 86400 * 1000).toISOString().slice(0, 10);
  const prepItems: CouplePrepItem[] = COUPLE_PREP_CATEGORIES.map((c, idx) => ({
    id: `prep-${c.category}-${idx + 1}`,
    category: c.category,
    labelAr: c.labelAr,
    vendorName: '',
    allocatedEgp: c.defaultAllocatedEgp,
    paidEgp: 0,
    status: c.category === 'invitations' ? 'in_progress' : 'pending',
    notes: '',
  }));

  const tasks: CoupleTaskItem[] = [
    {
      id: 'task-1',
      titleAr: 'تحديد الميزانية الإجمالية وعدد المدعوين المبدئي',
      horizonAr: 'الخطوة الأولى',
      done: true,
      dueDate: '',
    },
    {
      id: 'task-2',
      titleAr: 'مقارنة 3 قاعات ومصورين متاحين في تاريخ الفرح',
      horizonAr: 'قبل الفرح بـ 3 أشهر',
      done: false,
      dueDate: '',
    },
    {
      id: 'task-3',
      titleAr: 'حجز القاعة والمصور عبر نظام الاعتماد المزدوج',
      horizonAr: 'قبل الفرح بشهرين',
      done: false,
      dueDate: '',
    },
    {
      id: 'task-4',
      titleAr: 'بروفة فستان الزفاف والبدلة وتأكيد الكوافير والمكياج',
      horizonAr: 'قبل الفرح بشهر',
      done: false,
      dueDate: '',
    },
    {
      id: 'task-5',
      titleAr: 'إصدار الدعوة الإلكترونية الذكية ومتابعة ردود الضيوف',
      horizonAr: 'قبل الفرح بـ 3 أسابيع',
      done: false,
      dueDate: '',
    },
    {
      id: 'task-6',
      titleAr: 'مراجعة تذكيرات الواتساب وتأكيد جدول دخول العروسين',
      horizonAr: 'قبل الفرح بـ 3 أيام',
      done: false,
      dueDate: '',
    },
  ];

  const agreements: CoupleAgreementItem[] = [];

  return {
    userId,
    coupleTitle: coupleName?.trim() ? `فرح ${coupleName.trim()}` : 'مساحة فرحنا في VÉLORA',
    governorate: 'القاهرة',
    weddingDate: defaultDate,
    guestsCount: 220,
    totalBudgetEgp: 220000,
    dreamStyle: 'royal_palace',
    prepItems,
    tasks,
    agreements,
    compareMode: 'venue',
    comparedIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export function computeEffectivePrice(basePrice: number, discountPercent = 0): number {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  const safeDisc = Math.min(90, Math.max(0, Number(discountPercent) || 0));
  return Math.round(safeBase * (1 - safeDisc / 100));
}

export interface WorkspaceBudgetSummary {
  totalBudgetEgp: number;
  allocatedTotalEgp: number;
  paidTotalEgp: number;
  liveBookingsCommittedEgp: number;
  spentTotalEgp: number;
  remainingEgp: number;
  spentPercent: number;
  overBudget: boolean;
}

export function computeWorkspaceBudgetSummary(
  workspace: Pick<CoupleWorkspaceRecord, 'totalBudgetEgp' | 'prepItems'>,
  bookings: Pick<BookingRecord, 'status' | 'estimatedTotalEgp'>[]
): WorkspaceBudgetSummary {
  const totalBudgetEgp = Math.max(0, Number(workspace.totalBudgetEgp) || 0);
  const allocatedTotalEgp = workspace.prepItems.reduce(
    (sum, item) => sum + Math.max(0, Number(item.allocatedEgp) || 0),
    0
  );
  const paidTotalEgp = workspace.prepItems.reduce(
    (sum, item) => sum + Math.max(0, Number(item.paidEgp) || 0),
    0
  );
  const liveBookingsCommittedEgp = bookings
    .filter((b) => b.status !== 'rejected' && b.status !== 'cancelled')
    .reduce((sum, b) => sum + Math.max(0, Number(b.estimatedTotalEgp) || 0), 0);

  // Use whichever reflects actual real-world commitment best without double counting: paid prep items + live confirmed/pending bookings not yet recorded as paid, or max of paid vs live
  const spentTotalEgp = Math.max(paidTotalEgp, paidTotalEgp + Math.max(0, liveBookingsCommittedEgp - paidTotalEgp));
  const remainingEgp = totalBudgetEgp - spentTotalEgp;
  const spentPercent =
    totalBudgetEgp > 0 ? Math.min(100, Math.round((spentTotalEgp / totalBudgetEgp) * 100)) : 0;

  return {
    totalBudgetEgp,
    allocatedTotalEgp,
    paidTotalEgp,
    liveBookingsCommittedEgp,
    spentTotalEgp,
    remainingEgp,
    spentPercent,
    overBudget: remainingEgp < 0,
  };
}

export function matchesGovernorateStrict(
  entityCity: string,
  entityArea: string,
  targetGovernorate: string
): boolean {
  const normTarget = normalizeArabicText(targetGovernorate);
  if (!normTarget) return true;
  const normCity = normalizeArabicText(entityCity);
  const normArea = normalizeArabicText(entityArea);
  return (
    normCity === normTarget ||
    normCity.includes(normTarget) ||
    normArea.includes(normTarget)
  );
}

function scoreCityMatch(entityCity: string, entityArea: string, targetGovernorate: string): number {
  return matchesGovernorateStrict(entityCity, entityArea, targetGovernorate) ? 40 : 0;
}

function scoreStyleKeywords(textBlob: string, dreamStyle: WeddingDreamStyle): number {
  const spec = WEDDING_DREAM_STYLES.find((s) => s.id === dreamStyle);
  if (!spec) return 0;
  let score = 0;
  for (const kw of spec.keywords) {
    if (textBlob.includes(kw)) score += 10;
  }
  return score;
}

export function buildWeddingMatchPackages(
  input: FindWeddingInput,
  catalog: {
    venues: VenueRecord[];
    photographers: PhotographerRecord[];
    services: ServiceRecord[];
    reservedVenueIds?: string[];
    reservedPhotographerIds?: string[];
  }
): WeddingMatchPackage[] {
  const budget = Math.max(10000, Number(input.budgetEgp) || 150000);
  const guests = Math.max(20, Number(input.guestsCount) || 150);
  const reservedVenues = new Set(catalog.reservedVenueIds || []);
  const reservedPhotos = new Set(catalog.reservedPhotographerIds || []);

  // STRICT 100% governorate filtering: only items located in the selected governorate can appear
  const availableVenues = catalog.venues
    .filter(
      (v) =>
        !reservedVenues.has(v.id) &&
        matchesGovernorateStrict(v.city, v.area, input.governorate)
    )
    .map((v) => {
      const effectivePrice = computeEffectivePrice(v.pricePerEvent, v.discountPercent);
      const cityScore = scoreCityMatch(v.city, v.area, input.governorate);
      const capacityExact = guests >= v.capacityMin && guests <= v.capacityMax;
      const capacityScore = capacityExact
        ? 35
        : guests < v.capacityMin
        ? Math.max(0, 20 - Math.round((v.capacityMin - guests) / 15))
        : Math.max(-25, 10 - Math.round((guests - v.capacityMax) / 10));
      const styleScore = scoreStyleKeywords(
        `${v.titleAr} ${v.subtitleAr} ${v.descriptionAr} ${v.decorStyles.join(' ')}`,
        input.dreamStyle
      );
      const ratingScore = Math.round((v.avgRating || 4.5) * 4);
      const budgetPenalty = effectivePrice > budget * 0.72 ? -30 : 12;
      return {
        venue: v,
        effectivePrice,
        capacityExact,
        cityMatch: cityScore > 0,
        totalScore: cityScore + capacityScore + styleScore + ratingScore + budgetPenalty + (v.featured ? 8 : 0),
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  const availablePhotographers = catalog.photographers
    .filter(
      (p) =>
        !reservedPhotos.has(p.id) &&
        matchesGovernorateStrict(p.city, p.studioLocation, input.governorate)
    )
    .map((p) => {
      const effectivePrice = computeEffectivePrice(p.startingPrice, p.discountPercent);
      const cityScore = scoreCityMatch(p.city, p.studioLocation, input.governorate);
      const styleScore = scoreStyleKeywords(
        `${p.displayName} ${p.specialtyAr} ${p.bioAr} ${p.shootingTypes.join(' ')}`,
        input.dreamStyle
      );
      const ratingScore = Math.round((p.avgRating || 4.5) * 4) + Math.min(10, p.yearsExperience || 0);
      return {
        photographer: p,
        effectivePrice,
        cityMatch: cityScore > 0,
        totalScore: cityScore + styleScore + ratingScore + (p.featured ? 8 : 0),
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  const scoredServices = catalog.services
    .filter((s) => matchesGovernorateStrict(s.city, s.area, input.governorate))
    .map((s) => {
      const effectivePrice = computeEffectivePrice(s.startingPrice, s.discountPercent);
      const cityScore = scoreCityMatch(s.city, s.area, input.governorate);
      const styleScore = scoreStyleKeywords(
        `${s.titleAr} ${s.descriptionAr} ${s.packagesAr.join(' ')}`,
        input.dreamStyle
      );
      return {
        service: s,
        effectivePrice,
        totalScore: cityScore + styleScore + Math.round((s.avgRating || 4.5) * 3) + (s.featured ? 6 : 0),
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  // If no venues, photographers, OR services exist in this governorate, return zero packages
  if (availableVenues.length === 0 && availablePhotographers.length === 0 && scoredServices.length === 0) {
    return [];
  }

  const pickServicesWithinCap = (maxCap: number, maxCount: number): ServiceRecord[] => {
    const picked: ServiceRecord[] = [];
    const seenCategories = new Set<string>();
    let running = 0;
    for (const entry of scoredServices) {
      if (picked.length >= maxCount) break;
      if (seenCategories.has(entry.service.category)) continue;
      if (running + entry.effectivePrice <= maxCap || picked.length === 0) {
        if (running + entry.effectivePrice <= maxCap) {
          picked.push(entry.service);
          seenCategories.add(entry.service.category);
          running += entry.effectivePrice;
        }
      }
    }
    return picked;
  };

  const makeReasons = (
    vEntry: (typeof availableVenues)[number] | undefined,
    pEntry: (typeof availablePhotographers)[number] | undefined,
    services: ServiceRecord[]
  ): string[] => {
    const reasons: string[] = [];
    if (input.weddingDate) reasons.push(`متاح للحجز بتاريخ ${input.weddingDate} دون تعارض مواعيد`);
    if (vEntry?.cityMatch) reasons.push(`موقع مناسب داخل نطاق محافظة ${input.governorate}`);
    if (vEntry?.capacityExact) {
      reasons.push(
        `سعة القاعة (${vEntry.venue.capacityMin}–${vEntry.venue.capacityMax} فرد) تستوعب ${guests} مدعوًا بأريحية`
      );
    }
    if (pEntry) reasons.push(`تغطية تصوير احترافية (${pEntry.photographer.specialtyAr})`);
    if (services.length > 0) reasons.push(`يشمل ${services.length} خدمات تجهيز متناسقة مع طابع الحفل`);
    return reasons;
  };

  const packages: WeddingMatchPackage[] = [];

  // 1) Ideal balanced package within budget
  const idealVenue =
    availableVenues.find((v) => v.effectivePrice <= budget * 0.65) || availableVenues[0];
  const venueCost1 = idealVenue?.effectivePrice || 0;
  const idealPhoto =
    availablePhotographers.find((p) => venueCost1 + p.effectivePrice <= budget * 0.85) ||
    availablePhotographers[0];
  const photoCost1 = idealPhoto?.effectivePrice || 0;
  const idealServices = pickServicesWithinCap(Math.max(0, budget - venueCost1 - photoCost1), 2);
  const total1 =
    venueCost1 +
    photoCost1 +
    idealServices.reduce((sum, s) => sum + computeEffectivePrice(s.startingPrice, s.discountPercent), 0);

  packages.push({
    tier: 'ideal',
    tierLabelAr: 'الباقة المثالية المتوازنة',
    matchSummaryAr: 'أفضل توازن بين القاعة والمصور والخدمات المكملة وفق ميزانيتك وعدد المدعوين.',
    venue: idealVenue?.venue || null,
    photographer: idealPhoto?.photographer || null,
    services: idealServices,
    estimatedTotalEgp: total1,
    remainingBudgetEgp: budget - total1,
    withinBudget: total1 <= budget,
    reasonsAr: makeReasons(idealVenue, idealPhoto, idealServices),
  });

  // 2) Smart Value package (lowest combined price among available options)
  const cheapestVenue = [...availableVenues].sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
  const cheapestPhoto = [...availablePhotographers].sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
  const cheapestService = [...scoredServices].sort((a, b) => a.effectivePrice - b.effectivePrice)[0]?.service;
  const smartServices = cheapestService && (cheapestVenue?.effectivePrice || 0) + (cheapestPhoto?.effectivePrice || 0) + computeEffectivePrice(cheapestService.startingPrice, cheapestService.discountPercent) <= budget
    ? [cheapestService]
    : [];
  const total2 =
    (cheapestVenue?.effectivePrice || 0) +
    (cheapestPhoto?.effectivePrice || 0) +
    smartServices.reduce((sum, s) => sum + computeEffectivePrice(s.startingPrice, s.discountPercent), 0);

  if (
    cheapestVenue?.venue.id !== idealVenue?.venue.id ||
    cheapestPhoto?.photographer.id !== idealPhoto?.photographer.id
  ) {
    packages.push({
      tier: 'smart_value',
      tierLabelAr: 'خيار التوفير الذكي',
      matchSummaryAr: 'تركيبة عملية تحفظ أكبر فائض من ميزانيتك لتجهيزات الفستان والبدلة وشهر العسل.',
      venue: cheapestVenue?.venue || null,
      photographer: cheapestPhoto?.photographer || null,
      services: smartServices,
      estimatedTotalEgp: total2,
      remainingBudgetEgp: budget - total2,
      withinBudget: total2 <= budget,
      reasonsAr: makeReasons(cheapestVenue, cheapestPhoto, smartServices),
    });
  }

  // 3) Luxury showcase package (highest rated & featured style match)
  const luxuryVenue =
    availableVenues.find((v) => v.venue.featured && v.venue.id !== idealVenue?.venue.id) ||
    availableVenues[0];
  const luxuryPhoto =
    availablePhotographers.find((p) => p.photographer.featured && p.photographer.id !== idealPhoto?.photographer.id) ||
    availablePhotographers[0];
  const luxuryServices = pickServicesWithinCap(Math.max(15000, budget - (luxuryVenue?.effectivePrice || 0) - (luxuryPhoto?.effectivePrice || 0)), 3);
  const total3 =
    (luxuryVenue?.effectivePrice || 0) +
    (luxuryPhoto?.effectivePrice || 0) +
    luxuryServices.reduce((sum, s) => sum + computeEffectivePrice(s.startingPrice, s.discountPercent), 0);

  if (
    luxuryVenue?.venue.id !== idealVenue?.venue.id ||
    luxuryPhoto?.photographer.id !== idealPhoto?.photographer.id ||
    luxuryServices.length !== idealServices.length
  ) {
    packages.push({
      tier: 'luxury_fit',
      tierLabelAr: 'الترشيح الفاخر المتكامل',
      matchSummaryAr: 'أعلى القاعات والمصورين تقييمًا مع باقة كوشة وتنسيق كاملة لطابع حفل استثنائي.',
      venue: luxuryVenue?.venue || null,
      photographer: luxuryPhoto?.photographer || null,
      services: luxuryServices,
      estimatedTotalEgp: total3,
      remainingBudgetEgp: budget - total3,
      withinBudget: total3 <= budget,
      reasonsAr: makeReasons(luxuryVenue, luxuryPhoto, luxuryServices),
    });
  }

  return packages;
}


