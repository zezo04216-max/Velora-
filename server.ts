import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { getApp as getFirebaseApp, getApps as getFirebaseApps, initializeApp as initializeFirebaseAdminApp } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
import {
  UPLOADS_DIR,
  addInvitationRsvp,
  addPhotographerAlbum,
  adminUpdateUser,
  countAdmins,
  createBookingRecord,
  createCustomerRequest,
  createInvitationRecord,
  createNotification,
  createPhotographerRecord,
  createReviewRecord,
  createServiceRecord,
  createSession,
  createUserAccount,
  createVenueRecord,
  deleteCustomerRequest,
  deleteInvitationRecord,
  deletePhotographerRecord,
  deleteReviewRecord,
  deleteServiceRecord,
  deleteSession,
  deleteVenueRecord,
  findUserByIdentifier,
  getBookingById,
  getCoupleWorkspace,
  getInvitationBySlug,
  getInvitationTemplatePrices,
  getPhotographerById,
  getServiceById,
  getSubscriptionPlanById,
  getUserById,
  getUserBySessionToken,
  getVenueById,
  initDatabase,
  listAdminAuditLogs,
  listAllBookings,
  listAllUsers,
  listBookingsForUser,
  listCustomerRequests,
  listFavoritesForUser,
  listInvitationRsvps,
  listInvitationsForOwner,
  listNotificationsForUser,
  listPhotographers,
  listReviews,
  listServices,
  listSubscriptionPlans,
  listUserSubscriptions,
  listVenues,
  logAdminAction,
  markNotificationRead,
  notifyAllAdmins,
  resetPasswordWithCode,
  saveCoupleWorkspace,
  setPasswordResetCode,
  toggleFavoriteRecord,
  updateBookingApproval,
  updateCustomerRequestStatus,
  updateInvitationTemplatePrice,
  updatePhotographerStatus,
  updateReviewStatus,
  updateServiceStatus,
  updateSubscriptionPlan,
  updateUserPassword,
  updateUserProfile,
  updateUserSubscriptionStatus,
  updateVenueStatus,
  createUserSubscriptionRequest,
  verifyPassword,
} from './server/db.ts';
import type {
  ApprovalStatus,
  InvitationDesignId,
  ServiceCategoryKey,
  SubscriptionBillingCycle,
  SubscriptionRequestStatus,
  TargetEntityType,
  UserProfile,
  UserRole,
  WeddingDreamStyle,
  WhatsAppMilestone,
} from './src/types/velora.ts';
import {
  getRemindersAdminSnapshot,
  runScheduledWhatsAppReminders,
  sendTestWhatsAppReminder,
} from './server/whatsapp.ts';
import {
  buildWeddingMatchPackages,
  hasBookingConflict,
  sanitizeSlug,
  summarizeInvitationRsvps,
  validateContactIdentifier,
} from './src/utils/veloraLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const SESSION_COOKIE = 'velora_session';

initDatabase();

interface AuthedRequest extends Request {
  user?: UserProfile;
  authToken?: string;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const map: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      map[k] = decodeURIComponent(v);
    }
  }
  return map;
}

function extractToken(req: Request): string {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE] || '';
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${7 * 86400}`,
  ];
  if (isHttps) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isHttps) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function attachOptionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const user = getUserBySessionToken(token);
    if (user) {
      req.user = user;
      req.authToken = token;
    }
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً لإتمام هذه العملية.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'غير مصرح بالوصول — هذه اللوحة مخصصة لإدارة منصة VÉLORA فقط.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '16mb' }));
  app.use(attachOptionalAuth);

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, brand: 'VÉLORA', adminCount: countAdmins() });
  });

  // --- Media Upload (disk storage with MIME & path confinement) ---
  app.post('/api/media/upload', requireAuth, (req: AuthedRequest, res) => {
    const { dataUrl, filename } = req.body as { dataUrl?: string; filename?: string };
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'لم يتم إرفاق ملف صورة صالح.' });
      return;
    }
    const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl.trim());
    if (!match) {
      res.status(400).json({ error: 'يسمح برفع صور بصيغ PNG أو JPG أو WEBP فقط.' });
      return;
    }
    const mime = match[1].toLowerCase();
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length > 6 * 1024 * 1024) {
      res.status(413).json({ error: 'حجم الصورة يتجاوز الحد الأقصى (6 ميجابايت).' });
      return;
    }
    const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : mime === 'image/gif' ? '.gif' : '.jpg';
    const safePrefix = (filename || 'velora').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'velora';
    const storedName = `${safePrefix}-${crypto.randomUUID().slice(0, 10)}${ext}`;
    const fullPath = path.resolve(UPLOADS_DIR, storedName);
    if (!fullPath.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(400).json({ error: 'مسار غير صالح.' });
      return;
    }
    fs.writeFileSync(fullPath, buf);
    res.status(201).json({ url: `/api/media/uploads/${storedName}` });
  });

  app.get('/api/media/uploads/:file', (req, res) => {
    const safeName = path.basename(req.params.file || '');
    const fullPath = path.resolve(UPLOADS_DIR, safeName);
    if (!fullPath.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'الملف غير موجود.' });
      return;
    }
    res.sendFile(fullPath);
  });

  // --- Auth & Account Management ---
  app.get('/api/auth/admin-status', (_req, res) => {
    res.json({
      hasAdmin: countAdmins() > 0,
      requiresPasscode: Boolean(process.env.VELORA_ADMIN_PASSCODE?.trim()),
    });
  });

  app.post('/api/auth/admin-claim', (req: AuthedRequest, res) => {
    const existingAdmins = countAdmins();
    const configuredPasscode = (process.env.VELORA_ADMIN_PASSCODE || '').trim();
    const { name, contact, password, passcode, promoteCurrent } = req.body as {
      name?: string;
      contact?: string;
      password?: string;
      passcode?: string;
      promoteCurrent?: boolean;
    };

    if (existingAdmins > 0) {
      res.status(403).json({ error: 'تم إعداد حساب الإدارة مسبقًا. يرجى تسجيل الدخول ببيانات الإدارة.' });
      return;
    }
    if (configuredPasscode && passcode !== configuredPasscode) {
      res.status(403).json({ error: 'رمز التفعيل الإداري غير صحيح.' });
      return;
    }

    if (promoteCurrent && req.user) {
      const promoted = adminUpdateUser(req.user.id, 'admin', 'active');
      if (!promoted) {
        res.status(404).json({ error: 'تعذر العثور على الحساب الحالي.' });
        return;
      }
      const token = createSession(promoted.id);
      setSessionCookie(req, res, token);
      res.status(200).json({ user: promoted, token });
      return;
    }

    const parsedContact = validateContactIdentifier(contact || '');
    if (!name?.trim() || parsedContact.kind === 'invalid' || !password || password.length < 6) {
      res.status(400).json({ error: 'يرجى إدخال اسم المشرف، البريد أو الهاتف الصحيح، وكلمة مرور لا تقل عن 6 أحرف.' });
      return;
    }
    const dup = findUserByIdentifier(parsedContact.normalized);
    if (dup) {
      const ownsExisting =
        (req.user && req.user.id === dup.id) || verifyPassword(password, dup.passwordHash);
      if (!ownsExisting) {
        res.status(409).json({
          error:
            'هذا البريد مسجل مسبقًا. أدخل كلمة المرور الحالية لهذا الحساب لترقيته للإدارة، أو استخدم بريدًا إلكترونيًا جديدًا.',
        });
        return;
      }
      const promoted = adminUpdateUser(dup.id, 'admin', 'active');
      if (!promoted) {
        res.status(500).json({ error: 'تعذر ترقية الحساب إلى الإدارة.' });
        return;
      }
      const token = createSession(promoted.id);
      setSessionCookie(req, res, token);
      res.status(200).json({ user: promoted, token });
      return;
    }
    const adminUser = createUserAccount({
      name: name.trim(),
      email: parsedContact.kind === 'email' ? parsedContact.normalized : '',
      phone: parsedContact.kind === 'phone' ? parsedContact.normalized : '',
      password,
      role: 'admin',
      city: 'القاهرة',
      bio: 'مدير منصة VÉLORA',
    });
    const token = createSession(adminUser.id);
    setSessionCookie(req, res, token);
    res.status(201).json({ user: adminUser, token });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, contact, password, role, city, bio } = req.body as {
      name?: string;
      contact?: string;
      password?: string;
      role?: UserRole;
      city?: string;
      bio?: string;
    };

    const allowedRoles: UserRole[] = ['client', 'venue_owner', 'photographer', 'service_provider'];
    const targetRole: UserRole = role && allowedRoles.includes(role) ? role : 'client';
    const parsedContact = validateContactIdentifier(contact || '');

    if (!name?.trim() || parsedContact.kind === 'invalid') {
      res.status(400).json({ error: 'يرجى إدخال الاسم الكامل ورقم هاتف أو بريد إلكتروني صحيح.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' });
      return;
    }
    if (findUserByIdentifier(parsedContact.normalized)) {
      res.status(409).json({ error: 'هذا الحساب مسجل بالفعل، يمكنك تسجيل الدخول مباشرة.' });
      return;
    }

    const user = createUserAccount({
      name: name.trim(),
      email: parsedContact.kind === 'email' ? parsedContact.normalized : '',
      phone: parsedContact.kind === 'phone' ? parsedContact.normalized : '',
      password,
      role: targetRole,
      city: city || 'القاهرة',
      bio: bio || '',
    });

    createNotification({
      userId: user.id,
      titleAr: 'مرحبًا بك في VÉLORA',
      bodyAr: 'تم إنشاء حسابك بنجاح. يمكنك الآن استكشاف القاعات والمصورين وإرسال طلبات الحجز وتصميم دعوتك.',
      kind: 'system',
    });

    const token = createSession(user.id);
    setSessionCookie(req, res, token);
    res.status(201).json({ user, token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { contact, password } = req.body as { contact?: string; password?: string };
    if (!contact?.trim() || !password) {
      res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني أو الهاتف وكلمة المرور.' });
      return;
    }
    const found = findUserByIdentifier(contact);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
      return;
    }
    if (found.status === 'suspended') {
      res.status(403).json({ error: 'هذا الحساب موقوف حاليًا. يرجى التواصل مع إدارة المنصة.' });
      return;
    }
    const token = createSession(found.id);
    setSessionCookie(req, res, token);
    const { passwordHash: _p, resetCode: _r, resetExpiresAt: _e, ...publicUser } = found;
    res.json({ user: publicUser, token });
  });

  app.post('/api/auth/firebase', async (req, res) => {
    const { idToken, role, city } = req.body as {
      idToken?: string;
      role?: UserRole;
      city?: string;
    };
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ error: 'لم يتم استلام رمز التحقق من Google.' });
      return;
    }

    let firebaseProjectId = '';
    try {
      const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(cfgPath)) {
        const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { projectId?: string };
        if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
          firebaseProjectId = parsed.projectId;
        }
      }
    } catch {
      firebaseProjectId = '';
    }

    if (!firebaseProjectId) {
      res.status(503).json({ error: 'خدمة الدخول عبر Google غير مهيأة على الخادم بعد.' });
      return;
    }

    try {
      const fbApp = getFirebaseApps().length
        ? getFirebaseApp()
        : initializeFirebaseAdminApp({ projectId: firebaseProjectId });
      const decoded = await getFirebaseAdminAuth(fbApp).verifyIdToken(idToken);
      const email = (decoded.email || '').trim().toLowerCase();
      if (!email || !decoded.email_verified) {
        res.status(403).json({ error: 'يجب أن يكون البريد الإلكتروني موثقًا من Google للمتابعة.' });
        return;
      }

      const existing = findUserByIdentifier(email);
      if (existing) {
        if (existing.status === 'suspended') {
          res.status(403).json({ error: 'هذا الحساب موقوف حاليًا. يرجى التواصل مع إدارة المنصة.' });
          return;
        }
        let latestUser: UserProfile | null = null;
        if (!existing.avatarUrl && decoded.picture) {
          latestUser = updateUserProfile(existing.id, { avatarUrl: decoded.picture });
        }
        const token = createSession(existing.id);
        setSessionCookie(req, res, token);
        const { passwordHash: _p, resetCode: _r, resetExpiresAt: _e, ...publicExisting } = existing;
        res.json({ user: latestUser || publicExisting, token });
        return;
      }

      const allowedRoles: UserRole[] = ['client', 'venue_owner', 'photographer', 'service_provider'];
      const targetRole: UserRole = role && allowedRoles.includes(role) ? role : 'client';
      const displayName =
        (typeof decoded.name === 'string' && decoded.name.trim()) || email.split('@')[0] || 'مستخدم VÉLORA';
      const newUser = createUserAccount({
        name: displayName,
        email,
        phone: '',
        password: crypto.randomBytes(24).toString('hex'),
        role: targetRole,
        city: city?.trim() || 'القاهرة',
        bio: '',
        avatarUrl: typeof decoded.picture === 'string' ? decoded.picture : '',
      });

      createNotification({
        userId: newUser.id,
        titleAr: 'مرحبًا بك في VÉLORA',
        bodyAr: 'تم ربط حسابك ببريد Google بنجاح. استمتع بتنظيم تفاصيل فرحتك على VÉLORA.',
        kind: 'system',
      });

      const token = createSession(newUser.id);
      setSessionCookie(req, res, token);
      res.status(201).json({ user: newUser, token });
    } catch {
      res.status(401).json({ error: 'تعذر التحقق من جلسة Google. يرجى المحاولة مرة أخرى.' });
    }
  });

  app.post('/api/auth/logout', (req: AuthedRequest, res) => {
    if (req.authToken) deleteSession(req.authToken);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req: AuthedRequest, res) => {
    res.json({ user: req.user || null });
  });

  app.put('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    const { name, email, phone, city, bio, avatarUrl } = req.body as Partial<UserProfile>;
    const updated = updateUserProfile(req.user!.id, { name, email, phone, city, bio, avatarUrl });
    res.json({ user: updated });
  });

  app.put('/api/auth/change-password', requireAuth, (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'يرجى إدخال كلمة المرور الحالية وكلمة مرور جديدة (6 أحرف على الأقل).' });
      return;
    }
    const identifier = req.user!.email || req.user!.phone;
    const found = identifier ? findUserByIdentifier(identifier) : null;
    if (!found || !verifyPassword(currentPassword, found.passwordHash)) {
      res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
      return;
    }
    updateUserPassword(req.user!.id, newPassword);
    res.json({ ok: true, message: 'تم تحديث كلمة المرور بنجاح.' });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { contact } = req.body as { contact?: string };
    if (!contact?.trim()) {
      res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف.' });
      return;
    }
    const user = findUserByIdentifier(contact);
    if (!user) {
      res.json({ ok: true, message: 'إذا كان الحساب موجودًا، تم إصدار رمز استعادة كلمة المرور.' });
      return;
    }
    const code = setPasswordResetCode(user.id);
    // In production SMTP/SMS sends code; for offline local demo environments return verification hint cleanly
    const isLocalDemo = process.env.NODE_ENV !== 'production';
    res.json({
      ok: true,
      message: 'تم إنشاء رمز تحقق مكون من 6 أرقام صالح لمدة 20 دقيقة.',
      demoCode: isLocalDemo ? code : undefined,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { contact, code, newPassword } = req.body as { contact?: string; code?: string; newPassword?: string };
    if (!contact?.trim() || !code?.trim() || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'يرجى إدخال رمز التحقق الصحيح وكلمة المرور الجديدة (6 أحرف على الأقل).' });
      return;
    }
    const ok = resetPasswordWithCode(contact, code, newPassword);
    if (!ok) {
      res.status(400).json({ error: 'رمز التحقق غير صحيح أو انتهت صلاحيته.' });
      return;
    }
    res.json({ ok: true, message: 'تم تحديث كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن.' });
  });

  // --- Venues ---
  app.get('/api/venues', (req: AuthedRequest, res) => {
    const isAdmin = req.user?.role === 'admin';
    const venues = listVenues({
      includeAllStatuses: isAdmin && req.query.all === '1',
      ownerId: req.user?.id,
    });
    res.json({ venues });
  });

  app.get('/api/venues/:id', (req: AuthedRequest, res) => {
    const venue = getVenueById(req.params.id);
    if (!venue) {
      res.status(404).json({ error: 'القاعة غير موجودة.' });
      return;
    }
    if (venue.status !== 'approved' && req.user?.role !== 'admin' && req.user?.id !== venue.ownerId) {
      res.status(403).json({ error: 'هذه القاعة قيد المراجعة الإدارية حاليًا.' });
      return;
    }
    const reviews = listReviews({ targetType: 'venue', targetId: venue.id });
    res.json({ venue, reviews });
  });

  app.post('/api/venues', requireAuth, (req: AuthedRequest, res) => {
    if (!['venue_owner', 'admin'].includes(req.user!.role)) {
      res.status(403).json({ error: 'هذه الإضافة مخصصة لحسابات أصحاب القاعات أو الإدارة.' });
      return;
    }
    const b = req.body as Record<string, unknown>;
    if (!String(b.titleAr || '').trim() || !String(b.city || '').trim()) {
      res.status(400).json({ error: 'يرجى إدخال اسم القاعة والمدينة.' });
      return;
    }
    const created = createVenueRecord({
      ownerId: req.user!.id,
      ownerName: req.user!.name,
      titleAr: String(b.titleAr).trim(),
      subtitleAr: String(b.subtitleAr || 'قاعة أفراح ومناسبات فاخرة').trim(),
      city: String(b.city).trim(),
      area: String(b.area || b.city).trim(),
      address: String(b.address || 'سيتم مشاركة العنوان التفصيلي عند الحجز').trim(),
      mapUrl: String(b.mapUrl || 'https://maps.google.com/?q=30.0444,31.2357').trim(),
      capacityMin: Math.max(20, Number(b.capacityMin) || 100),
      capacityMax: Math.max(50, Number(b.capacityMax) || 350),
      pricePerEvent: Math.max(1000, Number(b.pricePerEvent) || 45000),
      discountPercent: Math.min(80, Math.max(0, Number(b.discountPercent) || 0)),
      workingHours: String(b.workingHours || '10:00 ص - 11:00 م').trim(),
      decorStyles: Array.isArray(b.decorStyles) ? (b.decorStyles as string[]) : ['كلاسيك ملكي'],
      features: Array.isArray(b.features) ? (b.features as string[]) : ['جناح خاص للعروسين', 'إضاءة احترافية'],
      descriptionAr: String(b.descriptionAr || 'قاعة راقية مجهزة بالكامل لاستقبال حفلات الزفاف.').trim(),
      coverImage: String(b.coverImage || '/src/assets/images/velora_venue_palace_1795424759214.jpg'),
      galleryImages: Array.isArray(b.galleryImages) && b.galleryImages.length > 0
        ? (b.galleryImages as string[])
        : [String(b.coverImage || '/src/assets/images/velora_venue_palace_1795424759214.jpg')],
      videoUrl: String(b.videoUrl || ''),
      status: req.user!.role === 'admin' ? 'approved' : 'pending',
    });

    if (created.status === 'pending') {
      notifyAllAdmins({
        titleAr: 'طلب اعتماد قاعة جديدة',
        bodyAr: `أضاف "${req.user!.name}" قاعة "${created.titleAr}" وهي بانتظار موافقة الإدارة قبل النشر.`,
        kind: 'approval',
      });
    }
    res.status(201).json({ venue: created });
  });

  // --- Photographers ---
  app.get('/api/photographers', (req: AuthedRequest, res) => {
    const isAdmin = req.user?.role === 'admin';
    const photographers = listPhotographers({
      includeAllStatuses: isAdmin && req.query.all === '1',
      ownerId: req.user?.id,
    });
    res.json({ photographers });
  });

  app.get('/api/photographers/:id', (req: AuthedRequest, res) => {
    const photographer = getPhotographerById(req.params.id);
    if (!photographer) {
      res.status(404).json({ error: 'المصور غير موجود.' });
      return;
    }
    if (photographer.status !== 'approved' && req.user?.role !== 'admin' && req.user?.id !== photographer.ownerId) {
      res.status(403).json({ error: 'ملف المصور قيد المراجعة الإدارية حاليًا.' });
      return;
    }
    const reviews = listReviews({ targetType: 'photographer', targetId: photographer.id });
    res.json({ photographer, reviews });
  });

  app.post('/api/photographers', requireAuth, (req: AuthedRequest, res) => {
    if (!['photographer', 'admin'].includes(req.user!.role)) {
      res.status(403).json({ error: 'هذه الإضافة مخصصة لحسابات المصورين أو الإدارة.' });
      return;
    }
    const b = req.body as Record<string, unknown>;
    if (!String(b.displayName || '').trim()) {
      res.status(400).json({ error: 'يرجى إدخال اسم المصور أو الاستوديو.' });
      return;
    }
    const coverImg = String(b.coverImage || '/src/assets/images/velora_photographer_couple_1795424759634.jpg');
    const albumPhotos = Array.isArray(b.albumPhotos) && b.albumPhotos.length > 0 ? (b.albumPhotos as string[]) : [coverImg];
    const created = createPhotographerRecord({
      ownerId: req.user!.id,
      displayName: String(b.displayName).trim(),
      specialtyAr: String(b.specialtyAr || 'تصوير أفراح سينمائي').trim(),
      city: String(b.city || 'القاهرة').trim(),
      studioLocation: String(b.studioLocation || 'القاهرة').trim(),
      yearsExperience: Math.max(1, Number(b.yearsExperience) || 5),
      workingHours: String(b.workingHours || '11:00 ص - 10:00 م').trim(),
      startingPrice: Math.max(1000, Number(b.startingPrice) || 12000),
      discountPercent: Math.min(80, Math.max(0, Number(b.discountPercent) || 0)),
      bioAr: String(b.bioAr || 'توثيق احترافي لأجمل لحظات الزفاف.').trim(),
      equipmentAr: String(b.equipmentAr || 'كاميرات Full-Frame وعدسات سينمائية').trim(),
      shootingTypes: Array.isArray(b.shootingTypes) ? (b.shootingTypes as string[]) : ['فوتو سيشن', 'تغطية الحفل'],
      avatarUrl: String(b.avatarUrl || coverImg),
      coverImage: coverImg,
      videoReelUrl: String(b.videoReelUrl || ''),
      initialAlbum: {
        titleAr: String(b.albumTitleAr || 'ألبوم الأعمال المختارة'),
        descriptionAr: String(b.albumDescriptionAr || 'مختارات من أحدث جلسات الزفاف والخطوبة.'),
        sessionDate: new Date().toISOString().slice(0, 10),
        locationAr: String(b.city || 'القاهرة'),
        photos: albumPhotos,
      },
      status: req.user!.role === 'admin' ? 'approved' : 'pending',
    });

    if (created.status === 'pending') {
      notifyAllAdmins({
        titleAr: 'طلب اعتماد مصور جديد',
        bodyAr: `سجّل المصور "${created.displayName}" ملفه المهني وهو بانتظار المراجعة قبل الظهور للعملاء.`,
        kind: 'approval',
      });
    }
    res.status(201).json({ photographer: created });
  });

  app.post('/api/photographers/:id/albums', requireAuth, (req: AuthedRequest, res) => {
    const existing = getPhotographerById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'المصور غير موجود.' });
      return;
    }
    if (existing.ownerId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'لا تملك صلاحية تعديل ألبومات هذا المصور.' });
      return;
    }
    const { titleAr, descriptionAr, sessionDate, locationAr, photos } = req.body as {
      titleAr?: string;
      descriptionAr?: string;
      sessionDate?: string;
      locationAr?: string;
      photos?: string[];
    };
    if (!titleAr?.trim() || !Array.isArray(photos) || photos.length === 0) {
      res.status(400).json({ error: 'يرجى إدخال عنوان الألبوم وإرفاق صورة واحدة على الأقل.' });
      return;
    }
    const updated = addPhotographerAlbum(existing.id, {
      titleAr: titleAr.trim(),
      descriptionAr: (descriptionAr || '').trim(),
      sessionDate: sessionDate || new Date().toISOString().slice(0, 10),
      locationAr: (locationAr || existing.city).trim(),
      photos,
    });
    res.status(201).json({ photographer: updated });
  });

  // --- Services (All 11 wedding categories) ---
  app.get('/api/services', (req: AuthedRequest, res) => {
    const isAdmin = req.user?.role === 'admin';
    const services = listServices({
      includeAllStatuses: isAdmin && req.query.all === '1',
      ownerId: req.user?.id,
    });
    res.json({ services });
  });

  app.get('/api/services/:id', (req: AuthedRequest, res) => {
    const service = getServiceById(req.params.id);
    if (!service) {
      res.status(404).json({ error: 'الخدمة غير موجودة.' });
      return;
    }
    if (service.status !== 'approved' && req.user?.role !== 'admin' && req.user?.id !== service.ownerId) {
      res.status(403).json({ error: 'هذه الخدمة قيد المراجعة الإدارية.' });
      return;
    }
    const reviews = listReviews({ targetType: 'service', targetId: service.id });
    res.json({ service, reviews });
  });

  app.post('/api/services', requireAuth, (req: AuthedRequest, res) => {
    if (!['service_provider', 'admin'].includes(req.user!.role)) {
      res.status(403).json({ error: 'هذه الإضافة مخصصة لحسابات مقدمي الخدمات أو الإدارة.' });
      return;
    }
    const b = req.body as Record<string, unknown>;
    if (!String(b.titleAr || '').trim()) {
      res.status(400).json({ error: 'يرجى إدخال عنوان الخدمة.' });
      return;
    }
    const cover = String(b.coverImage || '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg');
    const created = createServiceRecord({
      ownerId: req.user!.id,
      providerName: req.user!.name,
      category: (String(b.category || 'decor') as ServiceCategoryKey),
      titleAr: String(b.titleAr).trim(),
      city: String(b.city || 'القاهرة').trim(),
      area: String(b.area || b.city || 'القاهرة').trim(),
      startingPrice: Math.max(500, Number(b.startingPrice) || 8000),
      discountPercent: Math.min(80, Math.max(0, Number(b.discountPercent) || 0)),
      workingHours: String(b.workingHours || '10:00 ص - 9:00 م').trim(),
      descriptionAr: String(b.descriptionAr || 'خدمة زفاف متكاملة بأعلى معايير الجودة.').trim(),
      packagesAr: Array.isArray(b.packagesAr) ? (b.packagesAr as string[]) : ['باقة أساسية متكاملة'],
      coverImage: cover,
      galleryImages: Array.isArray(b.galleryImages) && b.galleryImages.length > 0 ? (b.galleryImages as string[]) : [cover],
      status: req.user!.role === 'admin' ? 'approved' : 'pending',
    });

    if (created.status === 'pending') {
      notifyAllAdmins({
        titleAr: 'طلب اعتماد خدمة جديدة',
        bodyAr: `أضاف "${req.user!.name}" خدمة "${created.titleAr}" وبانتظار موافقة الإدارة.`,
        kind: 'approval',
      });
    }
    res.status(201).json({ service: created });
  });

  // --- Separated Customer Requests ---
  app.get('/api/requests', (req, res) => {
    const section = req.query.section as TargetEntityType | undefined;
    const requests = listCustomerRequests(section);
    res.json({ requests });
  });

  app.post('/api/requests', requireAuth, (req: AuthedRequest, res) => {
    const b = req.body as Record<string, unknown>;
    const section = String(b.requestSection || '') as TargetEntityType;
    if (!['venue', 'photographer', 'service'].includes(section)) {
      res.status(400).json({ error: 'يرجى تحديد قسم الطلب الصحيح.' });
      return;
    }
    if (!String(b.titleAr || '').trim() || !String(b.eventDate || '').trim()) {
      res.status(400).json({ error: 'يرجى إدخال عنوان الطلب وتاريخ المناسبة المطلوب.' });
      return;
    }
    const created = createCustomerRequest({
      clientId: req.user!.id,
      clientName: req.user!.name,
      clientPhone: req.user!.phone || req.user!.email,
      requestSection: section,
      serviceCategory: b.serviceCategory ? (String(b.serviceCategory) as ServiceCategoryKey) : undefined,
      titleAr: String(b.titleAr).trim(),
      eventDate: String(b.eventDate).trim(),
      city: String(b.city || 'القاهرة').trim(),
      area: String(b.area || '').trim(),
      guestsCount: Math.max(10, Number(b.guestsCount) || 150),
      budgetEgp: Math.max(1000, Number(b.budgetEgp) || 25000),
      preferredType: String(b.preferredType || '').trim(),
      requestedServices: Array.isArray(b.requestedServices) ? (b.requestedServices as string[]) : [],
      notesAr: String(b.notesAr || '').trim(),
    });
    notifyAllAdmins({
      titleAr: 'طلب عميل جديد',
      bodyAr: `أضاف "${req.user!.name}" طلبًا جديدًا في قسم ${section === 'venue' ? 'القاعات' : section === 'photographer' ? 'المصورين' : 'الخدمات'}.`,
      kind: 'system',
    });
    res.status(201).json({ request: created });
  });

  // --- Smart Date Availability & Dual-Approval Bookings ---
  app.get('/api/availability', (req, res) => {
    const date = String(req.query.date || '').trim().slice(0, 10);
    if (!date) {
      res.status(400).json({ error: 'يرجى تمرير التاريخ المطلوب فحصه.' });
      return;
    }
    const bookings = listAllBookings();
    const venues = listVenues();
    const photographers = listPhotographers();

    const reservedVenueIds = venues
      .filter((v) => hasBookingConflict(bookings, 'venue', v.id, date))
      .map((v) => v.id);
    const reservedPhotographerIds = photographers
      .filter((p) => hasBookingConflict(bookings, 'photographer', p.id, date))
      .map((p) => p.id);

    const targetType = req.query.targetType as TargetEntityType | undefined;
    const targetId = String(req.query.targetId || '');
    const specificAvailable =
      targetType && targetId ? !hasBookingConflict(bookings, targetType, targetId, date) : undefined;

    res.json({
      date,
      reservedVenueIds,
      reservedPhotographerIds,
      specificAvailable,
    });
  });

  app.get('/api/bookings', requireAuth, (req: AuthedRequest, res) => {
    const bookings = listBookingsForUser(req.user!);
    res.json({ bookings });
  });

  app.post('/api/bookings', requireAuth, (req: AuthedRequest, res) => {
    const { targetType, targetId, eventDate, guestsCount, notes, clientPhone } = req.body as {
      targetType?: TargetEntityType;
      targetId?: string;
      eventDate?: string;
      guestsCount?: number;
      notes?: string;
      clientPhone?: string;
    };

    if (!targetType || !targetId || !eventDate?.trim()) {
      res.status(400).json({ error: 'يرجى تحديد الجهة المطلوبة وتاريخ المناسبة.' });
      return;
    }

    let providerOwnerId = '';
    let targetTitle = '';
    let targetImage = '';
    let estimatedTotalEgp = 0;

    if (targetType === 'venue') {
      const v = getVenueById(targetId);
      if (!v || v.status !== 'approved') {
        res.status(404).json({ error: 'القاعة غير متاحة حاليًا.' });
        return;
      }
      providerOwnerId = v.ownerId;
      targetTitle = v.titleAr;
      targetImage = v.coverImage;
      estimatedTotalEgp = Math.round(v.pricePerEvent * (1 - v.discountPercent / 100));
    } else if (targetType === 'photographer') {
      const p = getPhotographerById(targetId);
      if (!p || p.status !== 'approved') {
        res.status(404).json({ error: 'المصور غير متاح حاليًا.' });
        return;
      }
      providerOwnerId = p.ownerId;
      targetTitle = p.displayName;
      targetImage = p.coverImage;
      estimatedTotalEgp = Math.round(p.startingPrice * (1 - p.discountPercent / 100));
    } else {
      const s = getServiceById(targetId);
      if (!s || s.status !== 'approved') {
        res.status(404).json({ error: 'الخدمة غير متاحة حاليًا.' });
        return;
      }
      providerOwnerId = s.ownerId;
      targetTitle = s.titleAr;
      targetImage = s.coverImage;
      estimatedTotalEgp = Math.round(s.startingPrice * (1 - s.discountPercent / 100));
    }

    const existingAll = listAllBookings();
    if (hasBookingConflict(existingAll, targetType, targetId, eventDate)) {
      res.status(409).json({
        error: 'عذرًا، هذا التاريخ محجوز مسبقًا لهذه الجهة. يرجى اختيار تاريخ آخر متاح.',
      });
      return;
    }

    const booking = createBookingRecord({
      clientId: req.user!.id,
      clientName: req.user!.name,
      clientPhone: clientPhone?.trim() || req.user!.phone || req.user!.email,
      providerOwnerId,
      targetType,
      targetId,
      targetTitle,
      targetImage,
      eventDate: eventDate.trim().slice(0, 10),
      guestsCount: Math.max(10, Number(guestsCount) || 150),
      estimatedTotalEgp,
      notes: (notes || '').trim(),
    });

    createNotification({
      userId: providerOwnerId,
      titleAr: 'طلب حجز جديد بانتظار موافقتك',
      bodyAr: `قدّم "${req.user!.name}" طلب حجز على "${targetTitle}" بتاريخ ${booking.eventDate}.`,
      kind: 'booking',
      relatedRoute: 'bookings',
    });
    notifyAllAdmins({
      titleAr: 'حجز جديد يتطلب المراجعة الإدارية',
      bodyAr: `طلب حجز على "${targetTitle}" بتاريخ ${booking.eventDate} من العميل "${req.user!.name}".`,
      kind: 'booking',
    });

    res.status(201).json({ booking });
  });

  app.post('/api/bookings/:id/provider-action', requireAuth, (req: AuthedRequest, res) => {
    const booking = getBookingById(req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'الحجز غير موجود.' });
      return;
    }
    if (booking.providerOwnerId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'هذا الإجراء مخصص لمقدم الخدمة المعني بهذا الحجز فقط.' });
      return;
    }
    const { decision, note } = req.body as { decision?: 'approve' | 'reject'; note?: string };
    if (decision !== 'approve' && decision !== 'reject') {
      res.status(400).json({ error: 'القرار غير صالح.' });
      return;
    }
    if (decision === 'approve') {
      const others = listAllBookings().filter((b) => b.id !== booking.id);
      if (hasBookingConflict(others, booking.targetType, booking.targetId, booking.eventDate)) {
        res.status(409).json({ error: 'يوجد حجز مؤكد بالفعل في نفس التاريخ.' });
        return;
      }
    }

    const updated = updateBookingApproval(booking.id, 'provider', decision, (note || '').trim());
    if (updated) {
      createNotification({
        userId: updated.clientId,
        titleAr:
          updated.status === 'confirmed'
            ? 'تم تأكيد حجزك نهائيًا'
            : decision === 'approve'
              ? 'وافق مقدم الخدمة على حجزك'
              : 'اعتذر مقدم الخدمة عن الحجز',
        bodyAr:
          updated.status === 'confirmed'
            ? `اكتملت موافقة مقدم الخدمة والإدارة على حجز "${updated.targetTitle}" بتاريخ ${updated.eventDate}.`
            : decision === 'approve'
              ? `وافق مقدم الخدمة على "${updated.targetTitle}" (${updated.eventDate}) — بانتظار اعتماد الإدارة النهائي.`
              : `تم رفض الحجز على "${updated.targetTitle}". ${note || ''}`,
        kind: 'booking',
        relatedRoute: 'bookings',
      });
    }
    res.json({ booking: updated });
  });

  app.post('/api/bookings/:id/admin-action', requireAdmin, (req: AuthedRequest, res) => {
    const booking = getBookingById(req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'الحجز غير موجود.' });
      return;
    }
    const { decision, note } = req.body as { decision?: 'approve' | 'reject'; note?: string };
    if (decision !== 'approve' && decision !== 'reject') {
      res.status(400).json({ error: 'القرار غير صالح.' });
      return;
    }
    if (decision === 'approve') {
      const others = listAllBookings().filter((b) => b.id !== booking.id);
      if (hasBookingConflict(others, booking.targetType, booking.targetId, booking.eventDate)) {
        res.status(409).json({ error: 'لا يمكن الموافقة لوجود تعارض مع حجز مؤكد في نفس اليوم.' });
        return;
      }
    }

    const updated = updateBookingApproval(booking.id, 'admin', decision, (note || '').trim());
    if (updated) {
      logAdminAction(req.user!, `قرار إداري (${decision}) على الحجز ${updated.targetTitle}`, 'booking', updated.id);
      createNotification({
        userId: updated.clientId,
        titleAr: updated.status === 'confirmed' ? 'تم تأكيد الحجز نهائيًا' : decision === 'approve' ? 'وافقت الإدارة مبدئيًا على الحجز' : 'تم رفض الحجز إداريًا',
        bodyAr:
          updated.status === 'confirmed'
            ? `حجزك في "${updated.targetTitle}" بتاريخ ${updated.eventDate} مؤكد الآن بالكامل.`
            : decision === 'approve'
              ? `وافقت الإدارة على حجز "${updated.targetTitle}" — بانتظار موافقة مقدم الخدمة النهائية.`
              : `تم رفض حجز "${updated.targetTitle}" من الإدارة.`,
        kind: 'booking',
        relatedRoute: 'bookings',
      });
      createNotification({
        userId: updated.providerOwnerId,
        titleAr: updated.status === 'confirmed' ? 'تأكيد نهائي لحجز وارد' : 'تحديث إداري على حجز',
        bodyAr: `الحجز "${updated.targetTitle}" بتاريخ ${updated.eventDate}: حالته الآن "${updated.status}".`,
        kind: 'booking',
        relatedRoute: 'bookings',
      });
    }
    res.json({ booking: updated });
  });

  app.post('/api/bookings/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
    const booking = getBookingById(req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'الحجز غير موجود.' });
      return;
    }
    if (booking.clientId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'لا تملك صلاحية إلغاء هذا الحجز.' });
      return;
    }
    const updated = updateBookingApproval(booking.id, 'cancel', 'cancel', 'ألغى العميل الطلب');
    if (updated) {
      createNotification({
        userId: updated.providerOwnerId,
        titleAr: 'إلغاء طلب حجز',
        bodyAr: `قام "${updated.clientName}" بإلغاء الحجز على "${updated.targetTitle}" بتاريخ ${updated.eventDate}.`,
        kind: 'booking',
      });
    }
    res.json({ booking: updated });
  });

  // --- Reviews & Favorites ---
  app.get('/api/reviews', (req, res) => {
    const targetType = req.query.targetType as TargetEntityType | undefined;
    const targetId = req.query.targetId as string | undefined;
    res.json({ reviews: listReviews({ targetType, targetId }) });
  });

  app.post('/api/reviews', requireAuth, (req: AuthedRequest, res) => {
    const { targetType, targetId, rating, commentAr } = req.body as {
      targetType?: TargetEntityType;
      targetId?: string;
      rating?: number;
      commentAr?: string;
    };
    if (!targetType || !targetId || !commentAr?.trim()) {
      res.status(400).json({ error: 'يرجى كتابة التقييم واختيار عدد النجوم.' });
      return;
    }
    const review = createReviewRecord({
      authorId: req.user!.id,
      authorName: req.user!.name,
      targetType,
      targetId,
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      commentAr: commentAr.trim(),
    });
    notifyAllAdmins({
      titleAr: 'تقييم جديد بانتظار الاعتماد',
      bodyAr: `أضاف "${req.user!.name}" تقييمًا جديدًا (${review.rating} نجوم) وهو قيد المراجعة الإدارية.`,
      kind: 'review',
    });
    res.status(201).json({ review });
  });

  app.get('/api/favorites', requireAuth, (req: AuthedRequest, res) => {
    res.json({ favorites: listFavoritesForUser(req.user!.id) });
  });

  app.post('/api/favorites/toggle', requireAuth, (req: AuthedRequest, res) => {
    const { targetType, targetId } = req.body as { targetType?: TargetEntityType; targetId?: string };
    if (!targetType || !targetId) {
      res.status(400).json({ error: 'بيانات المفضلة غير مكتملة.' });
      return;
    }
    const result = toggleFavoriteRecord(req.user!.id, targetType, targetId);
    res.json({ ...result, favorites: listFavoritesForUser(req.user!.id) });
  });

  // --- Notifications ---
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    res.json({ notifications: listNotificationsForUser(req.user!.id) });
  });

  app.post('/api/notifications/read', requireAuth, (req: AuthedRequest, res) => {
    const { id } = req.body as { id?: string };
    markNotificationRead(req.user!.id, id);
    res.json({ notifications: listNotificationsForUser(req.user!.id) });
  });

  // --- Electronic Invitations & Public RSVP (NO LOGIN REQUIRED FOR GUESTS) ---
  app.get('/api/invitations', (req: AuthedRequest, res) => {
    let list: ReturnType<typeof listInvitationsForOwner>;
    if (!req.user) {
      list = listInvitationsForOwner('usr-client-1');
    } else if (req.user.role === 'admin') {
      list = listInvitationsForOwner(undefined);
    } else {
      const own = listInvitationsForOwner(req.user.id);
      list = own.length > 0 ? own : listInvitationsForOwner('usr-client-1');
    }
    res.json({ invitations: list });
  });

  app.get('/api/invitation-pricing', (_req, res) => {
    res.json({ templatePrices: getInvitationTemplatePrices() });
  });

  app.put('/api/admin/invitation-pricing', requireAdmin, (req: AuthedRequest, res) => {
    const { designId, priceEgp } = (req.body || {}) as {
      designId?: InvitationDesignId;
      priceEgp?: number;
    };
    const validIds: InvitationDesignId[] = [
      'royal',
      'luxury',
      'romantic',
      'classic',
      'modern',
      'floral',
      'minimal',
    ];
    if (!designId || !validIds.includes(designId)) {
      res.status(400).json({ error: 'معرف تصميم البطاقة غير صالح.' });
      return;
    }
    const templatePrices = updateInvitationTemplatePrice(designId, Number(priceEgp) || 0);
    logAdminAction(req.user!, `تحديث سعر كارت الدعوة (${designId}) إلى ${templatePrices[designId]} ج.م`, 'invitation_template', designId);
    res.json({ templatePrices });
  });

  app.post('/api/invitations', requireAuth, (req: AuthedRequest, res) => {
    const b = req.body as {
      designId?: InvitationDesignId;
      groomName?: string;
      brideName?: string;
      weddingDate?: string;
      weddingTime?: string;
      venueName?: string;
      mapUrl?: string;
      invitationText?: string;
      couplePhoto?: string;
      contactPhone?: string;
    };
    if (!b.groomName?.trim() || !b.brideName?.trim() || !b.weddingDate?.trim() || !b.venueName?.trim()) {
      res.status(400).json({ error: 'يرجى إدخال اسم العريس، اسم العروسة، تاريخ الفرح، واسم القاعة.' });
      return;
    }
    const slug = sanitizeSlug(`${b.groomName}-${b.brideName}`);
    const designId = b.designId || 'floral';
    const templatePrices = getInvitationTemplatePrices();
    const invitation = createInvitationRecord({
      ownerId: req.user!.id,
      slug,
      designId,
      designPriceEgp: templatePrices[designId] ?? 0,
      groomName: b.groomName.trim(),
      brideName: b.brideName.trim(),
      weddingDate: b.weddingDate.trim(),
      weddingTime: (b.weddingTime || '20:00').trim(),
      venueName: b.venueName.trim(),
      mapUrl: (b.mapUrl || 'https://maps.google.com/?q=30.0444,31.2357').trim(),
      invitationText:
        (b.invitationText || 'بقلوب يغمرها الفرح، نتشرف بدعوتكم لحضور حفل زفافنا ومشاركتنا أجمل لحظات العمر.').trim(),
      couplePhoto: b.couplePhoto || '/src/assets/images/velora_invitation_editorial_1795424758769.jpg',
      contactPhone: (b.contactPhone || req.user!.phone || '').trim(),
    });
    res.status(201).json({ invitation });
  });

  app.get('/api/invitations/:slug', (req: AuthedRequest, res) => {
    const inv = getInvitationBySlug(req.params.slug);
    if (!inv) {
      res.status(404).json({ error: 'رابط الدعوة غير موجود أو تم حذفه.' });
      return;
    }
    const rsvps = listInvitationRsvps(inv.id);
    const stats = summarizeInvitationRsvps(rsvps);
    const isOwnerOrAdmin = Boolean(req.user && (req.user.id === inv.ownerId || req.user.role === 'admin'));
    const isPublicDemo = inv.ownerId === 'usr-client-1';
    const visibleRsvps = isOwnerOrAdmin
      ? rsvps
      : isPublicDemo
        ? rsvps.map((r) => ({ ...r, guestPhone: req.user ? r.guestPhone : '' }))
        : [];
    res.json({
      invitation: inv,
      stats,
      rsvps: visibleRsvps,
    });
  });

  app.post('/api/invitations/:slug/rsvp', (req, res) => {
    const inv = getInvitationBySlug(req.params.slug);
    if (!inv) {
      res.status(404).json({ error: 'الدعوة غير موجودة.' });
      return;
    }
    const { guestName, guestPhone, response, companionsCount, congratulationMessage } = req.body as {
      guestName?: string;
      guestPhone?: string;
      response?: 'attending' | 'declined';
      companionsCount?: number;
      congratulationMessage?: string;
    };
    if (!guestName?.trim() || (response !== 'attending' && response !== 'declined')) {
      res.status(400).json({ error: 'يرجى إدخال اسمك واختيار حالة الحضور.' });
      return;
    }
    const saved = addInvitationRsvp({
      invitationId: inv.id,
      guestName: guestName.trim(),
      guestPhone: guestPhone || '',
      response,
      companionsCount: response === 'attending' ? Math.max(1, Number(companionsCount) || 1) : 1,
      congratulationMessage: congratulationMessage || '',
    });

    createNotification({
      userId: inv.ownerId,
      titleAr: response === 'attending' ? `تأكيد حضور جديد: ${saved.guestName}` : `اعتذار عن الحضور: ${saved.guestName}`,
      bodyAr: saved.congratulationMessage
        ? `رسالة التهنئة: "${saved.congratulationMessage}"`
        : response === 'attending'
          ? `أكد "${saved.guestName}" حضوره للحفل.`
          : `أرسل "${saved.guestName}" اعتذارًا عن الحضور.`,
      kind: 'system',
      relatedRoute: 'invitations',
    });

    const stats = summarizeInvitationRsvps(listInvitationRsvps(inv.id));
    res.status(201).json({ rsvp: saved, stats });
  });

  app.delete('/api/invitations/:id', requireAuth, (req: AuthedRequest, res) => {
    const list = listInvitationsForOwner(req.user!.role === 'admin' ? undefined : req.user!.id);
    const owns = list.find((i) => i.id === req.params.id);
    if (!owns) {
      res.status(403).json({ error: 'لا تملك صلاحية حذف هذه الدعوة.' });
      return;
    }
    deleteInvitationRecord(req.params.id);
    res.json({ deleted: true });
  });

  // --- Protected Admin Console (All 10 Admin Sections) ---
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    res.json({
      users: listAllUsers(),
      venues: listVenues({ includeAllStatuses: true }),
      photographers: listPhotographers({ includeAllStatuses: true }),
      services: listServices({ includeAllStatuses: true }),
      requests: listCustomerRequests(),
      bookings: listAllBookings(),
      reviews: listReviews({ includeAll: true }),
      invitations: listInvitationsForOwner(),
      auditLogs: listAdminAuditLogs(),
    });
  });

  app.post('/api/admin/venues/:id/status', requireAdmin, (req: AuthedRequest, res) => {
    const { status, featured } = req.body as { status?: ApprovalStatus; featured?: boolean };
    if (!status) {
      res.status(400).json({ error: 'الحالة مطلوبة.' });
      return;
    }
    const updated = updateVenueStatus(req.params.id, status, featured);
    if (!updated) {
      res.status(404).json({ error: 'القاعة غير موجودة.' });
      return;
    }
    logAdminAction(req.user!, `تغيير حالة القاعة "${updated.titleAr}" إلى ${status}`, 'venue', updated.id);
    createNotification({
      userId: updated.ownerId,
      titleAr: status === 'approved' ? 'تمت الموافقة على قاعتك' : 'تحديث حالة القاعة',
      bodyAr:
        status === 'approved'
          ? `أصبحت قاعة "${updated.titleAr}" منشورة الآن لجميع عملاء VÉLORA.`
          : `تم تحديث حالة قاعة "${updated.titleAr}" إلى ${status}.`,
      kind: 'approval',
    });
    res.json({ venue: updated });
  });

  app.delete('/api/admin/venues/:id', requireAdmin, (req: AuthedRequest, res) => {
    deleteVenueRecord(req.params.id);
    logAdminAction(req.user!, 'حذف قاعة من المنصة', 'venue', req.params.id);
    res.json({ deleted: true });
  });

  app.post('/api/admin/photographers/:id/status', requireAdmin, (req: AuthedRequest, res) => {
    const { status, featured } = req.body as { status?: ApprovalStatus; featured?: boolean };
    if (!status) {
      res.status(400).json({ error: 'الحالة مطلوبة.' });
      return;
    }
    const updated = updatePhotographerStatus(req.params.id, status, featured);
    if (!updated) {
      res.status(404).json({ error: 'المصور غير موجود.' });
      return;
    }
    logAdminAction(req.user!, `تغيير حالة المصور "${updated.displayName}" إلى ${status}`, 'photographer', updated.id);
    createNotification({
      userId: updated.ownerId,
      titleAr: status === 'approved' ? 'تم اعتماد ملف المصور الخاص بك' : 'تحديث حالة ملف المصور',
      bodyAr:
        status === 'approved'
          ? `أصبح ملف "${updated.displayName}" مرئيًا في قسم المصورين.`
          : `تم تحديث حالة "${updated.displayName}" إلى ${status}.`,
      kind: 'approval',
    });
    res.json({ photographer: updated });
  });

  app.delete('/api/admin/photographers/:id', requireAdmin, (req: AuthedRequest, res) => {
    deletePhotographerRecord(req.params.id);
    logAdminAction(req.user!, 'حذف ملف مصور', 'photographer', req.params.id);
    res.json({ deleted: true });
  });

  app.post('/api/admin/services/:id/status', requireAdmin, (req: AuthedRequest, res) => {
    const { status, featured } = req.body as { status?: ApprovalStatus; featured?: boolean };
    if (!status) {
      res.status(400).json({ error: 'الحالة مطلوبة.' });
      return;
    }
    const updated = updateServiceStatus(req.params.id, status, featured);
    if (!updated) {
      res.status(404).json({ error: 'الخدمة غير موجودة.' });
      return;
    }
    logAdminAction(req.user!, `تغيير حالة الخدمة "${updated.titleAr}" إلى ${status}`, 'service', updated.id);
    createNotification({
      userId: updated.ownerId,
      titleAr: status === 'approved' ? 'تم اعتماد خدمتك في VÉLORA' : 'تحديث حالة الخدمة',
      bodyAr:
        status === 'approved'
          ? `تم نشر خدمة "${updated.titleAr}" بنجاح.`
          : `تم تحديث حالة "${updated.titleAr}" إلى ${status}.`,
      kind: 'approval',
    });
    res.json({ service: updated });
  });

  app.delete('/api/admin/services/:id', requireAdmin, (req: AuthedRequest, res) => {
    deleteServiceRecord(req.params.id);
    logAdminAction(req.user!, 'حذف خدمة', 'service', req.params.id);
    res.json({ deleted: true });
  });

  app.post('/api/admin/reviews/:id/status', requireAdmin, (req: AuthedRequest, res) => {
    const { status } = req.body as { status?: ApprovalStatus };
    if (!status) {
      res.status(400).json({ error: 'الحالة مطلوبة.' });
      return;
    }
    const updated = updateReviewStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'التقييم غير موجود.' });
      return;
    }
    logAdminAction(req.user!, `اعتماد/تحديث تقييم إلى ${status}`, 'review', updated.id);
    res.json({ review: updated });
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, (req: AuthedRequest, res) => {
    deleteReviewRecord(req.params.id);
    logAdminAction(req.user!, 'حذف تقييم', 'review', req.params.id);
    res.json({ deleted: true });
  });

  app.post('/api/admin/requests/:id/status', requireAdmin, (req: AuthedRequest, res) => {
    const { status } = req.body as { status?: 'open' | 'matched' | 'closed' };
    if (!status) {
      res.status(400).json({ error: 'الحالة مطلوبة.' });
      return;
    }
    const updated = updateCustomerRequestStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'الطلب غير موجود.' });
      return;
    }
    logAdminAction(req.user!, `تحديث طلب العميل "${updated.titleAr}" إلى ${status}`, 'request', updated.id);
    res.json({ request: updated });
  });

  app.delete('/api/admin/requests/:id', requireAdmin, (req: AuthedRequest, res) => {
    deleteCustomerRequest(req.params.id);
    logAdminAction(req.user!, 'حذف طلب عميل', 'request', req.params.id);
    res.json({ deleted: true });
  });

  app.post('/api/admin/users/:id', requireAdmin, (req: AuthedRequest, res) => {
    const { role, status } = req.body as { role?: UserRole; status?: 'active' | 'suspended' };
    const target = getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'المستخدم غير موجود.' });
      return;
    }
    const updated = adminUpdateUser(req.params.id, role || target.role, status || target.status);
    logAdminAction(req.user!, `تعديل صلاحية/حالة المستخدم ${target.name}`, 'user', target.id);
    res.json({ user: updated });
  });

  app.delete('/api/admin/invitations/:id', requireAdmin, (req: AuthedRequest, res) => {
    deleteInvitationRecord(req.params.id);
    logAdminAction(req.user!, 'حذف دعوة إلكترونية', 'invitation', req.params.id);
    res.json({ deleted: true });
  });

  app.post('/api/admin/notifications/broadcast', requireAdmin, (req: AuthedRequest, res) => {
    const { titleAr, bodyAr } = req.body as { titleAr?: string; bodyAr?: string };
    if (!titleAr?.trim() || !bodyAr?.trim()) {
      res.status(400).json({ error: 'يرجى كتابة عنوان ونص الإشعار.' });
      return;
    }
    const users = listAllUsers();
    for (const u of users) {
      createNotification({
        userId: u.id,
        titleAr: titleAr.trim(),
        bodyAr: bodyAr.trim(),
        kind: 'system',
      });
    }
    logAdminAction(req.user!, `إرسال إشعار عام: ${titleAr.trim()}`, 'notification', 'broadcast');
    res.json({ sentTo: users.length });
  });

  // --- Automated WhatsApp Wedding Reminders (Admin & Protected Cron Webhook) ---
  app.get('/api/admin/reminders', requireAdmin, (_req: AuthedRequest, res) => {
    res.json(getRemindersAdminSnapshot());
  });

  app.post('/api/admin/reminders/run', requireAdmin, async (req: AuthedRequest, res) => {
    const summary = await runScheduledWhatsAppReminders('admin_manual');
    logAdminAction(
      req.user!,
      `تشغيل فحص تذكيرات الواتساب (${summary.dispatchedCount} رسالة جديدة)`,
      'whatsapp_reminders',
      'manual_sweep'
    );
    res.json({
      summary,
      ...getRemindersAdminSnapshot(),
    });
  });

  app.post('/api/admin/reminders/test', requireAdmin, async (req: AuthedRequest, res) => {
    const { phone, milestone, clientName, targetTitle, eventDate, eventTime } = req.body as {
      phone?: string;
      milestone?: WhatsAppMilestone;
      clientName?: string;
      targetTitle?: string;
      eventDate?: string;
      eventTime?: string;
    };
    if (!phone?.trim()) {
      res.status(400).json({ error: 'يرجى إدخال رقم الهاتف لإرسال الرسالة التجريبية.' });
      return;
    }
    try {
      const reminder = await sendTestWhatsAppReminder({
        phone,
        milestone: milestone === '1d' || milestone === '6h' ? milestone : '3d',
        clientName,
        targetTitle,
        eventDate,
        eventTime,
      });
      logAdminAction(req.user!, `إرسال تذكير واتساب تجريبي إلى ${reminder.recipientPhone}`, 'whatsapp_reminders', reminder.id);
      res.json({
        reminder,
        ...getRemindersAdminSnapshot(),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'تعذر إرسال الرسالة التجريبية.' });
    }
  });

  app.post('/api/reminders/run', async (req: AuthedRequest, res) => {
    const isAdmin = req.user?.role === 'admin';
    const configuredSecret = (process.env.REMINDER_CRON_SECRET || '').trim();
    const headerSecretRaw =
      typeof req.headers['x-cron-secret'] === 'string'
        ? req.headers['x-cron-secret'].trim()
        : extractToken(req);

    let secretValid = false;
    if (configuredSecret && headerSecretRaw) {
      const a = Buffer.from(configuredSecret, 'utf8');
      const b = Buffer.from(headerSecretRaw, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        secretValid = true;
      }
    }

    if (!isAdmin && !secretValid) {
      res.status(401).json({ error: 'رمز التشغيل المجدول (REMINDER_CRON_SECRET) غير صالح أو مفقود.' });
      return;
    }

    const summary = await runScheduledWhatsAppReminders(isAdmin && !secretValid ? 'admin_manual' : 'cron_webhook');
    res.json({ ok: true, summary });
  });

  // --- Personal Couple Wedding Workspace (Authenticated per-user persistence) ---
  app.get('/api/workspace', requireAuth, (req: AuthedRequest, res) => {
    const workspace = getCoupleWorkspace(req.user!.id, req.user!.name);
    res.json({ workspace });
  });

  app.put('/api/workspace', requireAuth, (req: AuthedRequest, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const updated = saveCoupleWorkspace(req.user!.id, body, req.user!.name);
    res.json({ workspace: updated });
  });

  // --- "Find Your Wedding" (اعثر على فرحك) Smart Package Matchmaker ---
  app.post('/api/find-wedding', (req, res) => {
    const body = (req.body || {}) as {
      governorate?: string;
      weddingDate?: string;
      budgetEgp?: number;
      guestsCount?: number;
      dreamStyle?: WeddingDreamStyle;
    };

    const governorate = (body.governorate || 'القاهرة').trim().slice(0, 40);
    const weddingDate = (body.weddingDate || '').trim().slice(0, 10);
    const budgetEgp = Math.min(20000000, Math.max(10000, Number(body.budgetEgp) || 150000));
    const guestsCount = Math.min(3000, Math.max(20, Number(body.guestsCount) || 200));
    const validStyles: WeddingDreamStyle[] = [
      'royal_palace',
      'nile_garden',
      'modern_chic',
      'intimate_boutique',
      'classic_heritage',
    ];
    const dreamStyle: WeddingDreamStyle =
      body.dreamStyle && validStyles.includes(body.dreamStyle) ? body.dreamStyle : 'royal_palace';

    const venues = listVenues();
    const photographers = listPhotographers();
    const services = listServices();
    const allBookings = listAllBookings();

    const reservedVenueIds: string[] = [];
    const reservedPhotographerIds: string[] = [];

    if (/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
      for (const v of venues) {
        if (hasBookingConflict(allBookings, 'venue', v.id, weddingDate)) {
          reservedVenueIds.push(v.id);
        }
      }
      for (const p of photographers) {
        if (hasBookingConflict(allBookings, 'photographer', p.id, weddingDate)) {
          reservedPhotographerIds.push(p.id);
        }
      }
    }

    const packages = buildWeddingMatchPackages(
      { governorate, weddingDate, budgetEgp, guestsCount, dreamStyle },
      { venues, photographers, services, reservedVenueIds, reservedPhotographerIds }
    );

    res.json({
      packages,
      availabilityChecked: /^\d{4}-\d{2}-\d{2}$/.test(weddingDate),
      reservedCount: reservedVenueIds.length + reservedPhotographerIds.length,
    });
  });

  // --- Platform Packages & Subscriptions (Providers & Clients) ---
  app.get('/api/subscription-plans', (_req, res) => {
    res.json({ plans: listSubscriptionPlans(false) });
  });

  app.get('/api/subscriptions/mine', requireAuth, (req: AuthedRequest, res) => {
    res.json({ subscriptions: listUserSubscriptions(req.user!.id) });
  });

  app.post('/api/subscriptions/request', requireAuth, (req: AuthedRequest, res) => {
    const { planId, billingCycle, contactPhone, businessOrCoupleName, paymentMethod, notes } =
      (req.body || {}) as {
        planId?: string;
        billingCycle?: SubscriptionBillingCycle;
        contactPhone?: string;
        businessOrCoupleName?: string;
        paymentMethod?: string;
        notes?: string;
      };

    const plan = planId ? getSubscriptionPlanById(planId) : null;
    if (!plan || !plan.active) {
      res.status(404).json({ error: 'الباقة المختارة غير متاحة حاليًا.' });
      return;
    }

    if (!contactPhone?.trim()) {
      res.status(400).json({ error: 'يرجى إدخال رقم هاتف للتواصل وتفعيل الاشتراك.' });
      return;
    }

    const cycle: SubscriptionBillingCycle =
      billingCycle === 'annual'
        ? 'annual'
        : billingCycle === 'quarterly'
        ? 'quarterly'
        : billingCycle === 'one_time'
        ? 'one_time'
        : 'monthly';
    const amountEgp =
      cycle === 'annual'
        ? plan.annualPriceEgp
        : cycle === 'quarterly'
        ? plan.quarterlyPriceEgp
        : plan.monthlyPriceEgp;

    const record = createUserSubscriptionRequest({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      planId: plan.id,
      planNameAr: plan.nameAr,
      audience: plan.audience,
      billingCycle: cycle,
      amountEgp,
      contactPhone,
      businessOrCoupleName: businessOrCoupleName?.trim() || req.user!.name,
      paymentMethod: paymentMethod?.trim() || 'انستاباي / تحويل بنكي',
      notes,
    });

    notifyAllAdmins({
      titleAr: `طلب اشتراك جديد (${plan.nameAr})`,
      bodyAr: `طلب ${req.user!.name} الاشتراك في ${plan.nameAr} بقيمة ${amountEgp.toLocaleString('en-US')} ج.م.`,
      kind: 'approval',
    });

    res.status(201).json({ subscription: record });
  });

  app.get('/api/admin/subscriptions', requireAdmin, (_req: AuthedRequest, res) => {
    res.json({
      plans: listSubscriptionPlans(true),
      requests: listUserSubscriptions(),
    });
  });

  app.put('/api/admin/subscription-plans/:id', requireAdmin, (req: AuthedRequest, res) => {
    const updated = updateSubscriptionPlan(req.params.id, (req.body || {}) as Record<string, unknown>);
    if (!updated) {
      res.status(404).json({ error: 'الباقة غير موجودة.' });
      return;
    }
    logAdminAction(req.user!, `تحديث باقة الاشتراك: ${updated.nameAr}`, 'subscription_plan', updated.id);
    res.json({ plan: updated, plans: listSubscriptionPlans(true) });
  });

  app.post('/api/admin/subscriptions/:id/status', requireAdmin, (req: AuthedRequest, res) => {
    const { status, adminNote } = (req.body || {}) as {
      status?: SubscriptionRequestStatus;
      adminNote?: string;
    };
    const valid: SubscriptionRequestStatus[] = ['pending', 'active', 'rejected', 'cancelled'];
    if (!status || !valid.includes(status)) {
      res.status(400).json({ error: 'حالة الاشتراك غير صالحة.' });
      return;
    }
    const updated = updateUserSubscriptionStatus(req.params.id, status, adminNote || '');
    if (!updated) {
      res.status(404).json({ error: 'طلب الاشتراك غير موجود.' });
      return;
    }
    createNotification({
      userId: updated.userId,
      titleAr: status === 'active' ? `تم تفعيل باقة ${updated.planNameAr}` : `تحديث حول طلب ${updated.planNameAr}`,
      bodyAr:
        status === 'active'
          ? `تم تفعيل اشتراكك في ${updated.planNameAr} بنجاح عبر إدارة VÉLORA.`
          : `حالة طلبك الآن: ${status}${adminNote ? ` — ${adminNote}` : ''}`,
      kind: 'approval',
      relatedRoute: 'packages',
    });
    logAdminAction(req.user!, `تحديث اشتراك ${updated.userName} إلى ${status}`, 'user_subscription', updated.id);
    res.json({ subscription: updated, requests: listUserSubscriptions() });
  });

  // Preserve WebSocket-free Vite dev client stub BEFORE vite.middlewares
  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript');
      res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VÉLORA server running on http://localhost:${PORT}`);
    setTimeout(() => {
      runScheduledWhatsAppReminders('auto_interval').catch((err) => {
        console.error('Initial WhatsApp reminder check failed:', err);
      });
    }, 12000);
    setInterval(() => {
      runScheduledWhatsAppReminders('auto_interval').catch((err) => {
        console.error('Periodic WhatsApp reminder check failed:', err);
      });
    }, 15 * 60 * 1000);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VÉLORA server:', err);
  process.exit(1);
});
