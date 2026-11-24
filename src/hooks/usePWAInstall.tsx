import React, { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setIsInstalled(true);
    return outcome === 'accepted';
  };

  return {
    canInstall: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    promptInstall,
  };
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#5B3278] px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-[#C9B0E3]">
      <WifiOff className="w-3.5 h-3.5 text-[#E2C68B]" />
      <span>وضع عدم الاتصال — يتم عرض البيانات المحفوظة مؤقتًا</span>
    </div>
  );
};

export function PWAInstallButton({
  className = '',
  label = 'تثبيت التطبيق على الهاتف',
}: {
  className?: string;
  label?: string;
}) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (canInstall) {
            void promptInstall();
          } else {
            setShowGuide(true);
          }
        }}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DFCEF0] bg-[#F3ECF9] hover:bg-[#EAE0F6] text-[#5B3278] text-xs font-bold transition-colors ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-[#24172E]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#E8DCF3] shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#5B3278]">
                <Smartphone className="w-5 h-5" />
                <h3 className="font-display text-lg font-bold text-[#24172E]">
                  تثبيت تطبيق VÉLORA على الهاتف
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5B3278]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isIOS ? (
              <p className="text-xs text-[#5E4D6B] leading-relaxed">
                1. اضغط على زر <strong>المشاركة (Share)</strong> أسفل متصفح Safari.<br />
                2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> لتشغيل التطبيق بملء الشاشة مثل تطبيقات الآيفون.
              </p>
            ) : (
              <p className="text-xs text-[#5E4D6B] leading-relaxed">
                التطبيق مهيأ للعمل مباشرة كتطبيق هاتف (PWA) من نفس رابط الموقع:<br />
                1. افتح قائمة المتصفح (⋮) أعلى الشاشة ثم اختر <strong>تثبيت التطبيق (Install App)</strong> أو <strong>الإضافة إلى الشاشة الرئيسية</strong>.<br />
                2. سيعمل VÉLORA كأيقونة مستقلة بملء الشاشة على هاتفك بنفس البيانات مباشرة دون الحاجة لتحميل ملفات خارجية.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#5B3278] text-white text-xs font-bold"
            >
              حسنًا
            </button>
          </div>
        </div>
      )}
    </>
  );
}
