/**
 * Browser-side data layer for Firebase Hosting (no Express server needed).
 * It answers the same `/api/...` calls the app already makes, using
 * Firebase Auth + Firestore. Access control is enforced by firestore.rules.
 */
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  INVITATION_DESIGNS,
  buildWeddingMatchPackages,
  computeEffectivePrice,
  createDefaultCoupleWorkspace,
  hasBookingConflict,
  resolveNextBookingStatus,
  sanitizeSlug,
  summarizeInvitationRsvps,
  validateContactIdentifier,
} from './veloraLogic';
import type {
  AdminAuditLogRecord,
  ApprovalStatus,
  BookingRecord,
  CoupleWorkspaceRecord,
  CustomerRequestRecord,
  ElectronicInvitationRecord,
  FavoriteRecord,
  InvitationDesignId,
  InvitationRsvpRecord,
  NotificationRecord,
  PhotographerRecord,
  ReviewRecord,
  ServiceCategoryKey,
  ServiceRecord,
  TargetEntityType,
  UserProfile,
  UserRole,
  VenueRecord,
} from '../types/velora';

// The only account that becomes admin automatically (must be a Google-verified email).
export const ADMIN_EMAIL = 'zezo04216@gmail.com';

type Body = Record<string, unknown>;

class ApiError extends Error {}

const fail = (msg: string): never => {
  throw new ApiError(msg);
};

const nowIso = () => new Date().toISOString();

const newId = (prefix: string) => `${prefix}-${doc(collection(db!, '_ids')).id}`;

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireDb() {
  if (!db || !auth) fail('خدمة البيانات السحابية غير مهيأة.');
  return { db: db!, auth: auth! };
}

const SELF_ROLES: UserRole[] = ['client', 'venue_owner', 'photographer', 'service_provider'];

// ---------- users ----------

let cachedProfile: UserProfile | null = null;

function contactToEmail(contact: string): { email: string; kind: 'email' | 'phone'; normalized: string } {
  const parsed = validateContactIdentifier(contact);
  if (parsed.kind === 'invalid') {
    fail('يرجى إدخال بريد إلكتروني أو رقم هاتف صحيح.');
  }
  if (parsed.kind === 'email') {
    return { email: parsed.normalized, kind: 'email', normalized: parsed.normalized };
  }
  const digits = parsed.normalized.replace(/\D/g, '');
  return { email: `p${digits}@phone.velora.app`, kind: 'phone', normalized: parsed.normalized };
}

function mapAuthError(err: unknown): never {
  const code =
    typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: string }).code) : '';
  if (err instanceof ApiError) throw err;
  if (code === 'auth/email-already-in-use') fail('هذا الحساب مسجل بالفعل، يمكنك تسجيل الدخول مباشرة.');
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-email'
  )
    fail('بيانات الدخول غير صحيحة.');
  if (code === 'auth/weak-password') fail('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
  if (code === 'auth/too-many-requests') fail('محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.');
  if (code === 'auth/network-request-failed') fail('تعذر الاتصال بالإنترنت. حاول مرة أخرى.');
  if (code === 'auth/operation-not-allowed') fail('طريقة الدخول هذه غير مفعلة بعد.');
  if (code === 'permission-denied' || code === 'firestore/permission-denied')
    fail('ليست لديك صلاحية لتنفيذ هذا الإجراء.');
  throw err instanceof Error ? err : new Error('حدث خطأ غير متوقع.');
}

async function loadProfile(fbUser: User): Promise<UserProfile | null> {
  const { db: d } = requireDb();
  const snap = await getDoc(doc(d, 'users', fbUser.uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

async function ensureProfile(
  fbUser: User,
  opts: { name?: string; role?: UserRole; city?: string; phone?: string; bio?: string } = {}
): Promise<UserProfile> {
  const { db: d } = requireDb();
  let profile = await loadProfile(fbUser);
  const isAdminEmail =
    (fbUser.email || '').toLowerCase() === ADMIN_EMAIL && fbUser.emailVerified === true;

  if (!profile) {
    const role: UserRole = isAdminEmail
      ? 'admin'
      : opts.role && SELF_ROLES.includes(opts.role)
        ? opts.role
        : 'client';
    const email = fbUser.email && !fbUser.email.endsWith('@phone.velora.app') ? fbUser.email.toLowerCase() : '';
    profile = {
      id: fbUser.uid,
      name:
        (opts.name || fbUser.displayName || '').trim() ||
        (email ? email.split('@')[0] : 'مستخدم VÉLORA'),
      email,
      phone: opts.phone || '',
      role,
      status: 'active',
      avatarUrl: fbUser.photoURL || '',
      city: (opts.city || '').trim() || 'القاهرة',
      bio: opts.bio || '',
      createdAt: nowIso(),
    };
    await setDoc(doc(d, 'users', fbUser.uid), clean(profile));
    await notify({
      userId: fbUser.uid,
      titleAr: 'مرحبًا بك في VÉLORA',
      bodyAr: 'تم إنشاء حسابك بنجاح. يمكنك الآن استكشاف القاعات والمصورين وإرسال طلبات الحجز وتصميم دعوتك.',
      kind: 'system',
    });
  } else if (isAdminEmail && profile.role !== 'admin') {
    await updateDoc(doc(d, 'users', fbUser.uid), { role: 'admin' });
    profile = { ...profile, role: 'admin' };
  }
  if (profile.status === 'suspended') {
    await signOut(requireDb().auth);
    cachedProfile = null;
    fail('هذا الحساب موقوف حاليًا. يرجى التواصل مع إدارة المنصة.');
  }
  cachedProfile = profile;
  return profile;
}

async function currentUser(): Promise<UserProfile | null> {
  const { auth: a } = requireDb();
  await a.authStateReady();
  const fb = a.currentUser;
  if (!fb) {
    cachedProfile = null;
    return null;
  }
  if (cachedProfile && cachedProfile.id === fb.uid) return cachedProfile;
  const profile = await loadProfile(fb);
  cachedProfile = profile;
  return profile;
}

async function needUser(): Promise<UserProfile> {
  const u = await currentUser();
  if (!u) fail('يرجى تسجيل الدخول أولًا.');
  return u!;
}

async function needAdmin(): Promise<UserProfile> {
  const u = await needUser();
  if (u.role !== 'admin') fail('هذه الصفحة مخصصة لإدارة المنصة فقط.');
  return u;
}

async function tokenFor(fb: User): Promise<string> {
  return fb.getIdToken();
}

// ---------- notifications / audit ----------

async function notify(n: {
  userId: string;
  titleAr: string;
  bodyAr: string;
  kind: NotificationRecord['kind'];
  relatedRoute?: string;
}) {
  const { db: d } = requireDb();
  const id = newId('notif');
  const rec: NotificationRecord = clean({
    id,
    userId: n.userId,
    titleAr: n.titleAr,
    bodyAr: n.bodyAr,
    kind: n.kind,
    relatedRoute: n.relatedRoute,
    isRead: false,
    createdAt: nowIso(),
  });
  try {
    await setDoc(doc(d, 'notifications', id), rec);
  } catch {
    // Notifications are best-effort and must never block the main action.
  }
}

const notifyAdmins = (n: Omit<Parameters<typeof notify>[0], 'userId'>) => notify({ ...n, userId: 'admin' });

async function audit(admin: UserProfile, actionAr: string, entityType: string, entityId: string) {
  const { db: d } = requireDb();
  const id = newId('audit');
  const rec: AdminAuditLogRecord = {
    id,
    adminId: admin.id,
    adminName: admin.name,
    actionAr,
    entityType,
    entityId,
    createdAt: nowIso(),
  };
  try {
    await setDoc(doc(d, 'auditLogs', id), rec);
  } catch {
    // ignore
  }
}

// ---------- generic list helpers ----------

async function readAll<T>(col: string, ...cons: Parameters<typeof where>[]): Promise<T[]> {
  const { db: d } = requireDb();
  const q = cons.length
    ? query(collection(d, col), ...cons.map((c) => where(...c)))
    : collection(d, col);
  const snap = await getDocs(q);
  return snap.docs.map((x) => x.data() as T);
}

const byNewest = <T extends { createdAt?: string }>(a: T, b: T) =>
  String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

async function listListings<T extends { id: string; createdAt: string; featured?: boolean }>(
  col: 'venues' | 'photographers' | 'services',
  all: boolean
): Promise<T[]> {
  const user = await currentUser();
  if (all && user?.role === 'admin') {
    return (await readAll<T>(col)).sort(byNewest);
  }
  const approved = await readAll<T>(col, ['status', '==', 'approved']);
  const map = new Map<string, T>(approved.map((x) => [x.id, x]));
  if (user) {
    const own = await readAll<T>(col, ['ownerId', '==', user.id]);
    own.forEach((x) => map.set(x.id, x));
  }
  return [...map.values()].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || byNewest(a, b)
  );
}

async function getListing<T extends { status: ApprovalStatus; ownerId: string }>(
  col: string,
  id: string,
  notFoundMsg: string,
  pendingMsg: string
): Promise<T> {
  const { db: d } = requireDb();
  const user = await currentUser();
  let snap;
  try {
    snap = await getDoc(doc(d, col, id));
  } catch {
    return fail(pendingMsg);
  }
  if (!snap.exists()) return fail(notFoundMsg);
  const rec = snap.data() as T;
  if (rec.status !== 'approved' && user?.role !== 'admin' && user?.id !== rec.ownerId) fail(pendingMsg);
  return rec;
}

async function reviewsFor(targetType: TargetEntityType, targetId: string): Promise<ReviewRecord[]> {
  const user = await currentUser();
  const approved = await readAll<ReviewRecord>('reviews', ['targetId', '==', targetId], ['status', '==', 'approved']);
  const map = new Map<string, ReviewRecord>(approved.map((r) => [r.id, r]));
  if (user) {
    const mine = await readAll<ReviewRecord>('reviews', ['authorId', '==', user.id], ['targetId', '==', targetId]);
    mine.forEach((r) => map.set(r.id, r));
  }
  return [...map.values()].filter((r) => r.targetType === targetType).sort(byNewest);
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) && Number(v) !== 0 ? Number(v) : fallback);
const strArr = (v: unknown, fallback: string[]) =>
  Array.isArray(v) && v.length ? (v as unknown[]).map(String) : fallback;

// ---------- image upload (stored inline, resized) ----------

async function shrinkDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) fail('الملف المرفق ليس صورة صالحة.');
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    i.src = dataUrl;
  });
  let maxSide = 1100;
  let quality = 0.72;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL('image/jpeg', quality);
    if (out.length < 230_000) return out;
    maxSide = Math.round(maxSide * 0.8);
    quality = Math.max(0.5, quality - 0.06);
  }
  return fail('الصورة كبيرة جدًا، يرجى اختيار صورة أصغر.');
}

// ---------- route table ----------

type Ctx = { params: string[]; query: URLSearchParams; body: Body; method: string };
type Handler = (c: Ctx) => Promise<unknown>;

const routes: Array<[string, RegExp, Handler]> = [];
const route = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp(`^${pattern}$`), h]);

const unavailable = (what: string) => async () =>
  fail(`${what} غير متاحة حاليًا في هذه النسخة، وسيتم تفعيلها قريبًا.`);

// ----- auth -----

route('GET', '/api/auth/admin-status', async () => ({ hasAdmin: true, requiresPasscode: false }));
route('POST', '/api/auth/admin-claim', async () =>
  fail('حساب الإدارة يتفعّل تلقائيًا للبريد المعتمد عبر تسجيل الدخول بـ Google.')
);

route('POST', '/api/auth/register', async ({ body }) => {
  const { auth: a } = requireDb();
  const name = str(body.name);
  const password = String(body.password || '');
  if (!name) fail('يرجى إدخال الاسم الكامل.');
  if (password.length < 6) fail('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
  const c = contactToEmail(String(body.contact || ''));
  try {
    const cred = await createUserWithEmailAndPassword(a, c.email, password);
    const user = await ensureProfile(cred.user, {
      name,
      role: body.role as UserRole,
      city: str(body.city),
      bio: str(body.bio),
      phone: c.kind === 'phone' ? c.normalized : '',
    });
    return { user, token: await tokenFor(cred.user) };
  } catch (e) {
    return mapAuthError(e);
  }
});

route('POST', '/api/auth/login', async ({ body }) => {
  const { auth: a } = requireDb();
  const contact = String(body.contact || '');
  const password = String(body.password || '');
  if (!contact.trim() || !password) fail('يرجى إدخال البريد الإلكتروني أو الهاتف وكلمة المرور.');
  const c = contactToEmail(contact);
  try {
    const cred = await signInWithEmailAndPassword(a, c.email, password);
    const user = await ensureProfile(cred.user, {});
    return { user, token: await tokenFor(cred.user) };
  } catch (e) {
    return mapAuthError(e);
  }
});

// Called right after Google sign-in has already happened in the browser.
route('POST', '/api/auth/firebase', async ({ body }) => {
  const { auth: a } = requireDb();
  const fb = a.currentUser;
  if (!fb) fail('لم يتم تسجيل الدخول عبر Google. حاول مرة أخرى.');
  try {
    const user = await ensureProfile(fb!, { role: body.role as UserRole, city: str(body.city) });
    return { user, token: await tokenFor(fb!) };
  } catch (e) {
    return mapAuthError(e);
  }
});

route('POST', '/api/auth/logout', async () => {
  const { auth: a } = requireDb();
  cachedProfile = null;
  await signOut(a);
  return { ok: true };
});

route('GET', '/api/auth/me', async () => ({ user: await currentUser() }));

route('PUT', '/api/auth/profile', async ({ body }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const patch = clean({
    name: str(body.name, user.name),
    phone: typeof body.phone === 'string' ? body.phone.trim() : user.phone,
    city: str(body.city, user.city),
    bio: typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : user.bio,
    avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : user.avatarUrl,
  });
  await updateDoc(doc(d, 'users', user.id), patch);
  cachedProfile = { ...user, ...patch };
  return { user: cachedProfile };
});

route('PUT', '/api/auth/change-password', async ({ body }) => {
  const { auth: a } = requireDb();
  const fb = a.currentUser;
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!fb || !fb.email) fail('يرجى تسجيل الدخول أولًا.');
  if (!currentPassword || newPassword.length < 6)
    fail('يرجى إدخال كلمة المرور الحالية وكلمة مرور جديدة (6 أحرف على الأقل).');
  if (!fb!.providerData.some((p) => p.providerId === 'password'))
    fail('هذا الحساب مرتبط بـ Google ولا يستخدم كلمة مرور. غيّر كلمة مرور Google من حسابك.');
  try {
    await reauthenticateWithCredential(fb!, EmailAuthProvider.credential(fb!.email!, currentPassword));
    await updatePassword(fb!, newPassword);
  } catch {
    fail('كلمة المرور الحالية غير صحيحة.');
  }
  return { ok: true, message: 'تم تحديث كلمة المرور بنجاح.' };
});

route('POST', '/api/auth/forgot-password', async ({ body }) => {
  const { auth: a } = requireDb();
  const contact = String(body.contact || '');
  if (!contact.trim()) fail('يرجى إدخال البريد الإلكتروني أو رقم الهاتف.');
  if (!contact.includes('@'))
    fail('استعادة كلمة المرور تعمل للحسابات المسجلة بالبريد الإلكتروني فقط. تواصل مع الدعم للحسابات بالهاتف.');
  try {
    await sendPasswordResetEmail(a, contact.trim());
  } catch {
    // Do not reveal whether the account exists.
  }
  return { ok: true, message: 'إذا كان الحساب موجودًا، تم إرسال رابط استعادة كلمة المرور إلى بريدك.' };
});

route('POST', '/api/auth/reset-password', async () =>
  fail('استخدم رابط استعادة كلمة المرور المرسل إلى بريدك الإلكتروني.')
);

// ----- media -----

route('POST', '/api/media/upload', async ({ body }) => {
  await needUser();
  return { url: await shrinkDataUrl(String(body.dataUrl || '')) };
});

// ----- venues / photographers / services -----

route('GET', '/api/venues', async ({ query: q }) => ({
  venues: await listListings<VenueRecord>('venues', q.get('all') === '1'),
}));
route('GET', '/api/venues/([^/]+)', async ({ params }) => {
  const venue = await getListing<VenueRecord>(
    'venues',
    params[0],
    'القاعة غير موجودة.',
    'هذه القاعة قيد المراجعة الإدارية حاليًا.'
  );
  return { venue, reviews: await reviewsFor('venue', venue.id) };
});
route('POST', '/api/venues', async ({ body: b }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  if (!['venue_owner', 'admin'].includes(user.role)) fail('هذه الإضافة مخصصة لحسابات أصحاب القاعات أو الإدارة.');
  if (!str(b.titleAr) || !str(b.city)) fail('يرجى إدخال اسم القاعة والمدينة.');
  const cover = str(b.coverImage, '/src/assets/images/velora_venue_palace_1795424759214.jpg');
  const id = newId('venue');
  const rec: VenueRecord = clean({
    id,
    ownerId: user.id,
    ownerName: user.name,
    titleAr: str(b.titleAr),
    subtitleAr: str(b.subtitleAr, 'قاعة أفراح ومناسبات فاخرة'),
    city: str(b.city),
    area: str(b.area, str(b.city)),
    address: str(b.address, 'سيتم مشاركة العنوان التفصيلي عند الحجز'),
    mapUrl: str(b.mapUrl, 'https://maps.google.com/?q=30.0444,31.2357'),
    capacityMin: Math.max(20, num(b.capacityMin, 100)),
    capacityMax: Math.max(50, num(b.capacityMax, 350)),
    pricePerEvent: Math.max(1000, num(b.pricePerEvent, 45000)),
    discountPercent: Math.min(80, Math.max(0, Number(b.discountPercent) || 0)),
    workingHours: str(b.workingHours, '10:00 ص - 11:00 م'),
    decorStyles: strArr(b.decorStyles, ['كلاسيك ملكي']),
    features: strArr(b.features, ['جناح خاص للعروسين', 'إضاءة احترافية']),
    descriptionAr: str(b.descriptionAr, 'قاعة راقية مجهزة بالكامل لاستقبال حفلات الزفاف.'),
    coverImage: cover,
    galleryImages: strArr(b.galleryImages, [cover]),
    videoUrl: str(b.videoUrl),
    status: user.role === 'admin' ? 'approved' : 'pending',
    featured: false,
    avgRating: 0,
    reviewsCount: 0,
    createdAt: nowIso(),
  });
  await setDoc(doc(d, 'venues', id), rec);
  if (rec.status === 'pending')
    await notifyAdmins({
      titleAr: 'طلب اعتماد قاعة جديدة',
      bodyAr: `أضاف "${user.name}" قاعة "${rec.titleAr}" وهي بانتظار موافقة الإدارة قبل النشر.`,
      kind: 'approval',
    });
  return { venue: rec };
});

route('GET', '/api/photographers', async ({ query: q }) => ({
  photographers: await listListings<PhotographerRecord>('photographers', q.get('all') === '1'),
}));
route('GET', '/api/photographers/([^/]+)', async ({ params }) => {
  const photographer = await getListing<PhotographerRecord>(
    'photographers',
    params[0],
    'المصور غير موجود.',
    'ملف المصور قيد المراجعة الإدارية حاليًا.'
  );
  return { photographer, reviews: await reviewsFor('photographer', photographer.id) };
});
route('POST', '/api/photographers', async ({ body: b }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  if (!['photographer', 'admin'].includes(user.role)) fail('هذه الإضافة مخصصة لحسابات المصورين أو الإدارة.');
  if (!str(b.displayName)) fail('يرجى إدخال اسم المصور أو الاستوديو.');
  const cover = str(b.coverImage, '/src/assets/images/velora_photographer_couple_1795424759634.jpg');
  const id = newId('photo');
  const city = str(b.city, 'القاهرة');
  const rec: PhotographerRecord = clean({
    id,
    ownerId: user.id,
    displayName: str(b.displayName),
    specialtyAr: str(b.specialtyAr, 'تصوير أفراح سينمائي'),
    city,
    studioLocation: str(b.studioLocation, 'القاهرة'),
    yearsExperience: Math.max(1, num(b.yearsExperience, 5)),
    workingHours: str(b.workingHours, '11:00 ص - 10:00 م'),
    startingPrice: Math.max(1000, num(b.startingPrice, 12000)),
    discountPercent: Math.min(80, Math.max(0, Number(b.discountPercent) || 0)),
    bioAr: str(b.bioAr, 'توثيق احترافي لأجمل لحظات الزفاف.'),
    equipmentAr: str(b.equipmentAr, 'كاميرات Full-Frame وعدسات سينمائية'),
    shootingTypes: strArr(b.shootingTypes, ['فوتو سيشن', 'تغطية الحفل']),
    avatarUrl: str(b.avatarUrl, cover),
    coverImage: cover,
    videoReelUrl: str(b.videoReelUrl),
    albums: [
      {
        id: newId('album'),
        photographerId: id,
        titleAr: str(b.albumTitleAr, 'ألبوم الأعمال المختارة'),
        descriptionAr: str(b.albumDescriptionAr, 'مختارات من أحدث جلسات الزفاف والخطوبة.'),
        sessionDate: nowIso().slice(0, 10),
        locationAr: city,
        photos: strArr(b.albumPhotos, [cover]),
      },
    ],
    status: user.role === 'admin' ? 'approved' : 'pending',
    featured: false,
    avgRating: 0,
    reviewsCount: 0,
    createdAt: nowIso(),
  });
  await setDoc(doc(d, 'photographers', id), rec);
  if (rec.status === 'pending')
    await notifyAdmins({
      titleAr: 'طلب اعتماد مصور جديد',
      bodyAr: `سجّل المصور "${rec.displayName}" ملفه المهني وهو بانتظار المراجعة قبل الظهور للعملاء.`,
      kind: 'approval',
    });
  return { photographer: rec };
});
route('POST', '/api/photographers/([^/]+)/albums', async ({ params, body: b }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const ref = doc(d, 'photographers', params[0]);
  const snap = await getDoc(ref);
  if (!snap.exists()) fail('المصور غير موجود.');
  const ph = snap.data() as PhotographerRecord;
  if (ph.ownerId !== user.id && user.role !== 'admin') fail('لا تملك صلاحية تعديل ألبومات هذا المصور.');
  const photos = Array.isArray(b.photos) ? (b.photos as string[]) : [];
  if (!str(b.titleAr) || photos.length === 0) fail('يرجى إدخال عنوان الألبوم وإرفاق صورة واحدة على الأقل.');
  const albums = [
    ...(ph.albums || []),
    {
      id: newId('album'),
      photographerId: ph.id,
      titleAr: str(b.titleAr),
      descriptionAr: str(b.descriptionAr),
      sessionDate: str(b.sessionDate, nowIso().slice(0, 10)),
      locationAr: str(b.locationAr, ph.city),
      photos,
    },
  ];
  await updateDoc(ref, { albums: clean(albums) });
  return { photographer: { ...ph, albums } };
});

route('GET', '/api/services', async ({ query: q }) => ({
  services: await listListings<ServiceRecord>('services', q.get('all') === '1'),
}));
route('GET', '/api/services/([^/]+)', async ({ params }) => {
  const service = await getListing<ServiceRecord>(
    'services',
    params[0],
    'الخدمة غير موجودة.',
    'هذه الخدمة قيد المراجعة الإدارية.'
  );
  return { service, reviews: await reviewsFor('service', service.id) };
});
route('POST', '/api/services', async ({ body: b }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  if (!['service_provider', 'admin'].includes(user.role)) fail('هذه الإضافة مخصصة لحسابات مقدمي الخدمات أو الإدارة.');
  if (!str(b.titleAr)) fail('يرجى إدخال عنوان الخدمة.');
  const cover = str(b.coverImage, '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg');
  const id = newId('service');
  const rec: ServiceRecord = clean({
    id,
    ownerId: user.id,
    providerName: user.name,
    category: str(b.category, 'decor') as ServiceCategoryKey,
    titleAr: str(b.titleAr),
    city: str(b.city, 'القاهرة'),
    area: str(b.area, str(b.city, 'القاهرة')),
    startingPrice: Math.max(500, num(b.startingPrice, 8000)),
    discountPercent: Math.min(80, Math.max(0, Number(b.discountPercent) || 0)),
    workingHours: str(b.workingHours, '10:00 ص - 9:00 م'),
    descriptionAr: str(b.descriptionAr, 'خدمة زفاف متكاملة بأعلى معايير الجودة.'),
    packagesAr: strArr(b.packagesAr, ['باقة أساسية متكاملة']),
    coverImage: cover,
    galleryImages: strArr(b.galleryImages, [cover]),
    videoUrl: str(b.videoUrl),
    status: user.role === 'admin' ? 'approved' : 'pending',
    featured: false,
    avgRating: 0,
    reviewsCount: 0,
    createdAt: nowIso(),
  });
  await setDoc(doc(d, 'services', id), rec);
  if (rec.status === 'pending')
    await notifyAdmins({
      titleAr: 'طلب اعتماد خدمة جديدة',
      bodyAr: `أضاف "${user.name}" خدمة "${rec.titleAr}" وبانتظار موافقة الإدارة.`,
      kind: 'approval',
    });
  return { service: rec };
});

// ----- customer requests -----

route('GET', '/api/requests', async ({ query: q }) => {
  const user = await currentUser();
  if (!user) return { requests: [] };
  const section = q.get('section');
  let list: CustomerRequestRecord[];
  if (user.role === 'admin' || user.role === 'venue_owner' || user.role === 'photographer' || user.role === 'service_provider') {
    list = await readAll<CustomerRequestRecord>('requests');
  } else {
    list = await readAll<CustomerRequestRecord>('requests', ['clientId', '==', user.id]);
  }
  return { requests: list.filter((r) => !section || r.requestSection === section).sort(byNewest) };
});
route('POST', '/api/requests', async ({ body: b }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const section = str(b.requestSection) as TargetEntityType;
  if (!['venue', 'photographer', 'service'].includes(section)) fail('يرجى تحديد قسم الطلب الصحيح.');
  if (!str(b.titleAr) || !str(b.eventDate)) fail('يرجى إدخال عنوان الطلب وتاريخ المناسبة المطلوب.');
  const id = newId('req');
  const rec: CustomerRequestRecord = clean({
    id,
    clientId: user.id,
    clientName: user.name,
    clientPhone: user.phone || user.email,
    requestSection: section,
    serviceCategory: b.serviceCategory ? (str(b.serviceCategory) as ServiceCategoryKey) : undefined,
    titleAr: str(b.titleAr),
    eventDate: str(b.eventDate),
    city: str(b.city, 'القاهرة'),
    area: str(b.area),
    guestsCount: Math.max(10, num(b.guestsCount, 150)),
    budgetEgp: Math.max(1000, num(b.budgetEgp, 25000)),
    preferredType: str(b.preferredType),
    requestedServices: strArr(b.requestedServices, []),
    notesAr: str(b.notesAr),
    status: 'open',
    createdAt: nowIso(),
  });
  await setDoc(doc(d, 'requests', id), rec);
  await notifyAdmins({
    titleAr: 'طلب عميل جديد',
    bodyAr: `أضاف "${user.name}" طلبًا جديدًا في قسم ${section === 'venue' ? 'القاعات' : section === 'photographer' ? 'المصورين' : 'الخدمات'}.`,
    kind: 'system',
  });
  return { request: rec };
});

// ----- availability (date holds are public "slot" markers) -----

type Slot = { id: string; targetType: TargetEntityType; targetId: string; date: string; bookingId: string };

const slotId = (t: string, id: string, date: string) => `${t}_${id}_${date}`;

async function slotsOn(date: string): Promise<Slot[]> {
  return readAll<Slot>('slots', ['date', '==', date]);
}

route('GET', '/api/availability', async ({ query: q }) => {
  const date = (q.get('date') || '').trim().slice(0, 10);
  if (!date) fail('يرجى تمرير التاريخ المطلوب فحصه.');
  const slots = await slotsOn(date);
  const targetType = q.get('targetType') as TargetEntityType | null;
  const targetId = q.get('targetId') || '';
  return {
    date,
    reservedVenueIds: slots.filter((s) => s.targetType === 'venue').map((s) => s.targetId),
    reservedPhotographerIds: slots.filter((s) => s.targetType === 'photographer').map((s) => s.targetId),
    specificAvailable:
      targetType && targetId
        ? targetType === 'service' || !slots.some((s) => s.targetType === targetType && s.targetId === targetId)
        : undefined,
  };
});

// ----- bookings -----

async function bookingsForUser(user: UserProfile): Promise<BookingRecord[]> {
  if (user.role === 'admin') return (await readAll<BookingRecord>('bookings')).sort(byNewest);
  const mine = await readAll<BookingRecord>('bookings', ['clientId', '==', user.id]);
  const incoming = await readAll<BookingRecord>('bookings', ['providerOwnerId', '==', user.id]);
  const map = new Map<string, BookingRecord>();
  [...mine, ...incoming].forEach((b) => map.set(b.id, b));
  return [...map.values()].sort(byNewest);
}

async function getBooking(id: string): Promise<BookingRecord> {
  const { db: d } = requireDb();
  let snap;
  try {
    snap = await getDoc(doc(d, 'bookings', id));
  } catch {
    return fail('الحجز غير موجود.');
  }
  if (!snap.exists()) return fail('الحجز غير موجود.');
  return snap.data() as BookingRecord;
}

async function syncSlot(b: BookingRecord) {
  if (b.targetType === 'service') return;
  const { db: d } = requireDb();
  const id = slotId(b.targetType, b.targetId, b.eventDate);
  const blocking = ['confirmed', 'provider_approved', 'admin_approved'].includes(b.status);
  try {
    if (blocking) {
      const slot: Slot = { id, targetType: b.targetType, targetId: b.targetId, date: b.eventDate, bookingId: b.id };
      await setDoc(doc(d, 'slots', id), slot);
    } else {
      const existing = await getDoc(doc(d, 'slots', id));
      if (existing.exists() && (existing.data() as Slot).bookingId === b.id) await deleteDoc(doc(d, 'slots', id));
    }
  } catch {
    // Slot sync is best-effort; the booking itself is already saved.
  }
}

route('GET', '/api/bookings', async () => ({ bookings: await bookingsForUser(await needUser()) }));

route('POST', '/api/bookings', async ({ body: b }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const targetType = b.targetType as TargetEntityType | undefined;
  const targetId = str(b.targetId);
  const eventDate = str(b.eventDate).slice(0, 10);
  if (!targetType || !targetId || !eventDate) fail('يرجى تحديد الجهة المطلوبة وتاريخ المناسبة.');
  const col = targetType === 'venue' ? 'venues' : targetType === 'photographer' ? 'photographers' : 'services';
  const snap = await getDoc(doc(d, col, targetId));
  if (!snap.exists() || (snap.data() as { status: string }).status !== 'approved')
    fail('هذه الجهة غير متاحة حاليًا.');
  const t = snap.data() as VenueRecord & PhotographerRecord & ServiceRecord;
  const targetTitle = t.titleAr || t.displayName;
  const base = t.pricePerEvent ?? t.startingPrice ?? 0;
  const slots = await slotsOn(eventDate);
  if (
    hasBookingConflict(
      slots.map((s) => ({ targetType: s.targetType, targetId: s.targetId, eventDate: s.date, status: 'confirmed' as const })),
      targetType!,
      targetId,
      eventDate
    )
  )
    fail('عذرًا، هذا التاريخ محجوز مسبقًا لهذه الجهة. يرجى اختيار تاريخ آخر متاح.');
  const id = newId('booking');
  const rec: BookingRecord = clean({
    id,
    clientId: user.id,
    clientName: user.name,
    clientPhone: str(b.clientPhone, user.phone || user.email),
    providerOwnerId: t.ownerId,
    targetType: targetType!,
    targetId,
    targetTitle,
    targetImage: t.coverImage,
    eventDate,
    guestsCount: Math.max(10, num(b.guestsCount, 150)),
    estimatedTotalEgp: computeEffectivePrice(base, t.discountPercent || 0),
    paymentMode: 'offline_agreement',
    notes: str(b.notes),
    providerApproved: false,
    adminApproved: false,
    status: 'pending',
    providerNote: '',
    adminNote: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  await setDoc(doc(d, 'bookings', id), rec);
  await notify({
    userId: rec.providerOwnerId,
    titleAr: 'طلب حجز جديد بانتظار موافقتك',
    bodyAr: `قدّم "${user.name}" طلب حجز على "${targetTitle}" بتاريخ ${eventDate}.`,
    kind: 'booking',
    relatedRoute: 'bookings',
  });
  await notifyAdmins({
    titleAr: 'حجز جديد يتطلب المراجعة الإدارية',
    bodyAr: `طلب حجز على "${targetTitle}" بتاريخ ${eventDate} من العميل "${user.name}".`,
    kind: 'booking',
  });
  return { booking: rec };
});

async function decideBooking(
  id: string,
  actor: 'provider' | 'admin' | 'cancel',
  decision: 'approve' | 'reject' | 'cancel',
  note: string
): Promise<BookingRecord> {
  const { db: d } = requireDb();
  const cur = await getBooking(id);
  if (decision === 'approve' && cur.targetType !== 'service') {
    const slots = await slotsOn(cur.eventDate);
    if (slots.some((s) => s.targetType === cur.targetType && s.targetId === cur.targetId && s.bookingId !== cur.id))
      fail('يوجد حجز مؤكد بالفعل في نفس التاريخ.');
  }
  let providerApproved = cur.providerApproved;
  let adminApproved = cur.adminApproved;
  let providerNote = cur.providerNote;
  let adminNote = cur.adminNote;
  let rejected = false;
  const cancelled = actor === 'cancel' || decision === 'cancel';
  if (!cancelled && actor === 'provider') {
    providerNote = note;
    providerApproved = decision === 'approve';
    rejected = decision === 'reject';
  } else if (!cancelled && actor === 'admin') {
    adminNote = note;
    adminApproved = decision === 'approve';
    rejected = decision === 'reject';
  }
  const status = resolveNextBookingStatus({ providerApproved, adminApproved, rejected, cancelled });
  const next: BookingRecord = { ...cur, providerApproved, adminApproved, providerNote, adminNote, status, updatedAt: nowIso() };
  await updateDoc(doc(d, 'bookings', id), clean({ providerApproved, adminApproved, providerNote, adminNote, status, updatedAt: next.updatedAt }));
  await syncSlot(next);
  return next;
}

route('POST', '/api/bookings/([^/]+)/provider-action', async ({ params, body }) => {
  const user = await needUser();
  const cur = await getBooking(params[0]);
  if (cur.providerOwnerId !== user.id && user.role !== 'admin')
    fail('هذا الإجراء مخصص لمقدم الخدمة المعني بهذا الحجز فقط.');
  const decision = body.decision as 'approve' | 'reject';
  if (decision !== 'approve' && decision !== 'reject') fail('القرار غير صالح.');
  const note = str(body.note);
  const u = await decideBooking(params[0], 'provider', decision, note);
  await notify({
    userId: u.clientId,
    titleAr:
      u.status === 'confirmed' ? 'تم تأكيد حجزك نهائيًا' : decision === 'approve' ? 'وافق مقدم الخدمة على حجزك' : 'اعتذر مقدم الخدمة عن الحجز',
    bodyAr:
      u.status === 'confirmed'
        ? `اكتملت موافقة مقدم الخدمة والإدارة على حجز "${u.targetTitle}" بتاريخ ${u.eventDate}.`
        : decision === 'approve'
          ? `وافق مقدم الخدمة على "${u.targetTitle}" (${u.eventDate}) بانتظار اعتماد الإدارة النهائي.`
          : `تم رفض الحجز على "${u.targetTitle}". ${note}`,
    kind: 'booking',
    relatedRoute: 'bookings',
  });
  return { booking: u };
});

route('POST', '/api/bookings/([^/]+)/admin-action', async ({ params, body }) => {
  const admin = await needAdmin();
  const decision = body.decision as 'approve' | 'reject';
  if (decision !== 'approve' && decision !== 'reject') fail('القرار غير صالح.');
  const u = await decideBooking(params[0], 'admin', decision, str(body.note));
  await audit(admin, `قرار إداري (${decision}) على الحجز ${u.targetTitle}`, 'booking', u.id);
  await notify({
    userId: u.clientId,
    titleAr: u.status === 'confirmed' ? 'تم تأكيد الحجز نهائيًا' : decision === 'approve' ? 'وافقت الإدارة مبدئيًا على الحجز' : 'تم رفض الحجز إداريًا',
    bodyAr:
      u.status === 'confirmed'
        ? `حجزك في "${u.targetTitle}" بتاريخ ${u.eventDate} مؤكد الآن بالكامل.`
        : decision === 'approve'
          ? `وافقت الإدارة على حجز "${u.targetTitle}" بانتظار موافقة مقدم الخدمة.`
          : `تم رفض حجز "${u.targetTitle}" من الإدارة.`,
    kind: 'booking',
    relatedRoute: 'bookings',
  });
  await notify({
    userId: u.providerOwnerId,
    titleAr: u.status === 'confirmed' ? 'تأكيد نهائي لحجز وارد' : 'تحديث إداري على حجز',
    bodyAr: `الحجز "${u.targetTitle}" بتاريخ ${u.eventDate}: حالته الآن "${u.status}".`,
    kind: 'booking',
    relatedRoute: 'bookings',
  });
  return { booking: u };
});

route('POST', '/api/bookings/([^/]+)/cancel', async ({ params }) => {
  const user = await needUser();
  const cur = await getBooking(params[0]);
  if (cur.clientId !== user.id && user.role !== 'admin') fail('لا تملك صلاحية إلغاء هذا الحجز.');
  const u = await decideBooking(params[0], 'cancel', 'cancel', 'ألغى العميل الطلب');
  await notify({
    userId: u.providerOwnerId,
    titleAr: 'إلغاء طلب حجز',
    bodyAr: `قام "${u.clientName}" بإلغاء الحجز على "${u.targetTitle}" بتاريخ ${u.eventDate}.`,
    kind: 'booking',
  });
  return { booking: u };
});

// ----- reviews -----

route('GET', '/api/reviews', async ({ query: q }) => {
  const tt = q.get('targetType') as TargetEntityType | null;
  const ti = q.get('targetId');
  if (!tt || !ti) return { reviews: [] };
  return { reviews: await reviewsFor(tt, ti) };
});
route('POST', '/api/reviews', async ({ body: b }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const targetType = b.targetType as TargetEntityType | undefined;
  const targetId = str(b.targetId);
  if (!targetType || !targetId || !str(b.commentAr)) fail('يرجى كتابة التقييم واختيار عدد النجوم.');
  const id = newId('review');
  const rec: ReviewRecord = {
    id,
    authorId: user.id,
    authorName: user.name,
    targetType: targetType!,
    targetId,
    rating: Math.min(5, Math.max(1, Number(b.rating) || 5)),
    commentAr: str(b.commentAr).slice(0, 1000),
    status: 'pending',
    createdAt: nowIso(),
  };
  await setDoc(doc(d, 'reviews', id), rec);
  await notifyAdmins({
    titleAr: 'تقييم جديد بانتظار الاعتماد',
    bodyAr: `أضاف "${user.name}" تقييمًا جديدًا (${rec.rating} نجوم) وهو قيد المراجعة الإدارية.`,
    kind: 'review',
  });
  return { review: rec };
});

// ----- favorites -----

async function favoritesFor(userId: string) {
  return (await readAll<FavoriteRecord>('favorites', ['userId', '==', userId])).sort(byNewest);
}
route('GET', '/api/favorites', async () => ({ favorites: await favoritesFor((await needUser()).id) }));
route('POST', '/api/favorites/toggle', async ({ body }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const targetType = body.targetType as TargetEntityType | undefined;
  const targetId = str(body.targetId);
  if (!targetType || !targetId) fail('بيانات المفضلة غير مكتملة.');
  const id = `${user.id}_${targetType}_${targetId}`;
  const ref = doc(d, 'favorites', id);
  const existing = (await favoritesFor(user.id)).find((f) => f.id === id);
  let added = false;
  if (existing) {
    await deleteDoc(ref);
  } else {
    const rec: FavoriteRecord = { id, userId: user.id, targetType: targetType!, targetId, createdAt: nowIso() };
    await setDoc(ref, rec);
    added = true;
  }
  return { added, favorites: await favoritesFor(user.id) };
});

// ----- notifications -----

async function notificationsFor(user: UserProfile): Promise<NotificationRecord[]> {
  const own = await readAll<NotificationRecord>('notifications', ['userId', '==', user.id]);
  const shared = user.role === 'admin' ? await readAll<NotificationRecord>('notifications', ['userId', '==', 'admin']) : [];
  return [...own, ...shared].sort(byNewest).slice(0, 100);
}
route('GET', '/api/notifications', async () => ({ notifications: await notificationsFor(await needUser()) }));
route('POST', '/api/notifications/read', async ({ body }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const list = await notificationsFor(user);
  const targets = body.id ? list.filter((n) => n.id === body.id) : list.filter((n) => !n.isRead);
  const batch = writeBatch(d);
  targets.forEach((n) => batch.update(doc(d, 'notifications', n.id), { isRead: true }));
  if (targets.length) await batch.commit();
  return { notifications: list.map((n) => (targets.some((t) => t.id === n.id) ? { ...n, isRead: true } : n)) };
});

// ----- invitations -----

const DEFAULT_PRICES = (): Record<InvitationDesignId, number> => {
  const out = {} as Record<InvitationDesignId, number>;
  (Object.keys(INVITATION_DESIGNS) as InvitationDesignId[]).forEach((k) => {
    out[k] = INVITATION_DESIGNS[k].priceEgp;
  });
  return out;
};

async function getPrices(): Promise<Record<InvitationDesignId, number>> {
  const { db: d } = requireDb();
  try {
    const snap = await getDoc(doc(d, 'config', 'invitationPricing'));
    if (snap.exists()) return { ...DEFAULT_PRICES(), ...(snap.data().templatePrices || {}) };
  } catch {
    // fall through
  }
  return DEFAULT_PRICES();
}

async function rsvpsOf(slug: string, withPrivate: boolean): Promise<InvitationRsvpRecord[]> {
  const { db: d } = requireDb();
  const snap = await getDocs(collection(d, 'invitations', slug, 'rsvps'));
  const list = snap.docs.map((x) => x.data() as InvitationRsvpRecord);
  if (withPrivate) {
    try {
      const priv = await getDocs(collection(d, 'invitations', slug, 'rsvp_private'));
      const phones = new Map(priv.docs.map((x) => [x.id, String(x.data().guestPhone || '')]));
      list.forEach((r) => {
        r.guestPhone = phones.get(r.id) || '';
      });
    } catch {
      // ignore
    }
  }
  return list.sort(byNewest);
}

route('GET', '/api/invitation-pricing', async () => ({ templatePrices: await getPrices() }));

route('GET', '/api/invitations', async () => {
  const user = await currentUser();
  if (!user) return { invitations: [] };
  const list =
    user.role === 'admin'
      ? await readAll<ElectronicInvitationRecord>('invitations')
      : await readAll<ElectronicInvitationRecord>('invitations', ['ownerId', '==', user.id]);
  const withStats = await Promise.all(
    list.map(async (inv) => ({ ...inv, stats: summarizeInvitationRsvps(await rsvpsOf(inv.slug, false)) }))
  );
  return { invitations: withStats.sort(byNewest) };
});

route('POST', '/api/invitations', async ({ body: b }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  if (!str(b.groomName) || !str(b.brideName) || !str(b.weddingDate) || !str(b.venueName))
    fail('يرجى إدخال اسم العريس، اسم العروسة، تاريخ الفرح، واسم القاعة.');
  let slug = sanitizeSlug(`${str(b.groomName)}-${str(b.brideName)}`);
  if ((await getDoc(doc(d, 'invitations', slug))).exists()) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const designId = (str(b.designId, 'floral') as InvitationDesignId);
  const prices = await getPrices();
  const rec: ElectronicInvitationRecord = clean({
    id: slug,
    ownerId: user.id,
    slug,
    designId,
    designPriceEgp: prices[designId] ?? 0,
    groomName: str(b.groomName),
    brideName: str(b.brideName),
    weddingDate: str(b.weddingDate),
    weddingTime: str(b.weddingTime, '20:00'),
    venueName: str(b.venueName),
    mapUrl: str(b.mapUrl, 'https://maps.google.com/?q=30.0444,31.2357'),
    invitationText: str(
      b.invitationText,
      'بقلوب يغمرها الفرح، نتشرف بدعوتكم لحضور حفل زفافنا ومشاركتنا أجمل لحظات العمر.'
    ),
    couplePhoto: str(b.couplePhoto, '/src/assets/images/velora_invitation_editorial_1795424758769.jpg'),
    contactPhone: str(b.contactPhone, user.phone || ''),
    createdAt: nowIso(),
  });
  await setDoc(doc(d, 'invitations', slug), rec);
  return { invitation: rec };
});

route('GET', '/api/invitations/([^/]+)', async ({ params }) => {
  const { db: d } = requireDb();
  const slug = decodeURIComponent(params[0]);
  let snap;
  try {
    snap = await getDoc(doc(d, 'invitations', slug));
  } catch {
    return fail('رابط الدعوة غير موجود أو تم حذفه.');
  }
  if (!snap.exists()) return fail('رابط الدعوة غير موجود أو تم حذفه.');
  const invitation = snap.data() as ElectronicInvitationRecord;
  const user = await currentUser();
  const isOwner = Boolean(user && (user.id === invitation.ownerId || user.role === 'admin'));
  const rsvps = await rsvpsOf(slug, isOwner);
  return { invitation, stats: summarizeInvitationRsvps(rsvps), rsvps };
});

route('POST', '/api/invitations/([^/]+)/rsvp', async ({ params, body: b }) => {
  const { db: d } = requireDb();
  const slug = decodeURIComponent(params[0]);
  const exists = await getDoc(doc(d, 'invitations', slug)).catch(() => null);
  if (!exists || !exists.exists()) fail('الدعوة غير موجودة.');
  const response = b.response as 'attending' | 'declined';
  if (!str(b.guestName) || (response !== 'attending' && response !== 'declined'))
    fail('يرجى إدخال اسمك واختيار حالة الحضور.');
  const id = newId('rsvp');
  const pub: InvitationRsvpRecord = {
    id,
    invitationId: slug,
    guestName: str(b.guestName).slice(0, 120),
    guestPhone: '',
    response,
    companionsCount: response === 'attending' ? Math.min(20, Math.max(1, Number(b.companionsCount) || 1)) : 1,
    congratulationMessage: str(b.congratulationMessage).slice(0, 500),
    createdAt: nowIso(),
  };
  const batch = writeBatch(d);
  batch.set(doc(d, 'invitations', slug, 'rsvps', id), pub);
  if (str(b.guestPhone)) {
    batch.set(doc(d, 'invitations', slug, 'rsvp_private', id), { guestPhone: str(b.guestPhone).slice(0, 30) });
  }
  await batch.commit();
  const stats = summarizeInvitationRsvps(await rsvpsOf(slug, false));
  return { rsvp: pub, stats };
});

route('DELETE', '/api/invitations/([^/]+)', async ({ params }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const slug = decodeURIComponent(params[0]);
  const snap = await getDoc(doc(d, 'invitations', slug));
  if (!snap.exists()) fail('الدعوة غير موجودة.');
  if ((snap.data() as ElectronicInvitationRecord).ownerId !== user.id && user.role !== 'admin')
    fail('لا تملك صلاحية حذف هذه الدعوة.');
  await deleteInvitationDeep(slug);
  return { deleted: true };
});

async function deleteInvitationDeep(slug: string) {
  const { db: d } = requireDb();
  for (const sub of ['rsvps', 'rsvp_private']) {
    const snap = await getDocs(collection(d, 'invitations', slug, sub));
    await Promise.all(snap.docs.map((x) => deleteDoc(x.ref)));
  }
  await deleteDoc(doc(d, 'invitations', slug));
}

// ----- couple workspace -----

route('GET', '/api/workspace', async () => {
  const { db: d } = requireDb();
  const user = await needUser();
  const snap = await getDoc(doc(d, 'workspaces', user.id));
  const base = createDefaultCoupleWorkspace(user.id, user.name);
  return { workspace: snap.exists() ? { ...base, ...(snap.data() as Partial<CoupleWorkspaceRecord>) } : base };
});
route('PUT', '/api/workspace', async ({ body }) => {
  const { db: d } = requireDb();
  const user = await needUser();
  const snap = await getDoc(doc(d, 'workspaces', user.id));
  const base = createDefaultCoupleWorkspace(user.id, user.name);
  const prev = snap.exists() ? (snap.data() as Partial<CoupleWorkspaceRecord>) : {};
  const next = clean({ ...base, ...prev, ...body, userId: user.id, updatedAt: nowIso() }) as CoupleWorkspaceRecord;
  if (JSON.stringify(next).length > 600_000) fail('بيانات مساحة الفرح كبيرة جدًا.');
  await setDoc(doc(d, 'workspaces', user.id), next);
  return { workspace: next };
});

// ----- find your wedding (runs in the browser) -----

route('POST', '/api/find-wedding', async ({ body }) => {
  const governorate = str(body.governorate, 'القاهرة').slice(0, 40);
  const weddingDate = str(body.weddingDate).slice(0, 10);
  const budgetEgp = Math.min(20000000, Math.max(10000, Number(body.budgetEgp) || 150000));
  const guestsCount = Math.min(3000, Math.max(20, Number(body.guestsCount) || 200));
  const valid = ['royal_palace', 'nile_garden', 'modern_chic', 'intimate_boutique', 'classic_heritage'];
  const dreamStyle = (valid.includes(String(body.dreamStyle)) ? body.dreamStyle : 'royal_palace') as never;
  const [venues, photographers, services] = await Promise.all([
    readAll<VenueRecord>('venues', ['status', '==', 'approved']),
    readAll<PhotographerRecord>('photographers', ['status', '==', 'approved']),
    readAll<ServiceRecord>('services', ['status', '==', 'approved']),
  ]);
  const checked = /^\d{4}-\d{2}-\d{2}$/.test(weddingDate);
  const slots = checked ? await slotsOn(weddingDate) : [];
  const reservedVenueIds = slots.filter((s) => s.targetType === 'venue').map((s) => s.targetId);
  const reservedPhotographerIds = slots.filter((s) => s.targetType === 'photographer').map((s) => s.targetId);
  const packages = buildWeddingMatchPackages(
    { governorate, weddingDate, budgetEgp, guestsCount, dreamStyle },
    { venues, photographers, services, reservedVenueIds, reservedPhotographerIds }
  );
  return { packages, availabilityChecked: checked, reservedCount: reservedVenueIds.length + reservedPhotographerIds.length };
});

// ----- subscriptions / payments / reminders (not enabled yet) -----

route('GET', '/api/subscription-plans', async () => ({ plans: [] }));
route('GET', '/api/subscriptions/mine', async () => ({ subscriptions: [] }));
route('POST', '/api/subscriptions/request', unavailable('الاشتراكات'));
route('GET', '/api/admin/subscriptions', async () => ({ plans: [], requests: [] }));
route('PUT', '/api/admin/subscription-plans/([^/]+)', unavailable('إدارة الباقات'));
route('POST', '/api/admin/subscriptions/([^/]+)/status', unavailable('إدارة الاشتراكات'));
route('GET', '/api/admin/reminders', unavailable('تذكيرات واتساب'));
route('POST', '/api/admin/reminders/run', unavailable('تذكيرات واتساب'));
route('POST', '/api/admin/reminders/test', unavailable('تذكيرات واتساب'));

// ----- admin -----

route('GET', '/api/admin/overview', async () => {
  await needAdmin();
  const [users, venues, photographers, services, requests, bookings, reviews, invitations, auditLogs] =
    await Promise.all([
      readAll<UserProfile>('users'),
      readAll<VenueRecord>('venues'),
      readAll<PhotographerRecord>('photographers'),
      readAll<ServiceRecord>('services'),
      readAll<CustomerRequestRecord>('requests'),
      readAll<BookingRecord>('bookings'),
      readAll<ReviewRecord>('reviews'),
      readAll<ElectronicInvitationRecord>('invitations'),
      readAll<AdminAuditLogRecord>('auditLogs'),
    ]);
  return {
    users: users.sort(byNewest),
    venues: venues.sort(byNewest),
    photographers: photographers.sort(byNewest),
    services: services.sort(byNewest),
    requests: requests.sort(byNewest),
    bookings: bookings.sort(byNewest),
    reviews: reviews.sort(byNewest),
    invitations: invitations.sort(byNewest),
    auditLogs: auditLogs.sort(byNewest).slice(0, 200),
  };
});

route('PUT', '/api/admin/invitation-pricing', async ({ body }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  const designId = body.designId as InvitationDesignId;
  if (!designId || !(designId in INVITATION_DESIGNS)) fail('معرف تصميم البطاقة غير صالح.');
  const prices = await getPrices();
  prices[designId] = Math.max(0, Number(body.priceEgp) || 0);
  await setDoc(doc(d, 'config', 'invitationPricing'), { templatePrices: prices });
  await audit(admin, `تحديث سعر كارت الدعوة (${designId}) إلى ${prices[designId]} ج.م`, 'invitation_template', designId);
  return { templatePrices: prices };
});

const LISTING: Record<string, { col: string; label: string; titleKey: string; noun: string }> = {
  venues: { col: 'venues', label: 'القاعة', titleKey: 'titleAr', noun: 'venue' },
  photographers: { col: 'photographers', label: 'المصور', titleKey: 'displayName', noun: 'photographer' },
  services: { col: 'services', label: 'الخدمة', titleKey: 'titleAr', noun: 'service' },
};

route('POST', '/api/admin/(venues|photographers|services)/([^/]+)/status', async ({ params, body }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  const meta = LISTING[params[0]];
  const status = body.status as ApprovalStatus | undefined;
  if (!status) fail('الحالة مطلوبة.');
  const ref = doc(d, meta.col, params[1]);
  const snap = await getDoc(ref);
  if (!snap.exists()) fail(`${meta.label} غير موجودة.`);
  const rec = snap.data() as Record<string, unknown> & { ownerId: string };
  const patch: Record<string, unknown> = { status };
  if (typeof body.featured === 'boolean') patch.featured = body.featured;
  await updateDoc(ref, patch);
  const title = String(rec[meta.titleKey] || '');
  await audit(admin, `تغيير حالة ${meta.label} "${title}" إلى ${status}`, meta.noun, params[1]);
  await notify({
    userId: rec.ownerId,
    titleAr: status === 'approved' ? `تمت الموافقة على ${meta.label === 'القاعة' ? 'قاعتك' : 'ملفك'}` : `تحديث حالة ${meta.label}`,
    bodyAr:
      status === 'approved'
        ? `أصبحت "${title}" منشورة الآن لجميع عملاء VÉLORA.`
        : `تم تحديث حالة "${title}" إلى ${status}.`,
    kind: 'approval',
  });
  return { [meta.noun]: { ...rec, ...patch } };
});

route('DELETE', '/api/admin/(venues|photographers|services)/([^/]+)', async ({ params }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  const meta = LISTING[params[0]];
  await deleteDoc(doc(d, meta.col, params[1]));
  await audit(admin, `حذف ${meta.label} من المنصة`, meta.noun, params[1]);
  return { deleted: true };
});

async function refreshRating(targetType: TargetEntityType, targetId: string) {
  const { db: d } = requireDb();
  const col = targetType === 'venue' ? 'venues' : targetType === 'photographer' ? 'photographers' : 'services';
  const approved = (
    await readAll<ReviewRecord>('reviews', ['targetId', '==', targetId], ['status', '==', 'approved'])
  ).filter((r) => r.targetType === targetType);
  const avg = approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;
  try {
    await updateDoc(doc(d, col, targetId), { avgRating: Math.round(avg * 10) / 10, reviewsCount: approved.length });
  } catch {
    // target may be gone
  }
}

route('POST', '/api/admin/reviews/([^/]+)/status', async ({ params, body }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  const status = body.status as ApprovalStatus | undefined;
  if (!status) fail('الحالة مطلوبة.');
  const ref = doc(d, 'reviews', params[0]);
  const snap = await getDoc(ref);
  if (!snap.exists()) fail('التقييم غير موجود.');
  const rec = snap.data() as ReviewRecord;
  await updateDoc(ref, { status });
  await refreshRating(rec.targetType, rec.targetId);
  await audit(admin, `اعتماد/تحديث تقييم إلى ${status}`, 'review', rec.id);
  return { review: { ...rec, status } };
});
route('DELETE', '/api/admin/reviews/([^/]+)', async ({ params }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  const ref = doc(d, 'reviews', params[0]);
  const snap = await getDoc(ref);
  await deleteDoc(ref);
  if (snap.exists()) {
    const rec = snap.data() as ReviewRecord;
    await refreshRating(rec.targetType, rec.targetId);
  }
  await audit(admin, 'حذف تقييم', 'review', params[0]);
  return { deleted: true };
});

route('POST', '/api/admin/requests/([^/]+)/status', async ({ params, body }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  const status = body.status as CustomerRequestRecord['status'] | undefined;
  if (!status) fail('الحالة مطلوبة.');
  const ref = doc(d, 'requests', params[0]);
  const snap = await getDoc(ref);
  if (!snap.exists()) fail('الطلب غير موجود.');
  await updateDoc(ref, { status });
  const rec = snap.data() as CustomerRequestRecord;
  await audit(admin, `تحديث طلب العميل "${rec.titleAr}" إلى ${status}`, 'request', rec.id);
  return { request: { ...rec, status } };
});
route('DELETE', '/api/admin/requests/([^/]+)', async ({ params }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  await deleteDoc(doc(d, 'requests', params[0]));
  await audit(admin, 'حذف طلب عميل', 'request', params[0]);
  return { deleted: true };
});

route('POST', '/api/admin/users/([^/]+)', async ({ params, body }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  const ref = doc(d, 'users', params[0]);
  const snap = await getDoc(ref);
  if (!snap.exists()) fail('المستخدم غير موجود.');
  const target = snap.data() as UserProfile;
  const role = (body.role as UserRole) || target.role;
  const status = (body.status as UserProfile['status']) || target.status;
  await updateDoc(ref, { role, status });
  await audit(admin, `تعديل صلاحية/حالة المستخدم ${target.name}`, 'user', target.id);
  return { user: { ...target, role, status } };
});

route('DELETE', '/api/admin/invitations/([^/]+)', async ({ params }) => {
  const admin = await needAdmin();
  await deleteInvitationDeep(decodeURIComponent(params[0]));
  await audit(admin, 'حذف دعوة إلكترونية', 'invitation', params[0]);
  return { deleted: true };
});

route('POST', '/api/admin/notifications/broadcast', async ({ body }) => {
  const { db: d } = requireDb();
  const admin = await needAdmin();
  const titleAr = str(body.titleAr);
  const bodyAr = str(body.bodyAr);
  if (!titleAr || !bodyAr) fail('يرجى كتابة عنوان ونص الإشعار.');
  const users = await readAll<UserProfile>('users');
  for (let i = 0; i < users.length; i += 400) {
    const batch = writeBatch(d);
    users.slice(i, i + 400).forEach((u) => {
      const id = newId('notif');
      batch.set(
        doc(d, 'notifications', id),
        clean({ id, userId: u.id, titleAr, bodyAr, kind: 'system', isRead: false, createdAt: nowIso() })
      );
    });
    await batch.commit();
  }
  await audit(admin, `إرسال إشعار عام: ${titleAr}`, 'notification', 'broadcast');
  return { sentTo: users.length };
});

// ---------- entry point ----------

export async function clientApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(path, window.location.origin);
  let body: Body = {};
  if (typeof options.body === 'string' && options.body) {
    try {
      body = JSON.parse(options.body) as Body;
    } catch {
      body = {};
    }
  }
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = re.exec(url.pathname);
    if (!match) continue;
    try {
      return (await handler({ params: match.slice(1), query: url.searchParams, body, method })) as T;
    } catch (e) {
      const code =
        typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : '';
      if (code.includes('permission-denied')) throw new Error('ليست لديك صلاحية لتنفيذ هذا الإجراء.');
      throw e;
    }
  }
  throw new Error('هذه الخدمة غير متاحة حاليًا.');
}
