import React from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  Mail,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import type { UserProfile } from '../types/velora';
import type { VeloraRoute } from './VeloraHeader';

interface VeloraWelcomeModalProps {
  user: UserProfile;
  onClose: () => void;
  onNavigate: (route: VeloraRoute) => void;
}

export const VeloraWelcomeModal: React.FC<VeloraWelcomeModalProps> = ({
  user,
  onClose,
  onNavigate,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-[#24172E]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="velora-welcome-title"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 border border-[#E8DCF3] shadow-2xl animate-velora-enter max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#F0E7F8] pb-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#5B3278]">
              مرحبًا بك في VÉLORA · كل تفاصيل فرحتك تبدأ من هنا
            </p>
            <h2
              id="velora-welcome-title"
              className="font-display text-2xl sm:text-3xl font-bold text-[#24172E]"
            >
              أهلًا بك يا {user.name}
            </h2>
            <p className="text-xs sm:text-sm text-[#5E4D6B]">
              تم تفعيل حسابك بنجاح — إليك دليلك السريع لما يقدمه موقع VÉLORA من خدمات:
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#FAF7FD] hover:bg-[#F3ECF9] flex items-center justify-center text-[#5B3278] shrink-0"
            aria-label="إغلاق النافذة الترحيبية"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Core Platform Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-1.5">
            <div className="flex items-center gap-2 text-[#5B3278] font-bold text-sm">
              <Building2 className="w-4 h-4" />
              <span>قاعات الأفراح والحدائق</span>
            </div>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              تصفح قاعات الزفاف المعتمدة، فلترها حسب المدينة والسعة، وافحص التواريخ المتاحة لمنع أي تعارض في الحجز.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-1.5">
            <div className="flex items-center gap-2 text-[#5B3278] font-bold text-sm">
              <Camera className="w-4 h-4" />
              <span>المصورون وألبومات الأعمال</span>
            </div>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              استعرض ألبومات أشهر مصوري الزفاف وتواصل مباشرة بطلبات حجز محمية بنظام اعتماد مزدوج من المصور والإدارة.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-1.5">
            <div className="flex items-center gap-2 text-[#5B3278] font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>11 فئة من تجهيزات الفرح</span>
            </div>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              من الكوشة والورود والديكورات إلى الفساتين والمكياج والموسيقى والبوفيه، أو أضف طلبك الخاص ليصلك أنسب عرض.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7FD] border border-[#E8DCF3] space-y-1.5">
            <div className="flex items-center gap-2 text-[#5B3278] font-bold text-sm">
              <Mail className="w-4 h-4" />
              <span>الدعوات الإلكترونية الذكية</span>
            </div>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              صمّم دعوتك داخل ظرف مقفول بإضاءة وتصميمات فاخرة، وتابع سجل ردود المدعوين وتهانيهم لحظة بلحظة.
            </p>
          </div>
        </div>

        {/* Responsive Web Platform Callout */}
        <div className="p-4 rounded-2xl bg-[#F3ECF9] border border-[#DFCEF0] flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-[#5B3278] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#24172E]">
              موقع متجاوب بالكامل على الكمبيوتر وجميع الهواتف
            </p>
            <p className="text-xs text-[#5E4D6B] leading-relaxed">
              تصفح جميع القاعات، واحجز خدماتك، وصمّم وشارك دعواتك مباشرة من متصفح أي جهاز دون الحاجة لتحميل أي برامج.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('find_wedding');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#FAF7FD] hover:bg-[#F3ECF9] border border-[#E8DCF3] text-xs font-bold text-[#5B3278]"
            >
              اعثر على فرحك
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('workspace');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#FAF7FD] hover:bg-[#F3ECF9] border border-[#E8DCF3] text-xs font-bold text-[#5B3278]"
            >
              مساحة فرحنا الخاصة
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('invitations');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#FAF7FD] hover:bg-[#F3ECF9] border border-[#E8DCF3] text-xs font-bold text-[#5B3278]"
            >
              استوديو الدعوات
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-[#5B3278] hover:bg-[#482461] text-white text-xs font-bold shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>فهمت، ابدأ الاستخدام الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
