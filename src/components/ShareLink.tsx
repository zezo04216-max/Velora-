import React, { useState } from 'react';
import { Check, Link2 } from 'lucide-react';

export const ShareLink: React.FC<{ path: string; title?: string; className?: string }> = ({ path, title, className = '' }) => {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* user cancelled or clipboard blocked */
    }
  };
  return (
    <div className={className}>
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B3278] hover:underline"
      >
        {done ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
        <span>{done ? 'تم نسخ الرابط' : 'شارك الرابط'}</span>
      </button>
    </div>
  );
};
