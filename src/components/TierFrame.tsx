import React from 'react';
import { Crown, Gem, Sparkles, Star } from 'lucide-react';
import type { MembershipFrameTier } from '../types/velora';

/** Frame classes per membership tier: higher tiers are visibly stronger. */
export function tierFrameClass(tier?: MembershipFrameTier): string {
  switch (tier) {
    case 'starter':
      return 'outline outline-2 outline-[#C9B0E3]';
    case 'royal':
      return 'outline outline-[3px] outline-[#7A4A9E] shadow-lg shadow-[#D9768F]/25';
    case 'platinum':
      return 'outline outline-4 outline-[#3D1C5E] shadow-xl shadow-[#3D1C5E]/35';
    case 'vip_couple':
      return 'outline outline-[3px] outline-[#C4568A] shadow-lg shadow-[#C4568A]/25';
    default:
      return '';
  }
}

const BADGE: Record<string, { cls: string; Icon: React.ElementType; fallback: string }> = {
  starter: { cls: 'bg-[#F3ECF9] text-[#5B3278] border-[#C9B0E3]', Icon: Star, fallback: 'شريك' },
  royal: { cls: 'bg-[#7A4A9E] text-white border-[#7A4A9E]', Icon: Crown, fallback: 'شريك ملكي' },
  platinum: {
    cls: 'bg-gradient-to-l from-[#3D1C5E] via-[#5B3278] to-[#8E8AA8] text-white border-[#3D1C5E]',
    Icon: Gem,
    fallback: 'شريك بلاتيني',
  },
  vip_couple: { cls: 'bg-[#C4568A] text-white border-[#C4568A]', Icon: Sparkles, fallback: 'VIP' },
};

export const TierBadge: React.FC<{ tier?: MembershipFrameTier; label?: string; className?: string }> = ({
  tier,
  label,
  className = '',
}) => {
  const b = tier ? BADGE[tier] : undefined;
  if (!b) return null;
  const Icon = b.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${b.cls} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span>{label || b.fallback}</span>
    </span>
  );
};
