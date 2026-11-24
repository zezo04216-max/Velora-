import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INVITATION_DESIGNS,
  INVITATION_PHOTO_MESSAGE_AR,
  SERVICE_CATEGORIES,
  buildInvitationUrl,
  computeCountdown,
  hasBookingConflict,
  resolveNextBookingStatus,
  sanitizeSlug,
  summarizeInvitationRsvps,
  validateContactIdentifier,
} from './veloraLogic.ts';

test('INVITATION_DESIGNS defines all 7 distinct card templates', () => {
  const ids = Object.keys(INVITATION_DESIGNS);
  assert.deepEqual(ids.sort(), [
    'classic',
    'floral',
    'luxury',
    'minimal',
    'modern',
    'romantic',
    'royal',
  ]);
  for (const id of ids) {
    const spec = INVITATION_DESIGNS[id as keyof typeof INVITATION_DESIGNS];
    assert.ok(spec.labelAr.length > 0);
    assert.ok(spec.cardBg.length > 0);
    assert.ok(spec.frameStyle.length > 0);
  }
});

test('SERVICE_CATEGORIES covers all 11 required wedding service categories', () => {
  assert.equal(SERVICE_CATEGORIES.length, 11);
  const labels = SERVICE_CATEGORIES.map((c) => c.labelAr);
  for (const required of [
    'الديكورات',
    'تنظيم الحفلات',
    'الزهور والورود',
    'الكوشة',
    'الفساتين',
    'المكياج والتجميل',
    'الكوافير',
    'السيارات',
    'الموسيقى وفرق الزفاف',
    'البوفيه والضيافة',
    'تجهيزات أخرى',
  ]) {
    assert.ok(labels.includes(required), `Missing category: ${required}`);
  }
});

test('hasBookingConflict blocks overlapping confirmed or dual-hold dates on venues and photographers', () => {
  const bookings = [
    { targetType: 'venue' as const, targetId: 'v-1', eventDate: '2026-10-15', status: 'confirmed' as const },
    { targetType: 'venue' as const, targetId: 'v-2', eventDate: '2026-10-16', status: 'rejected' as const },
    { targetType: 'photographer' as const, targetId: 'p-1', eventDate: '2026-10-20', status: 'provider_approved' as const },
  ];

  assert.equal(hasBookingConflict(bookings, 'venue', 'v-1', '2026-10-15'), true);
  assert.equal(hasBookingConflict(bookings, 'venue', 'v-1', '2026-10-18'), false);
  assert.equal(hasBookingConflict(bookings, 'venue', 'v-2', '2026-10-16'), false);
  assert.equal(hasBookingConflict(bookings, 'photographer', 'p-1', '2026-10-20'), true);
});

test('resolveNextBookingStatus requires BOTH provider and admin approval before confirmation', () => {
  assert.equal(resolveNextBookingStatus({ providerApproved: false, adminApproved: false }), 'pending');
  assert.equal(resolveNextBookingStatus({ providerApproved: true, adminApproved: false }), 'provider_approved');
  assert.equal(resolveNextBookingStatus({ providerApproved: false, adminApproved: true }), 'admin_approved');
  assert.equal(resolveNextBookingStatus({ providerApproved: true, adminApproved: true }), 'confirmed');
  assert.equal(resolveNextBookingStatus({ providerApproved: true, adminApproved: true, rejected: true }), 'rejected');
  assert.equal(resolveNextBookingStatus({ providerApproved: true, adminApproved: false, cancelled: true }), 'cancelled');
});

test('computeCountdown handles future, live_now, and passed states cleanly', () => {
  const now = Date.parse('2026-11-23T15:00:00');
  const future = computeCountdown('2026-11-25', '15:00', now);
  assert.equal(future.state, 'future');
  assert.equal(future.days, 2);

  const live = computeCountdown('2026-11-23', '14:00', now);
  assert.equal(live.state, 'live_now');

  const past = computeCountdown('2026-11-20', '19:00', now);
  assert.equal(past.state, 'passed');
});

test('summarizeInvitationRsvps totals guests, companions, declines, and messages accurately', () => {
  const stats = summarizeInvitationRsvps([
    {
      id: '1',
      invitationId: 'inv-1',
      guestName: 'أحمد',
      guestPhone: '01012345678',
      response: 'attending',
      companionsCount: 2,
      congratulationMessage: 'ألف مبروك',
      createdAt: '',
    },
    {
      id: '2',
      invitationId: 'inv-1',
      guestName: 'سارة',
      guestPhone: '01099887766',
      response: 'declined',
      companionsCount: 1,
      congratulationMessage: 'تمنياتي بالسعادة',
      createdAt: '',
    },
  ]);

  assert.equal(stats.totalGuests, 2);
  assert.equal(stats.attendingCount, 2);
  assert.equal(stats.declinedCount, 1);
  assert.equal(stats.messagesCount, 2);
  assert.ok(INVITATION_PHOTO_MESSAGE_AR.includes('لو التقطت صورة للعروسين أثناء الحفل'));
});

test('validateContactIdentifier supports both email and phone registration', () => {
  assert.equal(validateContactIdentifier('Bride@Velora.eg').kind, 'email');
  assert.equal(validateContactIdentifier('+201012345678').kind, 'phone');
  assert.equal(validateContactIdentifier('bad').kind, 'invalid');

  const slug = sanitizeSlug('Karim & Nour');
  assert.ok(slug.startsWith('karim-nour-'));
  assert.equal(buildInvitationUrl('https://velora.app/', 'karim-nour'), 'https://velora.app/?invite=karim-nour');
});

import {
  buildWhatsAppReminderMessage,
  determineDueMilestones,
  normalizeEgyptWhatsAppPhone,
  resolveCairoEventTimestamp,
} from './veloraLogic.ts';

test('normalizeEgyptWhatsAppPhone converts local and formatted numbers to E.164 digits', () => {
  assert.equal(normalizeEgyptWhatsAppPhone('01012345678'), '201012345678');
  assert.equal(normalizeEgyptWhatsAppPhone('+20 112 345 6789'), '201123456789');
  assert.equal(normalizeEgyptWhatsAppPhone('00201234567890'), '201234567890');
  assert.equal(normalizeEgyptWhatsAppPhone('12345'), null);
});

test('resolveCairoEventTimestamp and determineDueMilestones trigger exact 3d, 1d, and 6h windows', () => {
  // Winter Cairo time (EET = UTC+2): 2026-12-20 19:00 Cairo == 2026-12-20T17:00:00Z
  const eventMs = resolveCairoEventTimestamp('2026-12-20', '19:00');
  assert.equal(eventMs, Date.parse('2026-12-20T17:00:00Z'));

  if (eventMs !== null) {
    assert.deepEqual(determineDueMilestones(eventMs, eventMs - 80 * 3600 * 1000), []);
    assert.deepEqual(determineDueMilestones(eventMs, eventMs - 70 * 3600 * 1000), ['3d']);
    assert.deepEqual(determineDueMilestones(eventMs, eventMs - 20 * 3600 * 1000), ['1d']);
    assert.deepEqual(determineDueMilestones(eventMs, eventMs - 5 * 3600 * 1000), ['6h']);
    assert.deepEqual(determineDueMilestones(eventMs, eventMs + 1000), []);
  }
});

test('buildWhatsAppReminderMessage includes client name, venue/service, and milestone phrase', () => {
  const msg3d = buildWhatsAppReminderMessage({
    milestone: '3d',
    clientName: 'سلمى حسام',
    targetTitle: 'قصر الأوركيد الملكي',
    eventDate: '2026-12-20',
    eventTime: '19:00',
  });
  assert.ok(msg3d.includes('سلمى حسام'));
  assert.ok(msg3d.includes('3 أيام'));
  assert.ok(msg3d.includes('قصر الأوركيد الملكي'));

  const msg6h = buildWhatsAppReminderMessage({
    milestone: '6h',
    clientName: 'محمد',
    targetTitle: 'تراس ليالينا',
    eventDate: '2026-12-20',
    eventTime: '20:00',
  });
  assert.ok(msg6h.includes('6 ساعات'));
  assert.ok(msg6h.includes('8:00 مساءً'));
});

import {
  buildWeddingMatchPackages,
  computeWorkspaceBudgetSummary,
  createDefaultCoupleWorkspace,
} from './veloraLogic.ts';

test('createDefaultCoupleWorkspace and computeWorkspaceBudgetSummary track spent and remaining budget accurately', () => {
  const ws = createDefaultCoupleWorkspace('usr-1', 'أحمد وسلمى');
  assert.equal(ws.coupleTitle, 'فرح أحمد وسلمى');
  assert.ok(ws.prepItems.length >= 10);
  assert.ok(ws.tasks.length >= 5);

  ws.totalBudgetEgp = 200000;
  ws.prepItems[0].paidEgp = 40000;
  ws.prepItems[1].paidEgp = 10000;

  const summary = computeWorkspaceBudgetSummary(ws, [
    { status: 'confirmed', estimatedTotalEgp: 70000 },
    { status: 'cancelled', estimatedTotalEgp: 90000 },
  ]);

  assert.equal(summary.paidTotalEgp, 50000);
  assert.equal(summary.liveBookingsCommittedEgp, 70000);
  assert.equal(summary.spentTotalEgp, 70000);
  assert.equal(summary.remainingEgp, 130000);
  assert.equal(summary.overBudget, false);
});

test('buildWeddingMatchPackages filters reserved dates and matches budget and city', () => {
  const packages = buildWeddingMatchPackages(
    {
      governorate: 'القاهرة',
      weddingDate: '2026-12-20',
      budgetEgp: 130000,
      guestsCount: 250,
      dreamStyle: 'nile_garden',
    },
    {
      venues: [
        {
          id: 'v-reserved',
          ownerId: 'u1',
          ownerName: 'أ',
          titleAr: 'قصر محجوز',
          subtitleAr: 'نيل',
          city: 'القاهرة',
          area: 'الزمالك',
          address: '',
          mapUrl: '',
          capacityMin: 150,
          capacityMax: 400,
          pricePerEvent: 80000,
          discountPercent: 0,
          workingHours: '',
          decorStyles: ['نيل'],
          features: [],
          descriptionAr: '',
          coverImage: '',
          galleryImages: [],
          videoUrl: '',
          status: 'approved',
          featured: true,
          avgRating: 5,
          reviewsCount: 3,
          createdAt: '',
        },
        {
          id: 'v-open',
          ownerId: 'u1',
          ownerName: 'أ',
          titleAr: 'تراس النيل المفتوح',
          subtitleAr: 'حديقة نيلية',
          city: 'القاهرة',
          area: 'الزمالك',
          address: '',
          mapUrl: '',
          capacityMin: 100,
          capacityMax: 320,
          pricePerEvent: 75000,
          discountPercent: 10,
          workingHours: '',
          decorStyles: ['حديقة نيلية'],
          features: [],
          descriptionAr: '',
          coverImage: '',
          galleryImages: [],
          videoUrl: '',
          status: 'approved',
          featured: true,
          avgRating: 4.9,
          reviewsCount: 2,
          createdAt: '',
        },
      ],
      photographers: [
        {
          id: 'p-open',
          ownerId: 'u2',
          displayName: 'كريم المنصور',
          specialtyAr: 'تصوير أفراح سينمائي',
          city: 'القاهرة',
          studioLocation: 'الزمالك',
          yearsExperience: 8,
          workingHours: '',
          startingPrice: 18000,
          discountPercent: 0,
          bioAr: 'تصوير حدائق وغروب',
          equipmentAr: '',
          shootingTypes: ['فوتو سيشن'],
          avatarUrl: '',
          coverImage: '',
          videoReelUrl: '',
          albums: [],
          status: 'approved',
          featured: true,
          avgRating: 5,
          reviewsCount: 4,
          createdAt: '',
        },
      ],
      services: [
        {
          id: 's-1',
          ownerId: 'u3',
          providerName: 'لافندر',
          category: 'kosha',
          titleAr: 'كوشة ورود طبيعية',
          city: 'القاهرة',
          area: 'المعادي',
          startingPrice: 20000,
          discountPercent: 0,
          workingHours: '',
          descriptionAr: 'حديقة',
          packagesAr: [],
          coverImage: '',
          galleryImages: [],
          videoUrl: '',
          status: 'approved',
          featured: true,
          avgRating: 4.8,
          reviewsCount: 1,
          createdAt: '',
        },
      ],
      reservedVenueIds: ['v-reserved'],
      reservedPhotographerIds: [],
    }
  );

  assert.ok(packages.length >= 1);
  assert.equal(packages[0].venue?.id, 'v-open');
  assert.equal(packages[0].photographer?.id, 'p-open');
  assert.equal(packages[0].withinBudget, true);

  // Strict governorate filtering: choosing Aswan with Cairo-only catalog must return 0 packages
  const aswanPackages = buildWeddingMatchPackages(
    {
      governorate: 'أسوان',
      weddingDate: '2026-12-20',
      budgetEgp: 130000,
      guestsCount: 250,
      dreamStyle: 'nile_garden',
    },
    {
      venues: [
        {
          id: 'v-open',
          ownerId: 'u1',
          ownerName: 'أ',
          titleAr: 'تراس النيل المفتوح',
          subtitleAr: 'حديقة نيلية',
          city: 'القاهرة',
          area: 'الزمالك',
          address: '',
          mapUrl: '',
          capacityMin: 100,
          capacityMax: 320,
          pricePerEvent: 75000,
          discountPercent: 10,
          workingHours: '',
          decorStyles: ['حديقة نيلية'],
          features: [],
          descriptionAr: '',
          coverImage: '',
          galleryImages: [],
          videoUrl: '',
          status: 'approved',
          featured: true,
          avgRating: 4.9,
          reviewsCount: 2,
          createdAt: '',
        },
      ],
      photographers: [],
      services: [],
      reservedVenueIds: [],
      reservedPhotographerIds: [],
    }
  );
  assert.equal(aswanPackages.length, 0);
});

import { EGYPT_GOVERNORATES, matchesGovernorateStrict } from './veloraLogic.ts';

test('EGYPT_GOVERNORATES includes all 27 Egyptian governorates with strict matching', () => {
  assert.equal(EGYPT_GOVERNORATES.length, 27);
  assert.ok(EGYPT_GOVERNORATES.includes('القاهرة'));
  assert.ok(EGYPT_GOVERNORATES.includes('أسوان'));
  assert.ok(EGYPT_GOVERNORATES.includes('الأقصر'));
  assert.ok(EGYPT_GOVERNORATES.includes('مطروح'));
  assert.equal(matchesGovernorateStrict('القاهرة', '', 'القاهرة'), true);
  assert.equal(matchesGovernorateStrict('القاهرة', '', 'الجيزة'), false);
});

test('INVITATION_DESIGNS defines both free and paid card tiers with explicit EGP pricing', () => {
  const designs = Object.values(INVITATION_DESIGNS);
  const freeDesigns = designs.filter((d) => d.tier === 'free' && d.priceEgp === 0);
  const paidDesigns = designs.filter((d) => d.tier === 'paid' && d.priceEgp > 0);
  assert.ok(freeDesigns.length >= 2);
  assert.ok(paidDesigns.length >= 3);
});



