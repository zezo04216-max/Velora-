import React from 'react';
import {
  Bell,
  Building2,
  CalendarCheck2,
  Camera,
  Home,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { UserProfile } from '../types/velora';
import { resolveMediaUrl } from '../utils/veloraAssets';
import { VeloraBrandMark } from './VeloraBrandMark';

export type VeloraRoute =
  | 'home'
  | 'find_wedding'
  | 'workspace'
  | 'packages'
  | 'venues'
  | 'venue_detail'
  | 'photographers'
  | 'photographer_detail'
  | 'services'
  | 'invitations'
  | 'bookings'
  | 'profile'
  | 'auth'
  | 'admin'
  | 'not_found';

interface VeloraHeaderProps {
  route: VeloraRoute;
  onNavigate: (route: VeloraRoute) => void;
  user: UserProfile | null;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
}

const NAV_ITEMS: Array<{
  id: VeloraRoute;
  label: string;
  mobileShow?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'home', label: 'الرئيسية', mobileShow: true, icon: Home },
  { id: 'venues', label: 'القاعات', mobileShow: true, icon: Building2 },
  { id: 'photographers', label: 'المصورين', mobileShow: true, icon: Camera },
  { id: 'services', label: 'الخدمات', mobileShow: true, icon: Sparkles },
  { id: 'invitations', label: 'الدعوات', mobileShow: false, icon: Mail },
  { id: 'bookings', label: 'حجوزاتي', mobileShow: true, icon: CalendarCheck2 },
];

export const VeloraHeader: React.FC<VeloraHeaderProps> = ({
  route,
  onNavigate,
  user,
  unreadNotificationsCount,
  onOpenNotifications,
}) => {
  const isActive = (id: VeloraRoute) => {
    if (id === 'venues' && route === 'venue_detail') return true;
    if (id === 'photographers' && route === 'photographer_detail') return true;
    return route === id;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full velora-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('home')}
            className="shrink-0 focus:outline-none"
            aria-label="العودة إلى الرئيسية VÉLORA"
          >
            <VeloraBrandMark size="sm" />
          </motion.button>

          {/* Desktop Navigation — Sleek single-line links with sliding spring indicator */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="التنقل الرئيسي">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative px-2.5 xl:px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active ? 'text-[#5B3278] font-semibold' : 'text-[#5E4D6B] hover:text-[#24172E]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="velora-desktop-nav-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-[#F3ECF9] border border-[#E2D2F2] -z-10"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions (RTL left) */}
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onOpenNotifications}
                className="relative h-10 w-10 rounded-lg border border-[#E8DCF3] bg-white text-[#5B3278] hover:bg-[#F3ECF9] flex items-center justify-center transition-colors"
                aria-label="الإشعارات"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#5B3278] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                    {unreadNotificationsCount}
                  </span>
                )}
              </motion.button>
            )}

            {user?.role === 'admin' && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate('admin')}
                className={`hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                  route === 'admin'
                    ? 'bg-[#5B3278] text-white border-[#5B3278]'
                    : 'bg-[#F3ECF9] text-[#5B3278] border-[#DFCEF0] hover:bg-[#EAE0F6]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>الإدارة</span>
              </motion.button>
            )}

            {user ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate('profile')}
                className={`inline-flex items-center gap-2 h-10 px-2.5 rounded-lg border transition-colors ${
                  route === 'profile'
                    ? 'border-[#5B3278] bg-[#F3ECF9]'
                    : 'border-[#E8DCF3] bg-white hover:bg-[#FAF7FD]'
                }`}
                aria-label={user.name}
              >
                <img
                  src={resolveMediaUrl(user.avatarUrl)}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover border border-[#E8DCF3]"
                />
                <span className="text-xs font-semibold text-[#24172E] max-w-[100px] truncate hidden sm:inline">
                  {user.name}
                </span>
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate('auth')}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-[#E8DCF3] bg-white text-[#5B3278] hover:bg-[#F3ECF9] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>تسجيل الدخول</span>
              </motion.button>
            )}

            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate('invitations')}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-semibold transition-colors whitespace-nowrap shadow-sm shadow-[#5B3278]/20"
            >
              <Mail className="w-3.5 h-3.5 hidden sm:block" />
              <span>إنشاء دعوتك</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation — Compact height, 44px touch targets with sliding spring indicator */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 velora-glass border-t border-[#E8DCF3] px-2 py-1"
        aria-label="التنقل السفلي"
      >
        <div className="grid grid-cols-5 gap-0.5 max-w-lg mx-auto">
          {NAV_ITEMS.filter((item) => item.mobileShow !== false).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative min-h-[44px] flex flex-col items-center justify-center rounded-lg text-[10px] font-medium transition-colors ${
                  active ? 'text-[#5B3278] font-semibold' : 'text-[#6D5B7B]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="velora-mobile-nav-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-[#F3ECF9] -z-10"
                  />
                )}
                <Icon className="w-4 h-4 mb-0.5 relative z-10" />
                <span className="truncate max-w-full px-0.5 relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
