import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { normalizeEgyptWhatsAppPhone } from '../utils/veloraLogic';

interface ContactRowProps {
  /** Phone saved by the person who posted the offer or request. Nothing is shown without a valid number. */
  phone?: string;
  /** What the message is about, used as the WhatsApp opening line. */
  subject?: string;
  className?: string;
}

export const ContactRow: React.FC<ContactRowProps> = ({ phone, subject, className = '' }) => {
  const digits = phone ? normalizeEgyptWhatsAppPhone(phone) : null;
  if (!digits) return null;
  const text = subject ? `مرحبًا، تواصلت معك من منصة VÉLORA بخصوص: ${subject}` : 'مرحبًا، تواصلت معك من منصة VÉLORA';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#25A244] hover:bg-[#1E8A39] text-white text-xs font-semibold transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>تواصل معي</span>
      </a>
      <a
        href={`tel:+${digits}`}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#E2D2F2] bg-white hover:bg-[#F3ECF9] text-[#5B3278] text-xs font-semibold transition-colors"
        aria-label="اتصال هاتفي"
      >
        <Phone className="w-3.5 h-3.5" />
        <span>اتصال</span>
      </a>
    </div>
  );
};
