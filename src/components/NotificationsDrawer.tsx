import React from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import type { NotificationRecord } from '../types/velora';

interface NotificationsDrawerProps {
  open: boolean;
  notifications: NotificationRecord[];
  onClose: () => void;
  onMarkRead: (id?: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  notifications,
  onClose,
  onMarkRead,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#24172E]/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-r border-[#E8DCF3] flex flex-col">
        <div className="p-5 border-b border-[#E8DCF3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#5B3278]" />
            <h2 className="font-display text-xl font-bold text-[#24172E]">الإشعارات</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMarkRead()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F3ECF9] text-[#5B3278] text-[11px] font-bold"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>تحديد الكل كمقروء</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#FAF7FD] flex items-center justify-center text-[#5E4D6B]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#7A6A88]">
              لا توجد إشعارات جديدة حاليًا.
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onMarkRead(n.id)}
                className={`w-full text-right p-4 rounded-2xl border transition-colors ${
                  n.isRead
                    ? 'bg-[#FAF7FD] border-[#E8DCF3]'
                    : 'bg-[#F3ECF9] border-[#C9B0E3]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-[#24172E]">{n.titleAr}</span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#5B3278] shrink-0" />}
                </div>
                <p className="text-xs text-[#5E4D6B] leading-relaxed">{n.bodyAr}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
