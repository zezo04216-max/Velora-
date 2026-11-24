import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  AdminAuditLogRecord,
  ApprovalStatus,
  BookingRecord,
  BookingStatus,
  CoupleAgreementItem,
  CouplePrepItem,
  CoupleTaskItem,
  CoupleWorkspaceRecord,
  CustomerRequestRecord,
  ElectronicInvitationRecord,
  FavoriteRecord,
  InvitationDesignId,
  InvitationRsvpRecord,
  NotificationRecord,
  PhotographerAlbum,
  PhotographerRecord,
  ReviewRecord,
  ServiceCategoryKey,
  ServiceRecord,
  SubscriptionAudience,
  SubscriptionBillingCycle,
  SubscriptionPlanRecord,
  SubscriptionRequestStatus,
  TargetEntityType,
  UserProfile,
  UserRole,
  UserSubscriptionRecord,
  VenueRecord,
  WeddingDreamStyle,
  WhatsAppMilestone,
  WhatsAppProviderKind,
  WhatsAppReminderRecord,
  WhatsAppReminderStatus,
} from '../src/types/velora.ts';
import {
  INVITATION_DESIGNS,
  createDefaultCoupleWorkspace,
  resolveNextBookingStatus,
  summarizeInvitationRsvps,
} from '../src/utils/veloraLogic.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'velora.sqlite');

let db: DatabaseSync | null = null;

function ensureDb(): DatabaseSync {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derived = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derived.length) return false;
    return crypto.timingSafeEqual(keyBuf, derived);
  } catch {
    return false;
  }
}

function parseJsonArray<T = string>(raw: unknown): T[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function initDatabase(): void {
  const conn = ensureDb();

  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      avatar_url TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT 'القاهرة',
      bio TEXT NOT NULL DEFAULT '',
      reset_code TEXT NOT NULL DEFAULT '',
      reset_expires_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      subtitle_ar TEXT NOT NULL,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      address TEXT NOT NULL,
      map_url TEXT NOT NULL,
      capacity_min INTEGER NOT NULL DEFAULT 80,
      capacity_max INTEGER NOT NULL DEFAULT 400,
      price_per_event INTEGER NOT NULL DEFAULT 45000,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      working_hours TEXT NOT NULL DEFAULT '10:00 ص - 11:00 م',
      decor_styles_json TEXT NOT NULL DEFAULT '[]',
      features_json TEXT NOT NULL DEFAULT '[]',
      description_ar TEXT NOT NULL,
      cover_image TEXT NOT NULL,
      gallery_json TEXT NOT NULL DEFAULT '[]',
      video_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photographers (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      specialty_ar TEXT NOT NULL,
      city TEXT NOT NULL,
      studio_location TEXT NOT NULL,
      years_experience INTEGER NOT NULL DEFAULT 5,
      working_hours TEXT NOT NULL DEFAULT '11:00 ص - 10:00 م',
      starting_price INTEGER NOT NULL DEFAULT 14000,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      bio_ar TEXT NOT NULL,
      equipment_ar TEXT NOT NULL,
      shooting_types_json TEXT NOT NULL DEFAULT '[]',
      avatar_url TEXT NOT NULL,
      cover_image TEXT NOT NULL,
      video_reel_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photographer_albums (
      id TEXT PRIMARY KEY,
      photographer_id TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      description_ar TEXT NOT NULL,
      session_date TEXT NOT NULL,
      location_ar TEXT NOT NULL,
      photos_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (photographer_id) REFERENCES photographers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      category TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      starting_price INTEGER NOT NULL DEFAULT 8000,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      working_hours TEXT NOT NULL DEFAULT '10:00 ص - 9:00 م',
      description_ar TEXT NOT NULL,
      packages_json TEXT NOT NULL DEFAULT '[]',
      cover_image TEXT NOT NULL,
      gallery_json TEXT NOT NULL DEFAULT '[]',
      video_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_requests (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      request_section TEXT NOT NULL,
      service_category TEXT NOT NULL DEFAULT '',
      title_ar TEXT NOT NULL,
      event_date TEXT NOT NULL,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      guests_count INTEGER NOT NULL DEFAULT 150,
      budget_egp INTEGER NOT NULL DEFAULT 30000,
      preferred_type TEXT NOT NULL DEFAULT '',
      requested_services_json TEXT NOT NULL DEFAULT '[]',
      notes_ar TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      provider_owner_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_title TEXT NOT NULL,
      target_image TEXT NOT NULL,
      event_date TEXT NOT NULL,
      guests_count INTEGER NOT NULL DEFAULT 150,
      estimated_total_egp INTEGER NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'offline_agreement',
      notes TEXT NOT NULL DEFAULT '',
      provider_approved INTEGER NOT NULL DEFAULT 0,
      admin_approved INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      provider_note TEXT NOT NULL DEFAULT '',
      admin_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment_ar TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, target_type, target_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      body_ar TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'system',
      related_route TEXT NOT NULL DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      design_id TEXT NOT NULL DEFAULT 'royal',
      groom_name TEXT NOT NULL,
      bride_name TEXT NOT NULL,
      wedding_date TEXT NOT NULL,
      wedding_time TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      map_url TEXT NOT NULL,
      invitation_text TEXT NOT NULL,
      couple_photo TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitation_rsvps (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      guest_phone TEXT NOT NULL DEFAULT '',
      response TEXT NOT NULL,
      companions_count INTEGER NOT NULL DEFAULT 1,
      congratulation_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_name TEXT NOT NULL,
      action_ar TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_reminders (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      milestone TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      client_name TEXT NOT NULL,
      target_title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      message_body TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_message_id TEXT NOT NULL DEFAULT '',
      error_text TEXT NOT NULL DEFAULT '',
      sent_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(booking_id, milestone)
    );

    CREATE TABLE IF NOT EXISTS couple_workspaces (
      user_id TEXT PRIMARY KEY,
      couple_title TEXT NOT NULL,
      governorate TEXT NOT NULL,
      wedding_date TEXT NOT NULL DEFAULT '',
      guests_count INTEGER NOT NULL DEFAULT 220,
      total_budget_egp INTEGER NOT NULL DEFAULT 220000,
      dream_style TEXT NOT NULL DEFAULT 'royal_palace',
      prep_items_json TEXT NOT NULL DEFAULT '[]',
      tasks_json TEXT NOT NULL DEFAULT '[]',
      agreements_json TEXT NOT NULL DEFAULT '[]',
      compare_mode TEXT NOT NULL DEFAULT 'venue',
      compared_ids_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      audience TEXT NOT NULL,
      target_roles_ar TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      tagline_ar TEXT NOT NULL,
      monthly_price_egp INTEGER NOT NULL DEFAULT 0,
      quarterly_price_egp INTEGER NOT NULL DEFAULT 0,
      annual_price_egp INTEGER NOT NULL DEFAULT 0,
      billing_note_ar TEXT NOT NULL DEFAULT '',
      features_json TEXT NOT NULL DEFAULT '[]',
      highlighted INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      plan_name_ar TEXT NOT NULL,
      audience TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      amount_egp INTEGER NOT NULL DEFAULT 0,
      contact_phone TEXT NOT NULL DEFAULT '',
      business_or_couple_name TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT 'تحويل بنكي / انستاباي',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT NOT NULL DEFAULT '',
      starts_at TEXT NOT NULL DEFAULT '',
      ends_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invitation_template_prices (
      design_id TEXT PRIMARY KEY,
      price_egp INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  // Safe schema migrations for existing SQLite databases
  const planCols = conn.prepare(`PRAGMA table_info(subscription_plans)`).all() as Array<{ name: string }>;
  if (!planCols.some((c) => c.name === 'quarterly_price_egp')) {
    conn.exec(`ALTER TABLE subscription_plans ADD COLUMN quarterly_price_egp INTEGER NOT NULL DEFAULT 0`);
    conn.exec(
      `UPDATE subscription_plans SET quarterly_price_egp = CASE WHEN monthly_price_egp > 0 THEN ROUND(monthly_price_egp * 2.7) ELSE 0 END`
    );
  }

  const invCols = conn.prepare(`PRAGMA table_info(invitations)`).all() as Array<{ name: string }>;
  if (!invCols.some((c) => c.name === 'design_price_egp')) {
    conn.exec(`ALTER TABLE invitations ADD COLUMN design_price_egp INTEGER NOT NULL DEFAULT 0`);
  }

  const countRow = conn.prepare('SELECT COUNT(*) AS count FROM venues').get() as { count: number };
  if (countRow.count === 0) {
    seedInitialVeloraData(conn);
  }

  const plansCountRow = conn.prepare('SELECT COUNT(*) AS count FROM subscription_plans').get() as { count: number };
  if (plansCountRow.count === 0) {
    seedSubscriptionPlans(conn);
  }

  const tmplPriceCount = conn
    .prepare('SELECT COUNT(*) AS count FROM invitation_template_prices')
    .get() as { count: number };
  if (tmplPriceCount.count === 0) {
    const nowIso = new Date().toISOString();
    const stmt = conn.prepare(
      `INSERT OR IGNORE INTO invitation_template_prices (design_id, price_egp, updated_at) VALUES (?, ?, ?)`
    );
    for (const id of Object.keys(INVITATION_DESIGNS) as InvitationDesignId[]) {
      stmt.run(id, INVITATION_DESIGNS[id].priceEgp, nowIso);
    }
  }
}

function seedInitialVeloraData(conn: DatabaseSync): void {
  const now = new Date().toISOString();
  // Seed sample client and providers (NO hardcoded admin password; admin is claimed securely via first-run flow)
  const seedUsers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    city: string;
    bio: string;
    avatar: string;
  }> = [
    {
      id: 'usr-client-1',
      name: 'سلمى حسام',
      email: 'salma@velora-demo.eg',
      phone: '01012345601',
      role: 'client',
      city: 'القاهرة',
      bio: 'عروس تستعد لتنظيم حفل زفاف أنيق في القاهرة.',
      avatar: '/src/assets/images/velora_photographer_couple_1795424759634.jpg',
    },
    {
      id: 'usr-venue-1',
      name: 'مجموعة قصور الأوركيد',
      email: 'orchid@velora-demo.eg',
      phone: '01012345602',
      role: 'venue_owner',
      city: 'التجمع الخامس',
      bio: 'إدارة قاعات احتفالات ملكية وباقات زفاف شاملة.',
      avatar: '/src/assets/images/velora_venue_palace_1795424759214.jpg',
    },
    {
      id: 'usr-photo-1',
      name: 'كريم المنصور',
      email: 'karim.lens@velora-demo.eg',
      phone: '01012345603',
      role: 'photographer',
      city: 'الزمالك - القاهرة',
      bio: 'مصور أفراح سينمائي بخبرة 9 سنوات في حفلات القصور.',
      avatar: '/src/assets/images/velora_photographer_couple_1795424759634.jpg',
    },
    {
      id: 'usr-service-1',
      name: 'أتيليه لافندر للديكور',
      email: 'lavender.decor@velora-demo.eg',
      phone: '01012345604',
      role: 'service_provider',
      city: 'مصر الجديدة',
      bio: 'تصميم كوشات الزفاف وتنسيق الزهور الطبيعية.',
      avatar: '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg',
    },
  ];

  // Note: seeded non-admin demo accounts use cryptographic random non-guessable passhashes
  // Users can register fresh accounts immediately or test with created credentials.
  const insertUser = conn.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, role, status, avatar_url, city, bio, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
  `);
  for (const u of seedUsers) {
    const randomSeedSecret = crypto.randomBytes(24).toString('hex');
    insertUser.run(u.id, u.name, u.email, u.phone, hashPassword(randomSeedSecret), u.role, u.avatar, u.city, u.bio, now);
  }

  // Venues
  const insertVenue = conn.prepare(`
    INSERT INTO venues (
      id, owner_id, owner_name, title_ar, subtitle_ar, city, area, address, map_url,
      capacity_min, capacity_max, price_per_event, discount_percent, working_hours,
      decor_styles_json, features_json, description_ar, cover_image, gallery_json,
      video_url, status, featured, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
  `);

  insertVenue.run(
    'venue-orchid-palace',
    'usr-venue-1',
    'مجموعة قصور الأوركيد',
    'قصر الأوركيد الملكي — التجمع الخامس',
    'قاعة رخامية بأسقف كريستال وحديقة استقبال مفتوحة',
    'القاهرة',
    'التجمع الخامس',
    'محور محمد نجيب، القاهرة الجديدة',
    'https://maps.google.com/?q=30.0255,31.4847',
    150,
    550,
    95000,
    12,
    '11:00 ص - 12:00 منتصف الليل',
    JSON.stringify(['كلاسيك ملكي', 'بنفسجي ولؤلؤي', 'زهور الأوركيد البيضاء']),
    JSON.stringify(['جناح خاص للعروسين', 'خدمة صف السيارات', 'نظام صوت وإضاءة ذكي', 'بوفيه فندقي 5 نجوم', 'فريق تنسيق مرافق']),
    'قاعة فسيحة بتفاصيل رخامية بيضاء وثريات كريستال مذهلة، تجمع بين الفخامة الهادئة والخصوصية التامة لاستقبال كبار الضيوف وتنظيم الزفة الملكية.',
    '/src/assets/images/velora_venue_palace_1795424759214.jpg',
    JSON.stringify([
      '/src/assets/images/velora_venue_palace_1795424759214.jpg',
      '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
      '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg',
    ]),
    '',
    1,
    now
  );

  insertVenue.run(
    'venue-nile-terrace',
    'usr-venue-1',
    'مجموعة قصور الأوركيد',
    'تراس ليالينا على النيل — الزمالك',
    'إطلالة نيلية مباشرة لليالي الزفاف المفتوحة',
    'القاهرة',
    'الزمالك',
    'شارع الجزيرة الوسطى، الزمالك، القاهرة',
    'https://maps.google.com/?q=30.0609,31.2197',
    100,
    320,
    78000,
    10,
    '12:00 ظ - 11:30 م',
    JSON.stringify(['مودرن أبيض', 'حديقة نيلية', 'أقواس ورود موسمية']),
    JSON.stringify(['إطلالة مباشرة على النيل', 'مرسى خاص لدخول العروسين', 'إضاءة غروب رومانسية', 'قائمة ضيافة مخصصة']),
    'مساحة مفتوحة أنيقة مطلة مباشرة على صفحة النيل، مثالية لحفلات الزفاف الرومانسية في الهواء الطلق وتصوير الغروب الساحر.',
    '/src/assets/images/velora_venue_garden_1795424759691.jpg',
    JSON.stringify([
      '/src/assets/images/velora_venue_garden_1795424759691.jpg',
      '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
    ]),
    '',
    1,
    now
  );

  insertVenue.run(
    'venue-lavender-alex',
    'usr-venue-1',
    'مجموعة قصور الأوركيد',
    'فيلا لافندر جاردن — الإسكندرية',
    'قصر بوتيكي وسط حدائق الورود وإضاءة المساء',
    'الإسكندرية',
    'كنج مريوط',
    'طريق كنج مريوط الرئيسي، الإسكندرية',
    'https://maps.google.com/?q=31.0169,29.8112',
    80,
    280,
    62000,
    15,
    '10:00 ص - 11:00 م',
    JSON.stringify(['حديقة لافندر', 'بوهيمي راقي', 'جلسات لاونج بيضاء']),
    JSON.stringify(['مسبح مضاء للتصوير', 'منطقة كوكتيل استقبال', 'بارك سيارات واسع', 'مقاعد حديقة فاخرة']),
    'فيلا راقية محاطة بالحدائق الهادئة والممرات المضاءة بالشموع، مصممة للعروسين الباحثين عن تجربة زفاف بوتيكية مريحة ودافئة.',
    '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
    JSON.stringify([
      '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
      '/src/assets/images/velora_venue_garden_1795424759691.jpg',
    ]),
    '',
    0,
    now
  );

  // Photographers + Multi-photo Albums
  const insertPhoto = conn.prepare(`
    INSERT INTO photographers (
      id, owner_id, display_name, specialty_ar, city, studio_location, years_experience,
      working_hours, starting_price, discount_percent, bio_ar, equipment_ar, shooting_types_json,
      avatar_url, cover_image, video_reel_url, status, featured, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
  `);

  const insertAlbum = conn.prepare(`
    INSERT INTO photographer_albums (id, photographer_id, title_ar, description_ar, session_date, location_ar, photos_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertPhoto.run(
    'photo-karim-mansour',
    'usr-photo-1',
    'كريم المنصور — استوديو لوميير',
    'تصوير أفراح تحريري وفيديوهات سينمائية',
    'القاهرة',
    'الزمالك — شارع أبو الفدا',
    9,
    '11:00 ص - 11:00 م',
    18500,
    10,
    'متخصص في توثيق قصص الزفاف بأسلوب المجلات العالمية، مع التركيز على اللحظات العفوية والإضاءة الطبيعية خلال الساعة الذهبية.',
    'Sony Alpha 1 + عدسات G-Master 50mm f/1.2 و 85mm + طائرة درون سينمائية مرخصة وميكروفونات لاسلكية',
    JSON.stringify(['فوتو سيشن عروسين', 'تغطية الحفل كاملة', 'برومو سينمائي 4K', 'تصوير التحضيرات الصباحية']),
    '/src/assets/images/velora_photographer_couple_1795424759634.jpg',
    '/src/assets/images/velora_photographer_couple_1795424759634.jpg',
    '',
    1,
    now
  );

  insertAlbum.run(
    'alb-karim-1',
    'photo-karim-mansour',
    'زفاف آدم ولينا — قصر المنيل',
    'جلسة تصوير عند الغروب بين الأعمدة التاريخية يليها توثيق كامل لحفل الاستقبال.',
    '2026-04-18',
    'قصر المنيل، القاهرة',
    JSON.stringify([
      '/src/assets/images/velora_photographer_couple_1795424759634.jpg',
      '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
      '/src/assets/images/velora_venue_palace_1795424759214.jpg',
    ])
  );

  insertAlbum.run(
    'alb-karim-2',
    'photo-karim-mansour',
    'سهرة النيل — التجمع والزمالك',
    'لقطات دافئة لتفاصيل الفستان، الكوشة، وتفاعل الأهل والأصدقاء.',
    '2026-06-05',
    'تراس النيل، الزمالك',
    JSON.stringify([
      '/src/assets/images/velora_venue_garden_1795424759691.jpg',
      '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg',
    ])
  );

  insertPhoto.run(
    'photo-yasmine-fouad',
    'usr-photo-1',
    'ياسمين فؤاد — عدسة الذاكرة',
    'تصوير بورتريه نسائي وتفاصيل العروس',
    'القاهرة والجيزة',
    'المهندسين — شارع لبنان',
    7,
    '10:00 ص - 9:00 م',
    15000,
    0,
    'فريق تصوير نسائي متكامل يوثّق تجهيزات العروس وأجمل اللحظات العائلية بخصوصية تامة ولمسة لونية ناعمة.',
    'Canon EOS R5 + RF 28-70mm f/2 + إضاءات استوديو ناعمة متنقلة',
    JSON.stringify(['طاقم تصوير نسائي', 'تجهيزات العروس', 'بورتريه عائلي', 'فيديو ريلز قصير']),
    '/src/assets/images/velora_invitation_editorial_1795424758769.jpg',
    '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
    '',
    1,
    now
  );

  insertAlbum.run(
    'alb-yasmine-1',
    'photo-yasmine-fouad',
    'تفاصيل الصباح والورود البيضاء',
    'توثيق خاص لباقة الزفاف والدعوات والخواتم ولحظة الظهور الأولى.',
    '2026-05-12',
    'الزمالك، القاهرة',
    JSON.stringify([
      '/src/assets/images/velora_invitation_editorial_1795424758769.jpg',
      '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg',
    ])
  );

  insertPhoto.run(
    'photo-tarek-sherif',
    'usr-photo-1',
    'طارق الشريف — فريمز الإسكندرية',
    'توثيق حفلات الساحل والإسكندرية المفتوحة',
    'الإسكندرية',
    'سموحة — فكتور عمانويل',
    6,
    '12:00 ظ - 10:00 م',
    13500,
    10,
    'تغطية عصرية سريعة التسليم لحفلات الشاطئ والحدائق مع ألبومات مطبوعة فاخرة من الجلد الإيطالي.',
    'Nikon Z9 + عدسات Prime + مثبت حركة Gimbal للتصوير السينمائي',
    JSON.stringify(['تصوير شاطئ وحدائق', 'توثيق يوم كامل', 'ألبوم مطبوع فاخر']),
    '/src/assets/images/velora_venue_garden_1795424759691.jpg',
    '/src/assets/images/velora_photographer_couple_1795424759634.jpg',
    '',
    0,
    now
  );

  insertAlbum.run(
    'alb-tarek-1',
    'photo-tarek-sherif',
    'أمسية فيلا كنج مريوط',
    'تغطية كاملة لإضاءة الحدائق والرقصة الأولى للعروسين.',
    '2026-07-09',
    'الإسكندرية',
    JSON.stringify([
      '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
      '/src/assets/images/velora_photographer_couple_1795424759634.jpg',
    ])
  );

  // Services across key wedding categories
  const insertService = conn.prepare(`
    INSERT INTO services (
      id, owner_id, provider_name, category, title_ar, city, area, starting_price,
      discount_percent, working_hours, description_ar, packages_json, cover_image,
      gallery_json, video_url, status, featured, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'approved', ?, ?)
  `);

  insertService.run(
    'srv-kosha-lavender',
    'usr-service-1',
    'أتيليه لافندر للديكور',
    'kosha',
    'كوشة الأوركيد والليلك الملكية',
    'القاهرة',
    'مصر الجديدة',
    24000,
    10,
    '10:00 ص - 9:00 م',
    'تصميم وتنفيذ كوشة زفاف ثلاثية الأبعاد بالورود الطبيعية والبنفسجي اللؤلؤي مع ممر مضاء بالشموع الزجاجية.',
    JSON.stringify(['كوشة ورود طبيعية كاملة', 'ممر عروسين مضاء', 'تنسيق طاولة العقد', 'إضاءة دافئة موجهة']),
    '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg',
    JSON.stringify(['/src/assets/images/velora_service_floral_kosha_1795424758988.jpg', '/src/assets/images/velora_venue_palace_1795424759214.jpg']),
    1,
    now
  );

  insertService.run(
    'srv-flowers-bouquet',
    'usr-service-1',
    'بوتيك أزهار النيل',
    'flowers',
    'باقات عروس وتنسيق طاولات بالورود المستوردة',
    'القاهرة',
    'المعادي',
    11500,
    0,
    '9:30 ص - 8:30 م',
    'تنسيق بوكيه العروس وبوتونيير العريس و20 سنتربيس للطاولات من ورود الأوركيد والفاوانيا واللافندر.',
    JSON.stringify(['بوكيه العروس الفاخر', 'تنسيق 20 طاولة', 'باقات استقبال المدخل']),
    '/src/assets/images/velora_venue_garden_1795424759691.jpg',
    JSON.stringify(['/src/assets/images/velora_venue_garden_1795424759691.jpg']),
    1,
    now
  );

  insertService.run(
    'srv-planning-velvet',
    'usr-service-1',
    'فيلفيت إيفنتس لتنظيم الحفلات',
    'planning',
    'إدارة وتنظيم حفل الزفاف من التخطيط حتى الوداع',
    'القاهرة والجيزة',
    'الشيخ زايد',
    19000,
    15,
    '11:00 ص - 10:00 م',
    'منسقة أفراح شخصية مع فريق عمل ميداني يوم الحفل لضبط مواعيد الزفة والتصوير واستقبال الضيوف بسلاسة تامة.',
    JSON.stringify(['جدول زمني متكامل', '3 منسقين يوم الحفل', 'بروفة موسيقية ودخول', 'تنسيق مع كافة الموردين']),
    '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
    JSON.stringify(['/src/assets/images/velora_hero_wedding_1795424759489.jpg']),
    1,
    now
  );

  insertService.run(
    'srv-catering-royal',
    'usr-service-1',
    'ضيافة المائدة الملكية',
    'catering',
    'بوفيه استقبال مفتوح وتورتة زفاف فاخرة',
    'القاهرة',
    'مدينة نصر',
    32000,
    0,
    '10:00 ص - 11:00 م',
    'قائمة عشاء فاخرة لعدد 200 ضيف مع ركن حلويات شرقية وغربية وعصائر ترحيبية وتورتة متعددة الأدوار.',
    JSON.stringify(['ركن ضيافة ترحيبي', 'عشاء ساخن لـ 200 فرد', 'تورتة زفاف 4 أدوار', 'طاقم خدمة محترف']),
    '/src/assets/images/velora_venue_palace_1795424759214.jpg',
    JSON.stringify(['/src/assets/images/velora_venue_palace_1795424759214.jpg']),
    0,
    now
  );

  // Separated Customer Requests (Strictly isolated inside Requests tabs)
  const insertReq = conn.prepare(`
    INSERT INTO customer_requests (
      id, client_id, client_name, client_phone, request_section, service_category, title_ar,
      event_date, city, area, guests_count, budget_egp, preferred_type, requested_services_json, notes_ar, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
  `);

  insertReq.run(
    'req-venue-1',
    'usr-client-1',
    'سلمى حسام',
    '01012345601',
    'venue',
    '',
    'مطلوب قاعة زفاف مفتوحة لـ 250 ضيف في التجمع أو الزمالك',
    '2026-12-26',
    'القاهرة',
    'التجمع الخامس / الزمالك',
    250,
    85000,
    'حديقة مفتوحة + قاعة بديلة',
    JSON.stringify(['بوفيه عشاء', 'غرفة تجهيز للعروس', 'خدمة صف سيارات']),
    'نبحث عن أجواء هادئة وإضاءة مسائية دافئة مع إمكانية تجهيز كوشة خاصة.',
    now
  );

  insertReq.run(
    'req-photo-1',
    'usr-client-1',
    'ندى محمود',
    '01099112233',
    'photographer',
    '',
    'طلب باقة تصوير وفيديو سينمائي لحفل خطوبة في المعادي',
    '2026-12-18',
    'القاهرة',
    'المعادي',
    120,
    14000,
    'فوتو سيشن + فيديو ريلز',
    JSON.stringify(['تصوير تجهيزات', 'فوتو سيشن', 'تغطية 6 ساعات']),
    'يفضل وجود مصورة مساعدة ضمن الفريق أثناء جلسة التحضيرات.',
    now
  );

  // Approved Reviews
  const insertReview = conn.prepare(`
    INSERT INTO reviews (id, author_id, author_name, target_type, target_id, rating, comment_ar, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)
  `);
  insertReview.run('rev-1', 'usr-client-1', 'مريم أشرف', 'venue', 'venue-orchid-palace', 5, 'قاعة مذهلة في التنظيم والإضاءة، وكل ضيوفنا أشادوا برقي الخدمة والهدوء.', now);
  insertReview.run('rev-2', 'usr-client-1', 'حسام طارق', 'photographer', 'photo-karim-mansour', 5, 'كريم محترف جدًا في التوجيه أثناء الجلسة واستلمنا الصور بجودة المجلات.', now);
  insertReview.run('rev-3', 'usr-client-1', 'نور الدين', 'service', 'srv-kosha-lavender', 5, 'تنفيذ الكوشة فاق توقعاتنا تمامًا، والورود ظلت نضرة طوال الحفل.', now);

  // Sample Confirmed Booking so Availability Checker shows both Reserved & Available dates cleanly
  conn.prepare(`
    INSERT INTO bookings (
      id, client_id, client_name, client_phone, provider_owner_id, target_type, target_id,
      target_title, target_image, event_date, guests_count, estimated_total_egp, payment_mode,
      notes, provider_approved, admin_approved, status, provider_note, admin_note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline_agreement', ?, 1, 1, 'confirmed', ?, ?, ?, ?)
  `).run(
    'bk-sample-1',
    'usr-client-1',
    'سلمى حسام',
    '01012345601',
    'usr-venue-1',
    'venue',
    'venue-orchid-palace',
    'قصر الأوركيد الملكي — التجمع الخامس',
    '/src/assets/images/velora_venue_palace_1795424759214.jpg',
    '2026-12-20',
    280,
    95000,
    'تنسيق دخول العروسين بالورود البيضاء.',
    'تم اعتماد التاريخ وإدراجه في جدول القاعة.',
    'تمت مراجعة الحجز وتأكيده نهائيًا.',
    now,
    now
  );

  // Sample Electronic Invitation with working ?invite=adam-and-lina
  const sampleWeddingDate = new Date(Date.now() + 21 * 86400 * 1000).toISOString().slice(0, 10);
  conn.prepare(`
    INSERT INTO invitations (
      id, owner_id, slug, design_id, groom_name, bride_name, wedding_date, wedding_time,
      venue_name, map_url, invitation_text, couple_photo, contact_phone, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'inv-sample-1',
    'usr-client-1',
    'adam-and-lina',
    'royal',
    'آدم',
    'لينا',
    sampleWeddingDate,
    '20:00',
    'قصر الأوركيد الملكي — التجمع الخامس',
    'https://maps.google.com/?q=30.0255,31.4847',
    'بقلوب يغمرها الفرح والود، نتشرف بدعوتكم لحضور حفل زفافنا ومشاركتنا أجمل لحظات العمر.',
    '/src/assets/images/velora_invitation_editorial_1795424758769.jpg',
    '+20 101 234 5601',
    now
  );

  const insertRsvp = conn.prepare(`
    INSERT INTO invitation_rsvps (id, invitation_id, guest_name, guest_phone, response, companions_count, congratulation_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRsvp.run('rsvp-1', 'inv-sample-1', 'د. علياء حسن', '01022334455', 'attending', 2, 'ألف مبروك، ربنا يتمم لكما على ألف خير ويسعد أيامكم.', now);
  insertRsvp.run('rsvp-2', 'inv-sample-1', 'م. مازن خالد', '01122334466', 'attending', 1, 'فرحتكم فرحتنا، بإذن الله حاضرين من أول دقيقة.', now);
  insertRsvp.run('rsvp-3', 'inv-sample-1', 'أ. ريم عادل', '01233445577', 'declined', 1, 'أعتذر لظروف السفر، خالص الدعوات لكما بحياة مليئة بالمحبة.', now);
}

// --- User & Auth Helpers ---
function mapUserRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    role: String(row.role) as UserRole,
    status: (String(row.status || 'active') as 'active' | 'suspended'),
    avatarUrl: String(row.avatar_url || ''),
    city: String(row.city || 'القاهرة'),
    bio: String(row.bio || ''),
    createdAt: String(row.created_at),
  };
}

export function countAdmins(): number {
  const conn = ensureDb();
  const row = conn.prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'`).get() as { count: number };
  return Number(row.count || 0);
}

export function findUserByIdentifier(identifier: string): (UserProfile & { passwordHash: string; resetCode: string; resetExpiresAt: string }) | null {
  const conn = ensureDb();
  const clean = identifier.trim().toLowerCase();
  const cleanPhone = identifier.trim().replace(/[\s\-()]/g, '');
  const row = conn
    .prepare(`SELECT * FROM users WHERE lower(email) = ? OR phone = ? LIMIT 1`)
    .get(clean, cleanPhone) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    ...mapUserRow(row),
    passwordHash: String(row.password_hash),
    resetCode: String(row.reset_code || ''),
    resetExpiresAt: String(row.reset_expires_at || ''),
  };
}

export function getUserById(userId: string): UserProfile | null {
  const conn = ensureDb();
  const row = conn.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).get(userId) as Record<string, unknown> | undefined;
  return row ? mapUserRow(row) : null;
}

export function createUserAccount(input: {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: UserRole;
  city?: string;
  bio?: string;
  avatarUrl?: string;
}): UserProfile {
  const conn = ensureDb();
  const id = `usr-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, role, status, avatar_url, city, bio, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `)
    .run(
      id,
      input.name.trim(),
      (input.email || '').trim().toLowerCase(),
      (input.phone || '').trim().replace(/[\s\-()]/g, ''),
      hashPassword(input.password),
      input.role,
      input.avatarUrl || '',
      (input.city || 'القاهرة').trim(),
      (input.bio || '').trim(),
      now
    );
  return getUserById(id)!;
}

export function updateUserProfile(
  userId: string,
  patch: Partial<Pick<UserProfile, 'name' | 'email' | 'phone' | 'city' | 'bio' | 'avatarUrl'>>
): UserProfile | null {
  const conn = ensureDb();
  const existing = getUserById(userId);
  if (!existing) return null;
  conn
    .prepare(`
      UPDATE users SET name = ?, email = ?, phone = ?, city = ?, bio = ?, avatar_url = ? WHERE id = ?
    `)
    .run(
      (patch.name ?? existing.name).trim(),
      (patch.email ?? existing.email).trim().toLowerCase(),
      (patch.phone ?? existing.phone).trim().replace(/[\s\-()]/g, ''),
      (patch.city ?? existing.city).trim(),
      (patch.bio ?? existing.bio).trim(),
      patch.avatarUrl ?? existing.avatarUrl,
      userId
    );
  return getUserById(userId);
}

export function setPasswordResetCode(userId: string): string {
  const conn = ensureDb();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  conn.prepare(`UPDATE users SET reset_code = ?, reset_expires_at = ? WHERE id = ?`).run(code, expiresAt, userId);
  return code;
}

export function resetPasswordWithCode(identifier: string, code: string, newPassword: string): boolean {
  const conn = ensureDb();
  const user = findUserByIdentifier(identifier);
  if (!user || !user.resetCode || user.resetCode !== code.trim()) return false;
  if (Date.parse(user.resetExpiresAt) < Date.now()) return false;
  conn
    .prepare(`UPDATE users SET password_hash = ?, reset_code = '', reset_expires_at = '' WHERE id = ?`)
    .run(hashPassword(newPassword), user.id);
  return true;
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const res = ensureDb()
    .prepare(`UPDATE users SET password_hash = ?, reset_code = '', reset_expires_at = '' WHERE id = ?`)
    .run(hashPassword(newPassword), userId);
  return Number(res.changes || 0) > 0;
}

export function createSession(userId: string): string {
  const conn = ensureDb();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
  conn.prepare(`INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).run(token, userId, expiresAt, now);
  return token;
}

export function getUserBySessionToken(token: string): UserProfile | null {
  if (!token) return null;
  const conn = ensureDb();
  const row = conn
    .prepare(`
      SELECT u.* FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ? AND u.status = 'active'
      LIMIT 1
    `)
    .get(token, new Date().toISOString()) as Record<string, unknown> | undefined;
  return row ? mapUserRow(row) : null;
}

export function deleteSession(token: string): void {
  if (!token) return;
  ensureDb().prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function listAllUsers(): UserProfile[] {
  const rows = ensureDb().prepare(`SELECT * FROM users ORDER BY created_at DESC`).all() as Record<string, unknown>[];
  return rows.map(mapUserRow);
}

export function adminUpdateUser(userId: string, role: UserRole, status: 'active' | 'suspended'): UserProfile | null {
  ensureDb().prepare(`UPDATE users SET role = ?, status = ? WHERE id = ?`).run(role, status, userId);
  return getUserById(userId);
}

// --- Venues ---
function computeRatingStats(targetType: TargetEntityType, targetId: string): { avgRating: number; reviewsCount: number } {
  const row = ensureDb()
    .prepare(`SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM reviews WHERE target_type = ? AND target_id = ? AND status = 'approved'`)
    .get(targetType, targetId) as { avg_r: number | null; cnt: number };
  return {
    avgRating: row.avg_r ? Number(Number(row.avg_r).toFixed(1)) : 5.0,
    reviewsCount: Number(row.cnt || 0),
  };
}

function mapVenueRow(row: Record<string, unknown>): VenueRecord {
  const stats = computeRatingStats('venue', String(row.id));
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    ownerName: String(row.owner_name),
    titleAr: String(row.title_ar),
    subtitleAr: String(row.subtitle_ar),
    city: String(row.city),
    area: String(row.area),
    address: String(row.address),
    mapUrl: String(row.map_url),
    capacityMin: Number(row.capacity_min),
    capacityMax: Number(row.capacity_max),
    pricePerEvent: Number(row.price_per_event),
    discountPercent: Number(row.discount_percent || 0),
    workingHours: String(row.working_hours),
    decorStyles: parseJsonArray<string>(row.decor_styles_json),
    features: parseJsonArray<string>(row.features_json),
    descriptionAr: String(row.description_ar),
    coverImage: String(row.cover_image),
    galleryImages: parseJsonArray<string>(row.gallery_json),
    videoUrl: String(row.video_url || ''),
    status: String(row.status) as ApprovalStatus,
    featured: Boolean(row.featured),
    avgRating: stats.avgRating,
    reviewsCount: stats.reviewsCount,
    createdAt: String(row.created_at),
  };
}

export function listVenues(options?: { includeAllStatuses?: boolean; ownerId?: string }): VenueRecord[] {
  const conn = ensureDb();
  let rows: Record<string, unknown>[];
  if (options?.includeAllStatuses) {
    rows = conn.prepare(`SELECT * FROM venues ORDER BY featured DESC, created_at DESC`).all() as Record<string, unknown>[];
  } else if (options?.ownerId) {
    rows = conn
      .prepare(`SELECT * FROM venues WHERE status = 'approved' OR owner_id = ? ORDER BY featured DESC, created_at DESC`)
      .all(options.ownerId) as Record<string, unknown>[];
  } else {
    rows = conn.prepare(`SELECT * FROM venues WHERE status = 'approved' ORDER BY featured DESC, created_at DESC`).all() as Record<string, unknown>[];
  }
  return rows.map(mapVenueRow);
}

export function getVenueById(id: string): VenueRecord | null {
  const row = ensureDb().prepare(`SELECT * FROM venues WHERE id = ? LIMIT 1`).get(id) as Record<string, unknown> | undefined;
  return row ? mapVenueRow(row) : null;
}

export function createVenueRecord(input: {
  ownerId: string;
  ownerName: string;
  titleAr: string;
  subtitleAr: string;
  city: string;
  area: string;
  address: string;
  mapUrl: string;
  capacityMin: number;
  capacityMax: number;
  pricePerEvent: number;
  discountPercent?: number;
  workingHours: string;
  decorStyles: string[];
  features: string[];
  descriptionAr: string;
  coverImage: string;
  galleryImages: string[];
  videoUrl?: string;
  status?: ApprovalStatus;
}): VenueRecord {
  const conn = ensureDb();
  const id = `venue-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO venues (
        id, owner_id, owner_name, title_ar, subtitle_ar, city, area, address, map_url,
        capacity_min, capacity_max, price_per_event, discount_percent, working_hours,
        decor_styles_json, features_json, description_ar, cover_image, gallery_json, video_url,
        status, featured, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `)
    .run(
      id,
      input.ownerId,
      input.ownerName,
      input.titleAr,
      input.subtitleAr,
      input.city,
      input.area,
      input.address,
      input.mapUrl,
      input.capacityMin,
      input.capacityMax,
      input.pricePerEvent,
      input.discountPercent || 0,
      input.workingHours,
      JSON.stringify(input.decorStyles),
      JSON.stringify(input.features),
      input.descriptionAr,
      input.coverImage,
      JSON.stringify(input.galleryImages),
      input.videoUrl || '',
      input.status || 'pending',
      now
    );
  return getVenueById(id)!;
}

export function updateVenueStatus(id: string, status: ApprovalStatus, featured?: boolean): VenueRecord | null {
  const conn = ensureDb();
  if (featured !== undefined) {
    conn.prepare(`UPDATE venues SET status = ?, featured = ? WHERE id = ?`).run(status, featured ? 1 : 0, id);
  } else {
    conn.prepare(`UPDATE venues SET status = ? WHERE id = ?`).run(status, id);
  }
  return getVenueById(id);
}

export function deleteVenueRecord(id: string): boolean {
  const info = ensureDb().prepare(`DELETE FROM venues WHERE id = ?`).run(id);
  return Number(info.changes) > 0;
}

// --- Photographers ---
function mapPhotographerRow(row: Record<string, unknown>): PhotographerRecord {
  const id = String(row.id);
  const albumRows = ensureDb()
    .prepare(`SELECT * FROM photographer_albums WHERE photographer_id = ? ORDER BY session_date DESC`)
    .all(id) as Record<string, unknown>[];
  const albums: PhotographerAlbum[] = albumRows.map((a) => ({
    id: String(a.id),
    photographerId: id,
    titleAr: String(a.title_ar),
    descriptionAr: String(a.description_ar),
    sessionDate: String(a.session_date),
    locationAr: String(a.location_ar),
    photos: parseJsonArray<string>(a.photos_json),
  }));
  const stats = computeRatingStats('photographer', id);
  return {
    id,
    ownerId: String(row.owner_id),
    displayName: String(row.display_name),
    specialtyAr: String(row.specialty_ar),
    city: String(row.city),
    studioLocation: String(row.studio_location),
    yearsExperience: Number(row.years_experience),
    workingHours: String(row.working_hours),
    startingPrice: Number(row.starting_price),
    discountPercent: Number(row.discount_percent || 0),
    bioAr: String(row.bio_ar),
    equipmentAr: String(row.equipment_ar),
    shootingTypes: parseJsonArray<string>(row.shooting_types_json),
    avatarUrl: String(row.avatar_url),
    coverImage: String(row.cover_image),
    videoReelUrl: String(row.video_reel_url || ''),
    albums,
    status: String(row.status) as ApprovalStatus,
    featured: Boolean(row.featured),
    avgRating: stats.avgRating,
    reviewsCount: stats.reviewsCount,
    createdAt: String(row.created_at),
  };
}

export function listPhotographers(options?: { includeAllStatuses?: boolean; ownerId?: string }): PhotographerRecord[] {
  const conn = ensureDb();
  let rows: Record<string, unknown>[];
  if (options?.includeAllStatuses) {
    rows = conn.prepare(`SELECT * FROM photographers ORDER BY featured DESC, created_at DESC`).all() as Record<string, unknown>[];
  } else if (options?.ownerId) {
    rows = conn
      .prepare(`SELECT * FROM photographers WHERE status = 'approved' OR owner_id = ? ORDER BY featured DESC, created_at DESC`)
      .all(options.ownerId) as Record<string, unknown>[];
  } else {
    rows = conn.prepare(`SELECT * FROM photographers WHERE status = 'approved' ORDER BY featured DESC, created_at DESC`).all() as Record<string, unknown>[];
  }
  return rows.map(mapPhotographerRow);
}

export function getPhotographerById(id: string): PhotographerRecord | null {
  const row = ensureDb().prepare(`SELECT * FROM photographers WHERE id = ? LIMIT 1`).get(id) as Record<string, unknown> | undefined;
  return row ? mapPhotographerRow(row) : null;
}

export function createPhotographerRecord(input: {
  ownerId: string;
  displayName: string;
  specialtyAr: string;
  city: string;
  studioLocation: string;
  yearsExperience: number;
  workingHours: string;
  startingPrice: number;
  discountPercent?: number;
  bioAr: string;
  equipmentAr: string;
  shootingTypes: string[];
  avatarUrl: string;
  coverImage: string;
  videoReelUrl?: string;
  initialAlbum?: {
    titleAr: string;
    descriptionAr: string;
    sessionDate: string;
    locationAr: string;
    photos: string[];
  };
  status?: ApprovalStatus;
}): PhotographerRecord {
  const conn = ensureDb();
  const id = `photo-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO photographers (
        id, owner_id, display_name, specialty_ar, city, studio_location, years_experience,
        working_hours, starting_price, discount_percent, bio_ar, equipment_ar, shooting_types_json,
        avatar_url, cover_image, video_reel_url, status, featured, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `)
    .run(
      id,
      input.ownerId,
      input.displayName,
      input.specialtyAr,
      input.city,
      input.studioLocation,
      input.yearsExperience,
      input.workingHours,
      input.startingPrice,
      input.discountPercent || 0,
      input.bioAr,
      input.equipmentAr,
      JSON.stringify(input.shootingTypes),
      input.avatarUrl,
      input.coverImage,
      input.videoReelUrl || '',
      input.status || 'pending',
      now
    );

  if (input.initialAlbum && input.initialAlbum.photos.length > 0) {
    conn
      .prepare(`
        INSERT INTO photographer_albums (id, photographer_id, title_ar, description_ar, session_date, location_ar, photos_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        `alb-${crypto.randomUUID().slice(0, 8)}`,
        id,
        input.initialAlbum.titleAr,
        input.initialAlbum.descriptionAr,
        input.initialAlbum.sessionDate,
        input.initialAlbum.locationAr,
        JSON.stringify(input.initialAlbum.photos)
      );
  }
  return getPhotographerById(id)!;
}

export function addPhotographerAlbum(
  photographerId: string,
  album: { titleAr: string; descriptionAr: string; sessionDate: string; locationAr: string; photos: string[] }
): PhotographerRecord | null {
  const conn = ensureDb();
  conn
    .prepare(`
      INSERT INTO photographer_albums (id, photographer_id, title_ar, description_ar, session_date, location_ar, photos_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      `alb-${crypto.randomUUID().slice(0, 8)}`,
      photographerId,
      album.titleAr,
      album.descriptionAr,
      album.sessionDate,
      album.locationAr,
      JSON.stringify(album.photos)
    );
  return getPhotographerById(photographerId);
}

export function updatePhotographerStatus(id: string, status: ApprovalStatus, featured?: boolean): PhotographerRecord | null {
  const conn = ensureDb();
  if (featured !== undefined) {
    conn.prepare(`UPDATE photographers SET status = ?, featured = ? WHERE id = ?`).run(status, featured ? 1 : 0, id);
  } else {
    conn.prepare(`UPDATE photographers SET status = ? WHERE id = ?`).run(status, id);
  }
  return getPhotographerById(id);
}

export function deletePhotographerRecord(id: string): boolean {
  const info = ensureDb().prepare(`DELETE FROM photographers WHERE id = ?`).run(id);
  return Number(info.changes) > 0;
}

// --- Services ---
function mapServiceRow(row: Record<string, unknown>): ServiceRecord {
  const id = String(row.id);
  const stats = computeRatingStats('service', id);
  return {
    id,
    ownerId: String(row.owner_id),
    providerName: String(row.provider_name),
    category: String(row.category) as ServiceCategoryKey,
    titleAr: String(row.title_ar),
    city: String(row.city),
    area: String(row.area),
    startingPrice: Number(row.starting_price),
    discountPercent: Number(row.discount_percent || 0),
    workingHours: String(row.working_hours),
    descriptionAr: String(row.description_ar),
    packagesAr: parseJsonArray<string>(row.packages_json),
    coverImage: String(row.cover_image),
    galleryImages: parseJsonArray<string>(row.gallery_json),
    videoUrl: String(row.video_url || ''),
    status: String(row.status) as ApprovalStatus,
    featured: Boolean(row.featured),
    avgRating: stats.avgRating,
    reviewsCount: stats.reviewsCount,
    createdAt: String(row.created_at),
  };
}

export function listServices(options?: { includeAllStatuses?: boolean; ownerId?: string }): ServiceRecord[] {
  const conn = ensureDb();
  let rows: Record<string, unknown>[];
  if (options?.includeAllStatuses) {
    rows = conn.prepare(`SELECT * FROM services ORDER BY featured DESC, created_at DESC`).all() as Record<string, unknown>[];
  } else if (options?.ownerId) {
    rows = conn
      .prepare(`SELECT * FROM services WHERE status = 'approved' OR owner_id = ? ORDER BY featured DESC, created_at DESC`)
      .all(options.ownerId) as Record<string, unknown>[];
  } else {
    rows = conn.prepare(`SELECT * FROM services WHERE status = 'approved' ORDER BY featured DESC, created_at DESC`).all() as Record<string, unknown>[];
  }
  return rows.map(mapServiceRow);
}

export function getServiceById(id: string): ServiceRecord | null {
  const row = ensureDb().prepare(`SELECT * FROM services WHERE id = ? LIMIT 1`).get(id) as Record<string, unknown> | undefined;
  return row ? mapServiceRow(row) : null;
}

export function createServiceRecord(input: {
  ownerId: string;
  providerName: string;
  category: ServiceCategoryKey;
  titleAr: string;
  city: string;
  area: string;
  startingPrice: number;
  discountPercent?: number;
  workingHours: string;
  descriptionAr: string;
  packagesAr: string[];
  coverImage: string;
  galleryImages: string[];
  status?: ApprovalStatus;
}): ServiceRecord {
  const conn = ensureDb();
  const id = `srv-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO services (
        id, owner_id, provider_name, category, title_ar, city, area, starting_price,
        discount_percent, working_hours, description_ar, packages_json, cover_image,
        gallery_json, video_url, status, featured, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 0, ?)
    `)
    .run(
      id,
      input.ownerId,
      input.providerName,
      input.category,
      input.titleAr,
      input.city,
      input.area,
      input.startingPrice,
      input.discountPercent || 0,
      input.workingHours,
      input.descriptionAr,
      JSON.stringify(input.packagesAr),
      input.coverImage,
      JSON.stringify(input.galleryImages),
      input.status || 'pending',
      now
    );
  return getServiceById(id)!;
}

export function updateServiceStatus(id: string, status: ApprovalStatus, featured?: boolean): ServiceRecord | null {
  const conn = ensureDb();
  if (featured !== undefined) {
    conn.prepare(`UPDATE services SET status = ?, featured = ? WHERE id = ?`).run(status, featured ? 1 : 0, id);
  } else {
    conn.prepare(`UPDATE services SET status = ? WHERE id = ?`).run(status, id);
  }
  return getServiceById(id);
}

export function deleteServiceRecord(id: string): boolean {
  const info = ensureDb().prepare(`DELETE FROM services WHERE id = ?`).run(id);
  return Number(info.changes) > 0;
}

// --- Customer Requests (Strictly separated by section) ---
function mapRequestRow(row: Record<string, unknown>): CustomerRequestRecord {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: String(row.client_name),
    clientPhone: String(row.client_phone),
    requestSection: String(row.request_section) as TargetEntityType,
    serviceCategory: row.service_category ? (String(row.service_category) as ServiceCategoryKey) : undefined,
    titleAr: String(row.title_ar),
    eventDate: String(row.event_date),
    city: String(row.city),
    area: String(row.area),
    guestsCount: Number(row.guests_count),
    budgetEgp: Number(row.budget_egp),
    preferredType: String(row.preferred_type || ''),
    requestedServices: parseJsonArray<string>(row.requested_services_json),
    notesAr: String(row.notes_ar || ''),
    status: String(row.status) as 'open' | 'matched' | 'closed',
    createdAt: String(row.created_at),
  };
}

export function listCustomerRequests(section?: TargetEntityType): CustomerRequestRecord[] {
  const conn = ensureDb();
  const rows = section
    ? (conn.prepare(`SELECT * FROM customer_requests WHERE request_section = ? ORDER BY created_at DESC`).all(section) as Record<string, unknown>[])
    : (conn.prepare(`SELECT * FROM customer_requests ORDER BY created_at DESC`).all() as Record<string, unknown>[]);
  return rows.map(mapRequestRow);
}

export function createCustomerRequest(input: {
  clientId: string;
  clientName: string;
  clientPhone: string;
  requestSection: TargetEntityType;
  serviceCategory?: ServiceCategoryKey;
  titleAr: string;
  eventDate: string;
  city: string;
  area: string;
  guestsCount: number;
  budgetEgp: number;
  preferredType: string;
  requestedServices: string[];
  notesAr: string;
}): CustomerRequestRecord {
  const conn = ensureDb();
  const id = `req-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO customer_requests (
        id, client_id, client_name, client_phone, request_section, service_category,
        title_ar, event_date, city, area, guests_count, budget_egp, preferred_type,
        requested_services_json, notes_ar, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `)
    .run(
      id,
      input.clientId,
      input.clientName,
      input.clientPhone,
      input.requestSection,
      input.serviceCategory || '',
      input.titleAr,
      input.eventDate,
      input.city,
      input.area,
      input.guestsCount,
      input.budgetEgp,
      input.preferredType,
      JSON.stringify(input.requestedServices),
      input.notesAr,
      now
    );
  const row = conn.prepare(`SELECT * FROM customer_requests WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapRequestRow(row);
}

export function updateCustomerRequestStatus(id: string, status: 'open' | 'matched' | 'closed'): CustomerRequestRecord | null {
  const conn = ensureDb();
  conn.prepare(`UPDATE customer_requests SET status = ? WHERE id = ?`).run(status, id);
  const row = conn.prepare(`SELECT * FROM customer_requests WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? mapRequestRow(row) : null;
}

export function deleteCustomerRequest(id: string): boolean {
  return Number(ensureDb().prepare(`DELETE FROM customer_requests WHERE id = ?`).run(id).changes) > 0;
}

// --- Smart Bookings & Dual Approval ---
function mapBookingRow(row: Record<string, unknown>): BookingRecord {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: String(row.client_name),
    clientPhone: String(row.client_phone),
    providerOwnerId: String(row.provider_owner_id),
    targetType: String(row.target_type) as TargetEntityType,
    targetId: String(row.target_id),
    targetTitle: String(row.target_title),
    targetImage: String(row.target_image),
    eventDate: String(row.event_date),
    guestsCount: Number(row.guests_count),
    estimatedTotalEgp: Number(row.estimated_total_egp),
    paymentMode: (String(row.payment_mode || 'offline_agreement') as 'offline_agreement' | 'deposit_ready'),
    notes: String(row.notes || ''),
    providerApproved: Boolean(row.provider_approved),
    adminApproved: Boolean(row.admin_approved),
    status: String(row.status) as BookingStatus,
    providerNote: String(row.provider_note || ''),
    adminNote: String(row.admin_note || ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function listAllBookings(): BookingRecord[] {
  const rows = ensureDb().prepare(`SELECT * FROM bookings ORDER BY created_at DESC`).all() as Record<string, unknown>[];
  return rows.map(mapBookingRow);
}

export function listBookingsForUser(user: UserProfile): BookingRecord[] {
  const conn = ensureDb();
  if (user.role === 'admin') return listAllBookings();
  const rows = conn
    .prepare(`SELECT * FROM bookings WHERE client_id = ? OR provider_owner_id = ? ORDER BY created_at DESC`)
    .all(user.id, user.id) as Record<string, unknown>[];
  return rows.map(mapBookingRow);
}

export function getBookingById(id: string): BookingRecord | null {
  const row = ensureDb().prepare(`SELECT * FROM bookings WHERE id = ? LIMIT 1`).get(id) as Record<string, unknown> | undefined;
  return row ? mapBookingRow(row) : null;
}

export function createBookingRecord(input: {
  clientId: string;
  clientName: string;
  clientPhone: string;
  providerOwnerId: string;
  targetType: TargetEntityType;
  targetId: string;
  targetTitle: string;
  targetImage: string;
  eventDate: string;
  guestsCount: number;
  estimatedTotalEgp: number;
  notes: string;
}): BookingRecord {
  const conn = ensureDb();
  const id = `bk-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO bookings (
        id, client_id, client_name, client_phone, provider_owner_id, target_type, target_id,
        target_title, target_image, event_date, guests_count, estimated_total_egp,
        payment_mode, notes, provider_approved, admin_approved, status, provider_note, admin_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline_agreement', ?, 0, 0, 'pending', '', '', ?, ?)
    `)
    .run(
      id,
      input.clientId,
      input.clientName,
      input.clientPhone,
      input.providerOwnerId,
      input.targetType,
      input.targetId,
      input.targetTitle,
      input.targetImage,
      input.eventDate,
      input.guestsCount,
      input.estimatedTotalEgp,
      input.notes,
      now,
      now
    );
  return getBookingById(id)!;
}

export function updateBookingApproval(
  bookingId: string,
  actor: 'provider' | 'admin' | 'cancel',
  decision: 'approve' | 'reject' | 'cancel',
  note: string
): BookingRecord | null {
  const conn = ensureDb();
  const existing = getBookingById(bookingId);
  if (!existing) return null;

  let providerApproved = existing.providerApproved;
  let adminApproved = existing.adminApproved;
  let providerNote = existing.providerNote;
  let adminNote = existing.adminNote;
  let rejected = false;
  let cancelled = false;

  if (actor === 'cancel' || decision === 'cancel') {
    cancelled = true;
  } else if (actor === 'provider') {
    providerNote = note;
    if (decision === 'approve') providerApproved = true;
    else {
      providerApproved = false;
      rejected = true;
    }
  } else if (actor === 'admin') {
    adminNote = note;
    if (decision === 'approve') adminApproved = true;
    else {
      adminApproved = false;
      rejected = true;
    }
  }

  const nextStatus = resolveNextBookingStatus({
    providerApproved,
    adminApproved,
    rejected,
    cancelled,
  });

  const now = new Date().toISOString();
  conn
    .prepare(`
      UPDATE bookings
      SET provider_approved = ?, admin_approved = ?, status = ?, provider_note = ?, admin_note = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(providerApproved ? 1 : 0, adminApproved ? 1 : 0, nextStatus, providerNote, adminNote, now, bookingId);

  return getBookingById(bookingId);
}

// --- Reviews ---
function mapReviewRow(row: Record<string, unknown>): ReviewRecord {
  return {
    id: String(row.id),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    targetType: String(row.target_type) as TargetEntityType,
    targetId: String(row.target_id),
    rating: Number(row.rating),
    commentAr: String(row.comment_ar),
    status: String(row.status) as ApprovalStatus,
    createdAt: String(row.created_at),
  };
}

export function listReviews(options?: {
  targetType?: TargetEntityType;
  targetId?: string;
  includeAll?: boolean;
}): ReviewRecord[] {
  const conn = ensureDb();
  let rows: Record<string, unknown>[];
  if (options?.targetType && options?.targetId) {
    rows = conn
      .prepare(`SELECT * FROM reviews WHERE target_type = ? AND target_id = ? AND status = 'approved' ORDER BY created_at DESC`)
      .all(options.targetType, options.targetId) as Record<string, unknown>[];
  } else if (options?.includeAll) {
    rows = conn.prepare(`SELECT * FROM reviews ORDER BY created_at DESC`).all() as Record<string, unknown>[];
  } else {
    rows = conn.prepare(`SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC`).all() as Record<string, unknown>[];
  }
  return rows.map(mapReviewRow);
}

export function createReviewRecord(input: {
  authorId: string;
  authorName: string;
  targetType: TargetEntityType;
  targetId: string;
  rating: number;
  commentAr: string;
}): ReviewRecord {
  const conn = ensureDb();
  const id = `rev-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO reviews (id, author_id, author_name, target_type, target_id, rating, comment_ar, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `)
    .run(id, input.authorId, input.authorName, input.targetType, input.targetId, input.rating, input.commentAr, now);
  const row = conn.prepare(`SELECT * FROM reviews WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapReviewRow(row);
}

export function updateReviewStatus(id: string, status: ApprovalStatus): ReviewRecord | null {
  const conn = ensureDb();
  conn.prepare(`UPDATE reviews SET status = ? WHERE id = ?`).run(status, id);
  const row = conn.prepare(`SELECT * FROM reviews WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? mapReviewRow(row) : null;
}

export function deleteReviewRecord(id: string): boolean {
  return Number(ensureDb().prepare(`DELETE FROM reviews WHERE id = ?`).run(id).changes) > 0;
}

// --- Favorites ---
export function listFavoritesForUser(userId: string): FavoriteRecord[] {
  const rows = ensureDb()
    .prepare(`SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    targetType: String(r.target_type) as TargetEntityType,
    targetId: String(r.target_id),
    createdAt: String(r.created_at),
  }));
}

export function toggleFavoriteRecord(userId: string, targetType: TargetEntityType, targetId: string): { favorited: boolean } {
  const conn = ensureDb();
  const existing = conn
    .prepare(`SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?`)
    .get(userId, targetType, targetId) as { id: string } | undefined;
  if (existing) {
    conn.prepare(`DELETE FROM favorites WHERE id = ?`).run(existing.id);
    return { favorited: false };
  }
  conn
    .prepare(`INSERT INTO favorites (id, user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(`fav-${crypto.randomUUID().slice(0, 8)}`, userId, targetType, targetId, new Date().toISOString());
  return { favorited: true };
}

// --- Notifications ---
export function createNotification(input: {
  userId: string;
  titleAr: string;
  bodyAr: string;
  kind?: 'booking' | 'approval' | 'review' | 'system';
  relatedRoute?: string;
}): void {
  ensureDb()
    .prepare(`
      INSERT INTO notifications (id, user_id, title_ar, body_ar, kind, related_route, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `)
    .run(
      `notif-${crypto.randomUUID().slice(0, 8)}`,
      input.userId,
      input.titleAr,
      input.bodyAr,
      input.kind || 'system',
      input.relatedRoute || '',
      new Date().toISOString()
    );
}

export function notifyAllAdmins(input: { titleAr: string; bodyAr: string; kind?: 'booking' | 'approval' | 'review' | 'system' }): void {
  const admins = ensureDb().prepare(`SELECT id FROM users WHERE role = 'admin' AND status = 'active'`).all() as { id: string }[];
  for (const a of admins) {
    createNotification({
      userId: a.id,
      titleAr: input.titleAr,
      bodyAr: input.bodyAr,
      kind: input.kind || 'approval',
      relatedRoute: 'admin',
    });
  }
}

export function listNotificationsForUser(userId: string): NotificationRecord[] {
  const rows = ensureDb()
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
    .all(userId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    titleAr: String(r.title_ar),
    bodyAr: String(r.body_ar),
    kind: String(r.kind) as NotificationRecord['kind'],
    relatedRoute: String(r.related_route || ''),
    isRead: Boolean(r.is_read),
    createdAt: String(r.created_at),
  }));
}

export function markNotificationRead(userId: string, notifId?: string): void {
  const conn = ensureDb();
  if (notifId) {
    conn.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(notifId, userId);
  } else {
    conn.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(userId);
  }
}

// --- Electronic Invitations & Public RSVP ---
export function getInvitationTemplatePrices(): Record<InvitationDesignId, number> {
  const conn = ensureDb();
  const rows = conn
    .prepare(`SELECT design_id, price_egp FROM invitation_template_prices`)
    .all() as Array<{ design_id: string; price_egp: number }>;
  const map: Record<InvitationDesignId, number> = {
    royal: INVITATION_DESIGNS.royal.priceEgp,
    luxury: INVITATION_DESIGNS.luxury.priceEgp,
    romantic: INVITATION_DESIGNS.romantic.priceEgp,
    classic: INVITATION_DESIGNS.classic.priceEgp,
    modern: INVITATION_DESIGNS.modern.priceEgp,
    floral: INVITATION_DESIGNS.floral.priceEgp,
    minimal: INVITATION_DESIGNS.minimal.priceEgp,
  };
  for (const r of rows) {
    if (r.design_id in map) {
      map[r.design_id as InvitationDesignId] = Math.max(0, Number(r.price_egp) || 0);
    }
  }
  return map;
}

export function updateInvitationTemplatePrice(
  designId: InvitationDesignId,
  priceEgp: number
): Record<InvitationDesignId, number> {
  const conn = ensureDb();
  const safePrice = Math.min(50000, Math.max(0, Math.round(Number(priceEgp) || 0)));
  const nowIso = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO invitation_template_prices (design_id, price_egp, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(design_id) DO UPDATE SET price_egp = excluded.price_egp, updated_at = excluded.updated_at
    `)
    .run(designId, safePrice, nowIso);
  return getInvitationTemplatePrices();
}

function mapInvitationRow(row: Record<string, unknown>, includeStats = false): ElectronicInvitationRecord {
  const id = String(row.id);
  const designId = String(row.design_id) as InvitationDesignId;
  const fallbackPrice = INVITATION_DESIGNS[designId]?.priceEgp ?? 0;
  const base: ElectronicInvitationRecord = {
    id,
    ownerId: String(row.owner_id),
    slug: String(row.slug),
    designId,
    designPriceEgp: row.design_price_egp !== undefined ? Math.max(0, Number(row.design_price_egp) || 0) : fallbackPrice,
    groomName: String(row.groom_name),
    brideName: String(row.bride_name),
    weddingDate: String(row.wedding_date),
    weddingTime: String(row.wedding_time),
    venueName: String(row.venue_name),
    mapUrl: String(row.map_url),
    invitationText: String(row.invitation_text),
    couplePhoto: String(row.couple_photo),
    contactPhone: String(row.contact_phone),
    createdAt: String(row.created_at),
  };
  if (includeStats) {
    const rsvps = listInvitationRsvps(id);
    base.stats = summarizeInvitationRsvps(rsvps);
  }
  return base;
}

export function listInvitationsForOwner(ownerId?: string): ElectronicInvitationRecord[] {
  const conn = ensureDb();
  const rows = ownerId
    ? (conn.prepare(`SELECT * FROM invitations WHERE owner_id = ? ORDER BY created_at DESC`).all(ownerId) as Record<string, unknown>[])
    : (conn.prepare(`SELECT * FROM invitations ORDER BY created_at DESC`).all() as Record<string, unknown>[]);
  return rows.map((r) => mapInvitationRow(r, true));
}

export function getInvitationBySlug(slug: string): ElectronicInvitationRecord | null {
  const row = ensureDb().prepare(`SELECT * FROM invitations WHERE slug = ? LIMIT 1`).get(slug) as Record<string, unknown> | undefined;
  return row ? mapInvitationRow(row, true) : null;
}

export function createInvitationRecord(input: {
  ownerId: string;
  slug: string;
  designId: InvitationDesignId;
  designPriceEgp?: number;
  groomName: string;
  brideName: string;
  weddingDate: string;
  weddingTime: string;
  venueName: string;
  mapUrl: string;
  invitationText: string;
  couplePhoto: string;
  contactPhone: string;
}): ElectronicInvitationRecord {
  const conn = ensureDb();
  const id = `inv-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const prices = getInvitationTemplatePrices();
  const resolvedPrice =
    input.designPriceEgp !== undefined
      ? Math.max(0, Math.round(input.designPriceEgp))
      : prices[input.designId] ?? 0;

  conn
    .prepare(`
      INSERT INTO invitations (
        id, owner_id, slug, design_id, design_price_egp, groom_name, bride_name, wedding_date, wedding_time,
        venue_name, map_url, invitation_text, couple_photo, contact_phone, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.ownerId,
      input.slug,
      input.designId,
      resolvedPrice,
      input.groomName,
      input.brideName,
      input.weddingDate,
      input.weddingTime,
      input.venueName,
      input.mapUrl,
      input.invitationText,
      input.couplePhoto,
      input.contactPhone,
      now
    );
  return getInvitationBySlug(input.slug)!;
}

export function deleteInvitationRecord(id: string): boolean {
  return Number(ensureDb().prepare(`DELETE FROM invitations WHERE id = ?`).run(id).changes) > 0;
}

export function listInvitationRsvps(invitationId: string): InvitationRsvpRecord[] {
  const rows = ensureDb()
    .prepare(`SELECT * FROM invitation_rsvps WHERE invitation_id = ? ORDER BY created_at DESC`)
    .all(invitationId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    invitationId: String(r.invitation_id),
    guestName: String(r.guest_name),
    guestPhone: String(r.guest_phone || ''),
    response: String(r.response) as 'attending' | 'declined',
    companionsCount: Number(r.companions_count || 1),
    congratulationMessage: String(r.congratulation_message || ''),
    createdAt: String(r.created_at),
  }));
}

export function addInvitationRsvp(input: {
  invitationId: string;
  guestName: string;
  guestPhone?: string;
  response: 'attending' | 'declined';
  companionsCount?: number;
  congratulationMessage?: string;
}): InvitationRsvpRecord {
  const conn = ensureDb();
  const id = `rsvp-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  conn
    .prepare(`
      INSERT INTO invitation_rsvps (id, invitation_id, guest_name, guest_phone, response, companions_count, congratulation_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.invitationId,
      input.guestName.trim(),
      (input.guestPhone || '').trim(),
      input.response,
      Math.max(1, Number(input.companionsCount) || 1),
      (input.congratulationMessage || '').trim(),
      now
    );
  return {
    id,
    invitationId: input.invitationId,
    guestName: input.guestName.trim(),
    guestPhone: (input.guestPhone || '').trim(),
    response: input.response,
    companionsCount: Math.max(1, Number(input.companionsCount) || 1),
    congratulationMessage: (input.congratulationMessage || '').trim(),
    createdAt: now,
  };
}

// --- Audit Logs ---
export function logAdminAction(admin: UserProfile, actionAr: string, entityType: string, entityId: string): void {
  ensureDb()
    .prepare(`
      INSERT INTO admin_audit_logs (id, admin_id, admin_name, action_ar, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(`log-${crypto.randomUUID().slice(0, 8)}`, admin.id, admin.name, actionAr, entityType, entityId, new Date().toISOString());
}

export function listAdminAuditLogs(): AdminAuditLogRecord[] {
  const rows = ensureDb()
    .prepare(`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100`)
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    adminId: String(r.admin_id),
    adminName: String(r.admin_name),
    actionAr: String(r.action_ar),
    entityType: String(r.entity_type),
    entityId: String(r.entity_id),
    createdAt: String(r.created_at),
  }));
}

// --- WhatsApp Automated Reminders ---
function mapWhatsAppReminderRow(row: Record<string, unknown>): WhatsAppReminderRecord {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    milestone: String(row.milestone) as WhatsAppMilestone,
    recipientPhone: String(row.recipient_phone),
    clientName: String(row.client_name),
    targetTitle: String(row.target_title),
    eventDate: String(row.event_date),
    eventTime: String(row.event_time),
    messageBody: String(row.message_body),
    provider: String(row.provider) as WhatsAppProviderKind,
    status: String(row.status) as WhatsAppReminderStatus,
    providerMessageId: String(row.provider_message_id || ''),
    errorText: String(row.error_text || ''),
    sentAt: String(row.sent_at || ''),
    createdAt: String(row.created_at),
  };
}

export function listWhatsAppReminders(limit = 100): WhatsAppReminderRecord[] {
  const safeLimit = Math.min(300, Math.max(1, Math.floor(limit)));
  const rows = ensureDb()
    .prepare(`SELECT * FROM whatsapp_reminders ORDER BY created_at DESC LIMIT ?`)
    .all(safeLimit) as Record<string, unknown>[];
  return rows.map(mapWhatsAppReminderRow);
}

export function getWhatsAppReminderByBookingMilestone(
  bookingId: string,
  milestone: WhatsAppMilestone
): WhatsAppReminderRecord | null {
  const row = ensureDb()
    .prepare(`SELECT * FROM whatsapp_reminders WHERE booking_id = ? AND milestone = ? LIMIT 1`)
    .get(bookingId, milestone) as Record<string, unknown> | undefined;
  return row ? mapWhatsAppReminderRow(row) : null;
}

export function upsertWhatsAppReminder(input: {
  bookingId: string;
  milestone: WhatsAppMilestone;
  recipientPhone: string;
  clientName: string;
  targetTitle: string;
  eventDate: string;
  eventTime: string;
  messageBody: string;
  provider: WhatsAppProviderKind;
  status: WhatsAppReminderStatus;
  providerMessageId?: string;
  errorText?: string;
  sentAt?: string;
}): WhatsAppReminderRecord {
  const conn = ensureDb();
  const existing = getWhatsAppReminderByBookingMilestone(input.bookingId, input.milestone);
  const now = new Date().toISOString();
  if (existing) {
    conn
      .prepare(`
        UPDATE whatsapp_reminders
        SET recipient_phone = ?, client_name = ?, target_title = ?, event_date = ?, event_time = ?,
            message_body = ?, provider = ?, status = ?, provider_message_id = ?, error_text = ?, sent_at = ?
        WHERE id = ?
      `)
      .run(
        input.recipientPhone,
        input.clientName,
        input.targetTitle,
        input.eventDate,
        input.eventTime,
        input.messageBody,
        input.provider,
        input.status,
        input.providerMessageId || '',
        input.errorText || '',
        input.sentAt || now,
        existing.id
      );
    return getWhatsAppReminderByBookingMilestone(input.bookingId, input.milestone)!;
  }

  const id = `wa-${crypto.randomUUID().slice(0, 10)}`;
  conn
    .prepare(`
      INSERT INTO whatsapp_reminders (
        id, booking_id, milestone, recipient_phone, client_name, target_title,
        event_date, event_time, message_body, provider, status,
        provider_message_id, error_text, sent_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.bookingId,
      input.milestone,
      input.recipientPhone,
      input.clientName,
      input.targetTitle,
      input.eventDate,
      input.eventTime,
      input.messageBody,
      input.provider,
      input.status,
      input.providerMessageId || '',
      input.errorText || '',
      input.sentAt || now,
      now
    );
  return getWhatsAppReminderByBookingMilestone(input.bookingId, input.milestone)!;
}

// --- Personal Couple Wedding Workspace ---
function mapCoupleWorkspaceRow(row: Record<string, unknown>): CoupleWorkspaceRecord {
  return {
    userId: String(row.user_id),
    coupleTitle: String(row.couple_title || 'مساحة فرحنا في VÉLORA'),
    governorate: String(row.governorate || 'القاهرة'),
    weddingDate: String(row.wedding_date || ''),
    guestsCount: Math.max(10, Number(row.guests_count) || 200),
    totalBudgetEgp: Math.max(0, Number(row.total_budget_egp) || 0),
    dreamStyle: (String(row.dream_style || 'royal_palace') as WeddingDreamStyle),
    prepItems: parseJsonArray<CouplePrepItem>(row.prep_items_json),
    tasks: parseJsonArray<CoupleTaskItem>(row.tasks_json),
    agreements: parseJsonArray<CoupleAgreementItem>(row.agreements_json),
    compareMode: row.compare_mode === 'photographer' ? 'photographer' : 'venue',
    comparedIds: parseJsonArray<string>(row.compared_ids_json).slice(0, 3),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export function getCoupleWorkspace(userId: string, fallbackName?: string): CoupleWorkspaceRecord {
  const conn = ensureDb();
  const row = conn
    .prepare(`SELECT * FROM couple_workspaces WHERE user_id = ? LIMIT 1`)
    .get(userId) as Record<string, unknown> | undefined;
  if (row) {
    return mapCoupleWorkspaceRow(row);
  }
  const defaults = createDefaultCoupleWorkspace(userId, fallbackName);
  conn
    .prepare(`
      INSERT INTO couple_workspaces (
        user_id, couple_title, governorate, wedding_date, guests_count, total_budget_egp,
        dream_style, prep_items_json, tasks_json, agreements_json, compare_mode, compared_ids_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      userId,
      defaults.coupleTitle,
      defaults.governorate,
      defaults.weddingDate,
      defaults.guestsCount,
      defaults.totalBudgetEgp,
      defaults.dreamStyle,
      JSON.stringify(defaults.prepItems),
      JSON.stringify(defaults.tasks),
      JSON.stringify(defaults.agreements),
      defaults.compareMode,
      JSON.stringify(defaults.comparedIds),
      defaults.updatedAt
    );
  return defaults;
}

export function saveCoupleWorkspace(
  userId: string,
  patch: Partial<Omit<CoupleWorkspaceRecord, 'userId' | 'updatedAt'>>,
  fallbackName?: string
): CoupleWorkspaceRecord {
  const conn = ensureDb();
  const existing = getCoupleWorkspace(userId, fallbackName);
  const now = new Date().toISOString();

  const validStyles: WeddingDreamStyle[] = [
    'royal_palace',
    'nile_garden',
    'modern_chic',
    'intimate_boutique',
    'classic_heritage',
  ];

  const next: CoupleWorkspaceRecord = {
    userId,
    coupleTitle:
      typeof patch.coupleTitle === 'string' && patch.coupleTitle.trim()
        ? patch.coupleTitle.trim().slice(0, 80)
        : existing.coupleTitle,
    governorate:
      typeof patch.governorate === 'string' && patch.governorate.trim()
        ? patch.governorate.trim().slice(0, 40)
        : existing.governorate,
    weddingDate:
      typeof patch.weddingDate === 'string'
        ? patch.weddingDate.trim().slice(0, 10)
        : existing.weddingDate,
    guestsCount:
      patch.guestsCount !== undefined
        ? Math.min(3000, Math.max(10, Math.round(Number(patch.guestsCount) || 150)))
        : existing.guestsCount,
    totalBudgetEgp:
      patch.totalBudgetEgp !== undefined
        ? Math.min(20000000, Math.max(0, Math.round(Number(patch.totalBudgetEgp) || 0)))
        : existing.totalBudgetEgp,
    dreamStyle:
      patch.dreamStyle && validStyles.includes(patch.dreamStyle)
        ? patch.dreamStyle
        : existing.dreamStyle,
    prepItems: Array.isArray(patch.prepItems)
      ? patch.prepItems.slice(0, 40).map((item, idx) => ({
          id: String(item.id || `prep-${idx + 1}`).slice(0, 40),
          category: item.category || 'other',
          labelAr: String(item.labelAr || 'بند تجهيز').trim().slice(0, 80),
          vendorName: String(item.vendorName || '').trim().slice(0, 100),
          allocatedEgp: Math.max(0, Math.round(Number(item.allocatedEgp) || 0)),
          paidEgp: Math.max(0, Math.round(Number(item.paidEgp) || 0)),
          status:
            item.status === 'in_progress' || item.status === 'booked' || item.status === 'done'
              ? item.status
              : 'pending',
          notes: String(item.notes || '').trim().slice(0, 300),
        }))
      : existing.prepItems,
    tasks: Array.isArray(patch.tasks)
      ? patch.tasks.slice(0, 80).map((t, idx) => ({
          id: String(t.id || `task-${idx + 1}`).slice(0, 40),
          titleAr: String(t.titleAr || '').trim().slice(0, 160),
          horizonAr: String(t.horizonAr || '').trim().slice(0, 60),
          done: Boolean(t.done),
          dueDate: String(t.dueDate || '').trim().slice(0, 10),
        }))
      : existing.tasks,
    agreements: Array.isArray(patch.agreements)
      ? patch.agreements.slice(0, 50).map((a, idx) => ({
          id: String(a.id || `agr-${idx + 1}`).slice(0, 40),
          titleAr: String(a.titleAr || '').trim().slice(0, 120),
          vendorName: String(a.vendorName || '').trim().slice(0, 100),
          date: String(a.date || '').trim().slice(0, 10),
          time: String(a.time || '').trim().slice(0, 20),
          location: String(a.location || '').trim().slice(0, 140),
          status: a.status === 'completed' ? 'completed' : 'scheduled',
        }))
      : existing.agreements,
    compareMode: patch.compareMode === 'photographer' ? 'photographer' : existing.compareMode,
    comparedIds: Array.isArray(patch.comparedIds)
      ? patch.comparedIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 3)
      : existing.comparedIds,
    updatedAt: now,
  };

  if (patch.compareMode === 'venue') next.compareMode = 'venue';

  conn
    .prepare(`
      UPDATE couple_workspaces
      SET couple_title = ?, governorate = ?, wedding_date = ?, guests_count = ?, total_budget_egp = ?,
          dream_style = ?, prep_items_json = ?, tasks_json = ?, agreements_json = ?,
          compare_mode = ?, compared_ids_json = ?, updated_at = ?
      WHERE user_id = ?
    `)
    .run(
      next.coupleTitle,
      next.governorate,
      next.weddingDate,
      next.guestsCount,
      next.totalBudgetEgp,
      next.dreamStyle,
      JSON.stringify(next.prepItems),
      JSON.stringify(next.tasks),
      JSON.stringify(next.agreements),
      next.compareMode,
      JSON.stringify(next.comparedIds),
      next.updatedAt,
      userId
    );

  return next;
}

// --- Platform Subscription Plans & Requests ---
function seedSubscriptionPlans(conn: DatabaseSync): void {
  const insertPlan = conn.prepare(`
    INSERT INTO subscription_plans (
      id, audience, target_roles_ar, name_ar, tagline_ar,
      monthly_price_egp, quarterly_price_egp, annual_price_egp, billing_note_ar, features_json, highlighted, active, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  insertPlan.run(
    'plan-provider-starter',
    'provider',
    'مصور مستقل · مقدم خدمة زفاف',
    'باقة البداية',
    'حضور رسمي منظم لاستقبال حجوزات العملاء وفحص التواريخ بسهولة.',
    950,
    2550,
    9500,
    'شهري أو كل 3 شهور أو سنوي بتوفير شهرين',
    JSON.stringify([
      'إدراج ملفك المعتمد داخل منصة VÉLORA',
      'معرض أعمال وألبومات حتى 15 صورة احترافية',
      'استقبال طلبات الحجز مع منع تعارض التواريخ',
      'إشعارات فورية على الحساب عند كل طلب حجز جديد',
    ]),
    0,
    1
  );

  insertPlan.run(
    'plan-provider-royal',
    'provider',
    'قاعات الأفراح · المصورون · الكوشة والديكور',
    'باقة النمو الملكي',
    'الباقة الأكثر طلبًا لزيادة الحجوزات والظهور في الترشيحات الذكية.',
    2400,
    6500,
    24000,
    'الأكثر اختيارًا لقاعات الأفراح واستوديوهات التصوير',
    JSON.stringify([
      'ظهور مميز في الصفحة الرئيسية ومحرك «اعثر على فرحك»',
      'تفعيل تذكيرات الواتساب التلقائية لعملائك (قبل 3 أيام · يوم · 6 ساعات)',
      'عدد غير محدود من الصور والألبومات وباقات الأسعار والخصومات',
      'أولوية في الترشيحات الذكية داخل محافظتك وتقارير الحجوزات',
    ]),
    1,
    2
  );

  insertPlan.run(
    'plan-provider-platinum',
    'provider',
    'القاعات الكبرى · سلاسل القصور · منظمو الحفلات',
    'الشريك البلاتيني',
    'صدارة كاملة للقصور والفنادق ومنظمي حفلات الزفاف المتكاملة.',
    4800,
    13000,
    48000,
    'يشمل إدارة حتى 5 قاعات أو خدمات متعددة',
    JSON.stringify([
      'إدراج حتى 5 قاعات أو خدمات متنوعة تحت حساب إداري واحد',
      'أولوية أولى في خطط «اعثر على فرحك» ومقارنة القاعات',
      'حملات ترويجية موسمية وإبراز العروض في الصفحة الرئيسية',
      'دعم مباشر لتأكيد الحجوزات وتقارير الأداء',
    ]),
    0,
    3
  );

  insertPlan.run(
    'plan-client-free',
    'client',
    'لكل عريس وعروسة',
    'باقة العروسين الأساسية',
    'تنظيم كامل لميزانية الفرح وقائمة التجهيزات ومقارنة الأسعار مجانًا.',
    0,
    0,
    0,
    'مجانًا بالكامل',
    JSON.stringify([
      'مساحة فرحنا لتتبع الميزانية والمدفوعات والمتبقي',
      'قائمة تجهيزات ومهام كاملة قابلة للتخصيص',
      'مقارنة حتى 3 قاعات أو 3 مصورين جنبًا إلى جنب',
      'تصميم دعوة إلكترونية تفاعلية ومتابعة ردود الضيوف',
    ]),
    0,
    4
  );

  insertPlan.run(
    'plan-client-vip',
    'client',
    'عروسين VIP · تجهيز متكامل',
    'باقة زفاف VIP بلس',
    'مزايا حصرية للعروسين لمتابعة الحجوزات والدعوات وتذكيرات المواعيد.',
    250,
    650,
    1100,
    'اشتراك شهري أو 3 شهور أو سنة كاملة حتى يوم الفرح',
    JSON.stringify([
      'تفعيل تنبيهات الواتساب الشخصية لمواعيد البروفات والمعاينات',
      'تصميم ومشاركة عدد غير محدود من الدعوات الإلكترونية',
      'أولوية تنسيق ومراجعة الحجوزات مع القاعات والمصورين',
      'مساعدة مخصصة لترشيح البدائل المناسبة لموعد فرحك',
    ]),
    1,
    5
  );
}

function mapSubscriptionPlanRow(row: Record<string, unknown>): SubscriptionPlanRecord {
  return {
    id: String(row.id),
    audience: String(row.audience) === 'client' ? 'client' : 'provider',
    targetRolesAr: String(row.target_roles_ar || ''),
    nameAr: String(row.name_ar || ''),
    taglineAr: String(row.tagline_ar || ''),
    monthlyPriceEgp: Math.max(0, Number(row.monthly_price_egp) || 0),
    quarterlyPriceEgp: Math.max(0, Number(row.quarterly_price_egp) || 0),
    annualPriceEgp: Math.max(0, Number(row.annual_price_egp) || 0),
    billingNoteAr: String(row.billing_note_ar || ''),
    features: parseJsonArray<string>(row.features_json),
    highlighted: Boolean(row.highlighted),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order) || 1,
  };
}

export function listSubscriptionPlans(includeInactive = false): SubscriptionPlanRecord[] {
  const conn = ensureDb();
  const rows = includeInactive
    ? (conn.prepare(`SELECT * FROM subscription_plans ORDER BY sort_order ASC`).all() as Record<string, unknown>[])
    : (conn.prepare(`SELECT * FROM subscription_plans WHERE active = 1 ORDER BY sort_order ASC`).all() as Record<string, unknown>[]);
  return rows.map(mapSubscriptionPlanRow);
}

export function getSubscriptionPlanById(id: string): SubscriptionPlanRecord | null {
  const row = ensureDb()
    .prepare(`SELECT * FROM subscription_plans WHERE id = ? LIMIT 1`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapSubscriptionPlanRow(row) : null;
}

export function updateSubscriptionPlan(
  id: string,
  patch: Partial<Omit<SubscriptionPlanRecord, 'id'>>
): SubscriptionPlanRecord | null {
  const conn = ensureDb();
  const existing = getSubscriptionPlanById(id);
  if (!existing) return null;

  const audience: SubscriptionAudience =
    patch.audience === 'client' || patch.audience === 'provider' ? patch.audience : existing.audience;
  const targetRolesAr =
    typeof patch.targetRolesAr === 'string' && patch.targetRolesAr.trim()
      ? patch.targetRolesAr.trim().slice(0, 120)
      : existing.targetRolesAr;
  const nameAr =
    typeof patch.nameAr === 'string' && patch.nameAr.trim()
      ? patch.nameAr.trim().slice(0, 80)
      : existing.nameAr;
  const taglineAr =
    typeof patch.taglineAr === 'string'
      ? patch.taglineAr.trim().slice(0, 220)
      : existing.taglineAr;
  const monthlyPriceEgp =
    patch.monthlyPriceEgp !== undefined
      ? Math.min(500000, Math.max(0, Math.round(Number(patch.monthlyPriceEgp) || 0)))
      : existing.monthlyPriceEgp;
  const quarterlyPriceEgp =
    patch.quarterlyPriceEgp !== undefined
      ? Math.min(1500000, Math.max(0, Math.round(Number(patch.quarterlyPriceEgp) || 0)))
      : existing.quarterlyPriceEgp;
  const annualPriceEgp =
    patch.annualPriceEgp !== undefined
      ? Math.min(5000000, Math.max(0, Math.round(Number(patch.annualPriceEgp) || 0)))
      : existing.annualPriceEgp;
  const billingNoteAr =
    typeof patch.billingNoteAr === 'string'
      ? patch.billingNoteAr.trim().slice(0, 140)
      : existing.billingNoteAr;
  const features = Array.isArray(patch.features)
    ? patch.features.map((f) => String(f).trim()).filter(Boolean).slice(0, 12)
    : existing.features;
  const highlighted = patch.highlighted !== undefined ? Boolean(patch.highlighted) : existing.highlighted;
  const active = patch.active !== undefined ? Boolean(patch.active) : existing.active;

  conn
    .prepare(`
      UPDATE subscription_plans
      SET audience = ?, target_roles_ar = ?, name_ar = ?, tagline_ar = ?,
          monthly_price_egp = ?, quarterly_price_egp = ?, annual_price_egp = ?, billing_note_ar = ?,
          features_json = ?, highlighted = ?, active = ?
      WHERE id = ?
    `)
    .run(
      audience,
      targetRolesAr,
      nameAr,
      taglineAr,
      monthlyPriceEgp,
      quarterlyPriceEgp,
      annualPriceEgp,
      billingNoteAr,
      JSON.stringify(features),
      highlighted ? 1 : 0,
      active ? 1 : 0,
      id
    );

  return getSubscriptionPlanById(id);
}

function mapUserSubscriptionRow(row: Record<string, unknown>): UserSubscriptionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    userRole: String(row.user_role) as UserRole,
    planId: String(row.plan_id),
    planNameAr: String(row.plan_name_ar),
    audience: String(row.audience) === 'client' ? 'client' : 'provider',
    billingCycle: (String(row.billing_cycle || 'monthly') as SubscriptionBillingCycle),
    amountEgp: Math.max(0, Number(row.amount_egp) || 0),
    contactPhone: String(row.contact_phone || ''),
    businessOrCoupleName: String(row.business_or_couple_name || ''),
    paymentMethod: String(row.payment_method || ''),
    notes: String(row.notes || ''),
    status: (String(row.status || 'pending') as SubscriptionRequestStatus),
    adminNote: String(row.admin_note || ''),
    startsAt: String(row.starts_at || ''),
    endsAt: String(row.ends_at || ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function listUserSubscriptions(userId?: string): UserSubscriptionRecord[] {
  const conn = ensureDb();
  const rows = userId
    ? (conn.prepare(`SELECT * FROM user_subscriptions WHERE user_id = ? ORDER BY created_at DESC`).all(userId) as Record<string, unknown>[])
    : (conn.prepare(`SELECT * FROM user_subscriptions ORDER BY created_at DESC LIMIT 150`).all() as Record<string, unknown>[]);
  return rows.map(mapUserSubscriptionRow);
}

export function createUserSubscriptionRequest(input: {
  userId: string;
  userName: string;
  userRole: UserRole;
  planId: string;
  planNameAr: string;
  audience: SubscriptionAudience;
  billingCycle: SubscriptionBillingCycle;
  amountEgp: number;
  contactPhone: string;
  businessOrCoupleName: string;
  paymentMethod: string;
  notes?: string;
}): UserSubscriptionRecord {
  const conn = ensureDb();
  const id = `sub-${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  const isFree = input.amountEgp === 0 && input.planId === 'plan-client-free';
  const initialStatus: SubscriptionRequestStatus = isFree ? 'active' : 'pending';
  const startsAt = isFree ? now : '';
  const endsAt = isFree ? new Date(Date.now() + 365 * 86400 * 1000).toISOString() : '';

  conn
    .prepare(`
      INSERT INTO user_subscriptions (
        id, user_id, user_name, user_role, plan_id, plan_name_ar, audience, billing_cycle,
        amount_egp, contact_phone, business_or_couple_name, payment_method, notes,
        status, admin_note, starts_at, ends_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)
    `)
    .run(
      id,
      input.userId,
      input.userName,
      input.userRole,
      input.planId,
      input.planNameAr,
      input.audience,
      input.billingCycle,
      Math.max(0, Math.round(input.amountEgp)),
      input.contactPhone.trim().slice(0, 30),
      input.businessOrCoupleName.trim().slice(0, 100),
      input.paymentMethod.trim().slice(0, 80),
      (input.notes || '').trim().slice(0, 300),
      initialStatus,
      startsAt,
      endsAt,
      now,
      now
    );

  const row = conn.prepare(`SELECT * FROM user_subscriptions WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapUserSubscriptionRow(row);
}

export function updateUserSubscriptionStatus(
  id: string,
  status: SubscriptionRequestStatus,
  adminNote = ''
): UserSubscriptionRecord | null {
  const conn = ensureDb();
  const existingRow = conn.prepare(`SELECT * FROM user_subscriptions WHERE id = ? LIMIT 1`).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existingRow) return null;
  const existing = mapUserSubscriptionRow(existingRow);

  const now = new Date().toISOString();
  let startsAt = existing.startsAt;
  let endsAt = existing.endsAt;

  if (status === 'active') {
    startsAt = now;
    const days =
      existing.billingCycle === 'annual'
        ? 365
        : existing.billingCycle === 'one_time'
        ? 180
        : existing.billingCycle === 'quarterly'
        ? 90
        : 30;
    endsAt = new Date(Date.now() + days * 86400 * 1000).toISOString();
  }

  conn
    .prepare(`
      UPDATE user_subscriptions
      SET status = ?, admin_note = ?, starts_at = ?, ends_at = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(status, adminNote.trim().slice(0, 200), startsAt, endsAt, now, id);

  const updatedRow = conn.prepare(`SELECT * FROM user_subscriptions WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapUserSubscriptionRow(updatedRow);
}



