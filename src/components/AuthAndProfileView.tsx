import React, { useEffect, useState } from 'react';
import {
  Heart,
  KeyRound,
  LogOut,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
} from 'lucide-react';
import type {
  FavoriteRecord,
  PhotographerRecord,
  ServiceCategoryKey,
  ServiceRecord,
  UserProfile,
  UserRole,
  VenueRecord,
} from '../types/velora';
import { apiFetch, setClientAuthToken, uploadImageFile } from '../utils/api';
import {
  isFirebaseReady,
  sendFirebaseResetEmail,
  signInFirebaseWithEmail,
  signInWithGooglePopup,
} from '../utils/firebase';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { SERVICE_CATEGORIES } from '../utils/veloraLogic';
import { motion } from 'motion/react';
import { CinematicTabPanel } from './CinematicMotion';

interface AuthAndProfileViewProps {
  mode: 'auth' | 'profile';
  user: UserProfile | null;
  initialRegisterRole?: UserRole | null;
  favorites: FavoriteRecord[];
  venues: VenueRecord[];
  photographers: PhotographerRecord[];
  services: ServiceRecord[];
  onAuthSuccess: (user: UserProfile, token: string) => void;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onProviderSubmissionDone: () => void;
  onOpenVenue: (id: string) => void;
  onOpenPhotographer: (id: string) => void;
  onReplayCinematic?: () => void;
}

export const AuthAndProfileView: React.FC<AuthAndProfileViewProps> = ({
  mode,
  user,
  initialRegisterRole,
  favorites,
  venues,
  photographers,
  services,
  onAuthSuccess,
  onUserUpdated,
  onLogout,
  onOpenAdmin,
  onProviderSubmissionDone,
  onOpenVenue,
  onOpenPhotographer,
  onReplayCinematic,
}) => {
  // Auth Tabs
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'reset'>(
    initialRegisterRole && initialRegisterRole !== 'client' ? 'register' : 'login'
  );
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(initialRegisterRole || 'client');
  const [city, setCity] = useState('القاهرة');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoResetHint, setDemoResetHint] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch<{ hasAdmin: boolean }>('/api/auth/admin-status')
      .then((res) => setHasAdmin(res.hasAdmin))
      .catch(() => setHasAdmin(true));
  }, []);

  useEffect(() => {
    if (initialRegisterRole && initialRegisterRole !== 'client') {
      setRole(initialRegisterRole);
      setAuthTab('register');
      setAuthErr('');
    }
  }, [initialRegisterRole]);

  // Profile Edit State
  const [editName, setEditName] = useState(user?.name || '');
  const [editCity, setEditCity] = useState(user?.city || 'القاهرة');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatarUrl || '');
  const [profileMsg, setProfileMsg] = useState('');

  // In-profile password change
  const [currentPwd, setCurrentPwd] = useState('');
  const [nextPwd, setNextPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  // Provider Submission Form (pending until admin approval)
  const [listingTitle, setListingTitle] = useState('');
  const [listingCity, setListingCity] = useState('القاهرة');
  const [listingArea, setListingArea] = useState('التجمع الخامس');
  const [listingPrice, setListingPrice] = useState('35000');
  const [listingCategory, setListingCategory] = useState<ServiceCategoryKey>('kosha');
  const [listingDesc, setListingDesc] = useState('');
  const [listingPhoto, setListingPhoto] = useState(
    '/src/assets/images/velora_venue_palace_1795424759214.jpg'
  );
  const [listingMsg, setListingMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthErr('');
    try {
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ contact, password }),
      });
      setClientAuthToken(res.token);
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      if (contact.includes('@') && isFirebaseReady()) {
        const fbCred = await signInFirebaseWithEmail(contact, password);
        if (fbCred?.idToken) {
          try {
            const fbRes = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/firebase', {
              method: 'POST',
              body: JSON.stringify({ idToken: fbCred.idToken, role, city }),
            });
            setClientAuthToken(fbRes.token);
            onAuthSuccess(fbRes.user, fbRes.token);
            return;
          } catch {
            // Fall through to original error
          }
        }
      }
      setAuthErr(err instanceof Error ? err.message : 'فشل تسجيل الدخول.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthErr('');
    try {
      const googleUser = await signInWithGooglePopup();
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/firebase', {
        method: 'POST',
        body: JSON.stringify({
          idToken: googleUser.idToken,
          role: authTab === 'register' ? role : 'client',
          city,
        }),
      });
      setClientAuthToken(res.token);
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر تسجيل الدخول عبر Google.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthErr('تم إغلاق نافذة تسجيل الدخول بـ Google قبل إتمام العملية.');
      } else {
        setAuthErr(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthErr('');
    try {
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, contact, password, role, city }),
      });
      setClientAuthToken(res.token);
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'فشل إنشاء الحساب.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleForgotRequest = async () => {
    setAuthBusy(true);
    setAuthErr('');
    setDemoResetHint('');
    try {
      let emailSent = false;
      if (contact.includes('@') && isFirebaseReady()) {
        const fbMail = await sendFirebaseResetEmail(contact);
        emailSent = fbMail.sent;
      }
      const res = await apiFetch<{ message: string; demoCode?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ contact }) }
      );
      if (emailSent) {
        if (res.demoCode) setResetCode(res.demoCode);
        setDemoResetHint(
          `تم إرسال رابط استعادة كلمة المرور إلى بريدك على Gmail (${contact.trim()}). تحقق من البريد الوارد أو الرسائل غير المرغوب فيها (Spam).`
        );
      } else if (res.demoCode) {
        setResetCode(res.demoCode);
        setDemoResetHint(
          `تم إنشاء رمز التحقق وإدخاله تلقائيًا (${res.demoCode}). اكتب كلمة المرور الجديدة واضغط «تعيين كلمة المرور».`
        );
      } else {
        setDemoResetHint(res.message);
      }
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'تعذر إصدار الرمز.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthErr('');
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ contact, code: resetCode, newPassword }),
      });
      setAuthTab('login');
      setDemoResetHint('تم تحديث كلمة المرور بنجاح! يمكنك الدخول الآن.');
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'تعذر تعيين كلمة المرور.');
    } finally {
      setAuthBusy(false);
    }
  };

  if (!user || mode === 'auth') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 pb-24 space-y-5">
        {/* Cinematic Pre-Login Brand Reveal Banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 text-center text-white shadow-xl shadow-[#5B3278]/20 border border-[#C5A25D]/40"
          style={{
            background: 'radial-gradient(circle at 50% 35%, #6A3B8E 0%, #482461 62%, #29123B 100%)',
          }}
        >
          <div
            aria-hidden="true"
            className="animate-envelope-glow pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-2xl opacity-65"
            style={{
              background: 'radial-gradient(circle, rgba(226,198,139,0.4) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10 flex flex-col items-center space-y-2.5">
            <span className="text-[10px] font-semibold tracking-[0.26em] uppercase text-[#EAD4A0]">
              THE LUXURY WEDDING PLATFORM
            </span>
            <p className="animate-cinematic-word font-editorial text-4xl sm:text-5xl font-bold tracking-[0.22em] text-white">
              VÉLORA
            </p>
            <div className="animate-line-expand w-36 h-px bg-gradient-to-r from-transparent via-[#E2C68B] to-transparent" />
            <p className="font-display text-sm sm:text-base font-bold text-[#F5E6C8]">
              كل تفاصيل فرحتك تبدأ من هنا
            </p>
            {onReplayCinematic && (
              <button
                type="button"
                onClick={onReplayCinematic}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-semibold text-white transition-colors"
              >
                <Sparkles className="w-3 h-3 text-[#EAD4A0]" />
                <span>عرض الافتتاحية السينمائية</span>
              </button>
            )}
          </div>
        </div>

        <div className="velora-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]">
              {authTab === 'login'
                ? 'تسجيل الدخول إلى VÉLORA'
                : authTab === 'register'
                  ? 'إنشاء حساب جديد'
                  : 'استعادة كلمة المرور'}
            </h1>
            <p className="text-xs text-[#5E4D6B]">
              سجّل بالبريد الإلكتروني أو رقم الهاتف لحجز القاعات وإدارة الدعوات
            </p>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F3ECF9] border border-[#E8DCF3]">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setAuthErr('');
              }}
              className={`relative py-2.5 rounded-lg text-xs font-bold transition-colors ${
                authTab === 'login' ? 'text-white' : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              {authTab === 'login' && (
                <motion.span
                  layoutId="auth-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">تسجيل الدخول</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setAuthErr('');
              }}
              className={`relative py-2.5 rounded-lg text-xs font-bold transition-colors ${
                authTab === 'register' ? 'text-white' : 'text-[#5E4D6B] hover:text-[#24172E]'
              }`}
            >
              {authTab === 'register' && (
                <motion.span
                  layoutId="auth-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#5B3278] shadow-xs"
                />
              )}
              <span className="relative z-10">حساب جديد</span>
            </button>
          </div>

          {authErr && (
            <div className="p-3 rounded-xl bg-[#FDF1F2] border border-[#EAC1C7] text-xs font-semibold text-[#9A2D3C]">
              {authErr}
            </div>
          )}

          {demoResetHint && (
            <div className="p-3 rounded-xl bg-[#F3ECF9] border border-[#C9B0E3] text-xs font-semibold text-[#5B3278]">
              {demoResetHint}
            </div>
          )}

          <CinematicTabPanel tabKey={authTab} className="space-y-4">
          {authTab !== 'reset' && isFirebaseReady() && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authBusy}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-[#FAF7FD] border border-[#DFCFF0] text-[#24172E] text-sm font-bold flex items-center justify-center gap-3 shadow-sm transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>
                  {authTab === 'login'
                    ? 'تسجيل الدخول بحساب Google (Gmail)'
                    : 'إنشاء حساب سريع عبر Google (Gmail)'}
                </span>
              </button>
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#E8DCF3]" />
                <span className="shrink-0 px-3 text-[11px] font-semibold text-[#7C678D]">
                  أو بالبريد الإلكتروني / الهاتف
                </span>
                <div className="flex-grow border-t border-[#E8DCF3]" />
              </div>
            </div>
          )}

          {authTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  البريد الإلكتروني أو رقم الهاتف
                </label>
                <input
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="name@example.com أو 010..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  كلمة المرور
                </label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setAuthTab('reset')}
                  className="text-xs font-semibold text-[#5B3278] hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-sm font-bold"
              >
                {authBusy ? 'جاري الدخول...' : 'دخول إلى المنصة'}
              </button>
            </form>
          )}

          {authTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  الاسم الكامل أو اسم النشاط
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد وسارة / قاعة اللؤلؤة"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  نوع الحساب
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                >
                  <option value="client">عميل / عروسين</option>
                  <option value="venue_owner">صاحب قاعة أفراح</option>
                  <option value="photographer">مصور أفراح</option>
                  <option value="service_provider">مقدم خدمات وتجهيزات</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  البريد الإلكتروني أو رقم الهاتف
                </label>
                <input
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="any@email.com أو 01012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المدينة</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                    كلمة المرور
                  </label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3.5 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-sm font-bold"
              >
                {authBusy ? 'جاري التسجيل...' : 'إنشاء الحساب'}
              </button>
            </form>
          )}

          {authTab === 'reset' && (
            <form onSubmit={handleResetConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  البريد الإلكتروني أو رقم الهاتف المسجل
                </label>
                <div className="flex gap-2">
                  <input
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleForgotRequest}
                    className="px-3.5 py-2 rounded-xl bg-[#F3ECF9] text-[#5B3278] text-xs font-bold shrink-0"
                  >
                    إرسال الرمز
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">رمز التحقق</label>
                <input
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="6 أرقام"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className="px-4 py-3 rounded-xl border border-[#E8DCF3] text-xs font-semibold"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#5B3278] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>تعيين كلمة المرور</span>
                </button>
              </div>
            </form>
          )}
          </CinematicTabPanel>
        </div>

        {hasAdmin === false && (
          <div className="mt-4 rounded-2xl border border-[#DFCFF0] bg-[#F8F3FC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[#24172E]">تفعيل إدارة منصة VÉLORA لأول مرة</p>
              <p className="text-[11px] text-[#5E4D6B]">
                لا يوجد حساب مشرف رئيسي بعد — فعّل لوحة تحكم الإدارة الآن.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>تفعيل لوحة الإدارة</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Logged-in Profile Dashboard
  const isProvider = ['venue_owner', 'photographer', 'service_provider', 'admin'].includes(user.role);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          city: editCity,
          bio: editBio,
          phone: editPhone,
          email: editEmail,
          avatarUrl: editAvatar,
        }),
      });
      onUserUpdated(res.user);
      setProfileMsg('تم حفظ تحديثات الملف الشخصي بنجاح.');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'تعذر حفظ التعديلات.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: nextPwd }),
      });
      setCurrentPwd('');
      setNextPwd('');
      setPwdMsg(res.message || 'تم تحديث كلمة المرور بنجاح.');
    } catch (err) {
      setPwdMsg(err instanceof Error ? err.message : 'تعذر تحديث كلمة المرور.');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImageFile(file);
      setEditAvatar(url);
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'فشل رفع الصورة.');
    }
  };

  const handleProviderListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setListingMsg('');
    try {
      if (user.role === 'venue_owner') {
        await apiFetch('/api/venues', {
          method: 'POST',
          body: JSON.stringify({
            titleAr: listingTitle,
            city: listingCity,
            area: listingArea,
            pricePerEvent: Number(listingPrice) || 45000,
            descriptionAr: listingDesc,
            coverImage: listingPhoto,
            galleryImages: [listingPhoto],
          }),
        });
      } else if (user.role === 'photographer') {
        await apiFetch('/api/photographers', {
          method: 'POST',
          body: JSON.stringify({
            displayName: listingTitle,
            city: listingCity,
            studioLocation: listingArea,
            startingPrice: Number(listingPrice) || 14000,
            bioAr: listingDesc,
            coverImage: listingPhoto,
            avatarUrl: listingPhoto,
            albumPhotos: [listingPhoto],
          }),
        });
      } else {
        await apiFetch('/api/services', {
          method: 'POST',
          body: JSON.stringify({
            titleAr: listingTitle,
            category: listingCategory,
            city: listingCity,
            area: listingArea,
            startingPrice: Number(listingPrice) || 9000,
            descriptionAr: listingDesc,
            coverImage: listingPhoto,
          }),
        });
      }
      setListingTitle('');
      setListingDesc('');
      setListingMsg(
        'تم استلام عرضك! حالة العرض الآن «قيد المراجعة» ولن يظهر للعامة إلا بعد موافقة الإدارة.'
      );
      onProviderSubmissionDone();
    } catch (err) {
      setListingMsg(err instanceof Error ? err.message : 'تعذر إرسال العرض.');
    }
  };

  const favVenues = venues.filter((v) =>
    favorites.some((f) => f.targetType === 'venue' && f.targetId === v.id)
  );
  const favPhotographers = photographers.filter((p) =>
    favorites.some((f) => f.targetType === 'photographer' && f.targetId === p.id)
  );
  const favServices = services.filter((s) =>
    favorites.some((f) => f.targetType === 'service' && f.targetId === s.id)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      {/* Top Profile Banner */}
      <div className="velora-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={resolveMediaUrl(editAvatar || user.avatarUrl)}
            alt={user.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E8DCF3]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-[#24172E]">{user.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#F3ECF9] text-[#5B3278] text-[11px] font-bold">
                {user.role === 'admin'
                  ? 'إدارة المنصة'
                  : user.role === 'venue_owner'
                    ? 'صاحب قاعة'
                    : user.role === 'photographer'
                      ? 'مصور'
                      : user.role === 'service_provider'
                        ? 'مقدم خدمات'
                        : 'عميل'}
              </span>
            </div>
            <p className="text-xs text-[#6B5A78] mt-1">
              {user.email || user.phone} · {user.city}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(user.role === 'admin' || hasAdmin === false) && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{user.role === 'admin' ? 'لوحة تحكم الإدارة' : 'تفعيل لوحة تحكم الإدارة'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E8DCF3] text-xs font-bold text-[#9A2D3C] hover:bg-[#FDF1F2]"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Edit Personal Info */}
        <form onSubmit={handleSaveProfile} className="lg:col-span-6 velora-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#24172E] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#5B3278]" />
              <span>تعديل البيانات الشخصية</span>
            </h2>
            <label className="inline-flex items-center gap-1 text-xs font-bold text-[#5B3278] cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>تغيير الصورة</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الاسم</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المدينة</label>
              <input
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">رقم الهاتف</label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">البريد الإلكتروني</label>
              <input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">نبذة شخصية</label>
              <textarea
                rows={2}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
              />
            </div>
          </div>
          {profileMsg && <p className="text-xs font-semibold text-[#5B3278]">{profileMsg}</p>}
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
          >
            حفظ التعديلات
          </button>

          <div className="pt-4 mt-4 border-t border-[#F0E7F8] space-y-3">
            <h3 className="text-sm font-bold text-[#24172E] flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#5B3278]" />
              <span>تغيير كلمة المرور</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                  كلمة المرور الجديدة (6 أحرف+)
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={nextPwd}
                  onChange={(e) => setNextPwd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                />
              </div>
            </div>
            {pwdMsg && <p className="text-xs font-semibold text-[#5B3278]">{pwdMsg}</p>}
            <button
              type="button"
              onClick={handleChangePassword}
              className="px-4 py-2 rounded-xl border border-[#5B3278] text-[#5B3278] text-xs font-bold hover:bg-[#FAF7FD]"
            >
              تحديث كلمة المرور
            </button>
          </div>
        </form>

        {/* Provider Submission OR Favorites */}
        <div className="lg:col-span-6 space-y-6">
          {isProvider && user.role !== 'admin' && (
            <form
              onSubmit={handleProviderListingSubmit}
              className="velora-card rounded-3xl p-6 space-y-4 border-2 border-[#DFCEF0]"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#24172E] flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#5B3278]" />
                  <span>
                    {user.role === 'venue_owner'
                      ? 'إضافة قاعة جديدة'
                      : user.role === 'photographer'
                        ? 'إضافة ملف مصور وألبوم'
                        : 'إضافة خدمة زفاف جديدة'}
                  </span>
                </h2>
                <span className="text-[11px] font-bold text-[#5B3278] bg-[#F3ECF9] px-2.5 py-1 rounded-full">
                  يخضع لموافقة الإدارة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">
                    {user.role === 'photographer' ? 'اسم المصور / الاستوديو' : 'العنوان'}
                  </label>
                  <input
                    required
                    value={listingTitle}
                    onChange={(e) => setListingTitle(e.target.value)}
                    placeholder="اكتب اسم القاعة أو الخدمة أو المصور..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                {user.role === 'service_provider' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الفئة</label>
                    <select
                      value={listingCategory}
                      onChange={(e) => setListingCategory(e.target.value as ServiceCategoryKey)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                    >
                      {SERVICE_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.labelAr}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المدينة</label>
                  <input
                    required
                    value={listingCity}
                    onChange={(e) => setListingCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">السعر (ج.م)</label>
                  <input
                    type="number"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">المنطقة</label>
                  <input
                    value={listingArea}
                    onChange={(e) => setListingArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5E4D6B] mb-1">الوصف والتفاصيل</label>
                  <textarea
                    required
                    rows={2}
                    value={listingDesc}
                    onChange={(e) => setListingDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCF3] bg-[#FAF7FD] text-sm"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3278] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة الغلاف</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (ev) => {
                        const f = ev.target.files?.[0];
                        if (!f) return;
                        const url = await uploadImageFile(f);
                        setListingPhoto(url);
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
                  >
                    إرسال للاعتماد الإداري
                  </button>
                </div>
              </div>
              {listingMsg && (
                <div className="p-3 rounded-xl bg-[#F3ECF9] text-xs font-semibold text-[#5B3278]">
                  {listingMsg}
                </div>
              )}
            </form>
          )}

          {/* Saved Favorites */}
          <div className="velora-card rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-[#24172E] flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#5B3278]" />
              <span>المفضلة المحفوظة ({favorites.length})</span>
            </h2>
            {favorites.length === 0 ? (
              <p className="text-xs text-[#6B5A78]">
                لم تحفظ أي قاعات أو مصورين في المفضلة بعد.
              </p>
            ) : (
              <div className="space-y-2">
                {favVenues.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onOpenVenue(v.id)}
                    className="w-full text-right p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] hover:border-[#5B3278] flex items-center justify-between text-xs font-bold"
                  >
                    <span>قاعة: {v.titleAr}</span>
                    <span className="text-[#5B3278]">عرض</span>
                  </button>
                ))}
                {favPhotographers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onOpenPhotographer(p.id)}
                    className="w-full text-right p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] hover:border-[#5B3278] flex items-center justify-between text-xs font-bold"
                  >
                    <span>مصور: {p.displayName}</span>
                    <span className="text-[#5B3278]">عرض</span>
                  </button>
                ))}
                {favServices.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-[#FAF7FD] border border-[#E8DCF3] text-xs font-bold"
                  >
                    خدمة: {s.titleAr}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
