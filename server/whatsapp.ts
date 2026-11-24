import crypto from 'node:crypto';
import type {
  BookingRecord,
  ElectronicInvitationRecord,
  UpcomingReminderMilestoneState,
  UpcomingReminderPreview,
  WhatsAppConfigSummary,
  WhatsAppMilestone,
  WhatsAppProviderKind,
  WhatsAppReminderRecord,
  WhatsAppReminderStatus,
} from '../src/types/velora.ts';
import {
  WHATSAPP_MILESTONES,
  buildWhatsAppReminderMessage,
  determineDueMilestones,
  normalizeEgyptWhatsAppPhone,
  resolveCairoEventTimestamp,
} from '../src/utils/veloraLogic.ts';
import {
  createNotification,
  getWhatsAppReminderByBookingMilestone,
  listAllBookings,
  listInvitationsForOwner,
  listWhatsAppReminders,
  upsertWhatsAppReminder,
} from './db.ts';

interface DispatchResult {
  provider: WhatsAppProviderKind;
  status: WhatsAppReminderStatus;
  providerMessageId: string;
  errorText: string;
}

export interface ReminderSweepSummary {
  triggerSource: 'auto_interval' | 'cron_webhook' | 'admin_manual';
  checkedBookings: number;
  dispatchedCount: number;
  sentCount: number;
  simulatedCount: number;
  failedCount: number;
  skippedAlreadyLogged: number;
  ranAt: string;
}

let activeSweepPromise: Promise<ReminderSweepSummary> | null = null;

function resolveConfiguredProvider(): {
  provider: WhatsAppProviderKind;
  configured: boolean;
  providerLabelAr: string;
} {
  const explicit = (process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase();

  const metaToken = (process.env.WHATSAPP_META_TOKEN || '').trim();
  const metaPhoneId = (process.env.WHATSAPP_META_PHONE_ID || '').trim();
  const hasMeta = Boolean(metaToken && metaPhoneId);

  const twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const twilioToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const twilioFrom = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
  const hasTwilio = Boolean(twilioSid && twilioToken && twilioFrom);

  const ultraInstance = (process.env.ULTRAMSG_INSTANCE_ID || '').trim();
  const ultraToken = (process.env.ULTRAMSG_TOKEN || '').trim();
  const hasUltra = Boolean(ultraInstance && ultraToken);

  if (explicit === 'meta' && hasMeta) {
    return { provider: 'meta', configured: true, providerLabelAr: 'Meta WhatsApp Cloud API (مفعّل)' };
  }
  if (explicit === 'twilio' && hasTwilio) {
    return { provider: 'twilio', configured: true, providerLabelAr: 'Twilio WhatsApp API (مفعّل)' };
  }
  if (explicit === 'ultramsg' && hasUltra) {
    return { provider: 'ultramsg', configured: true, providerLabelAr: 'UltraMsg WhatsApp Gateway (مفعّل)' };
  }

  if (!explicit) {
    if (hasMeta) return { provider: 'meta', configured: true, providerLabelAr: 'Meta WhatsApp Cloud API (مفعّل)' };
    if (hasTwilio) return { provider: 'twilio', configured: true, providerLabelAr: 'Twilio WhatsApp API (مفعّل)' };
    if (hasUltra) return { provider: 'ultramsg', configured: true, providerLabelAr: 'UltraMsg WhatsApp Gateway (مفعّل)' };
  }

  return {
    provider: 'simulation',
    configured: false,
    providerLabelAr: 'وضع المحاكاة والتسجيل المحلي (بانتظار ربط بوابة واتساب في الإعدادات)',
  };
}

export function getWhatsAppConfigSummary(): WhatsAppConfigSummary {
  const resolved = resolveConfiguredProvider();
  return {
    provider: resolved.provider,
    configured: resolved.configured,
    cronProtected: Boolean((process.env.REMINDER_CRON_SECRET || '').trim()),
    providerLabelAr: resolved.providerLabelAr,
  };
}

async function sendViaProvider(input: {
  toDigits: string;
  messageBody: string;
  clientName: string;
  targetTitle: string;
  eventDate: string;
}): Promise<DispatchResult> {
  const { provider, configured } = resolveConfiguredProvider();

  if (!configured || provider === 'simulation') {
    return {
      provider: 'simulation',
      status: 'simulated',
      providerMessageId: `sim-${crypto.randomUUID().slice(0, 8)}`,
      errorText: '',
    };
  }

  try {
    if (provider === 'meta') {
      const token = (process.env.WHATSAPP_META_TOKEN || '').trim();
      const phoneId = (process.env.WHATSAPP_META_PHONE_ID || '').trim();
      const templateName = (process.env.WHATSAPP_META_TEMPLATE || '').trim();
      const templateLang = (process.env.WHATSAPP_META_LANG || 'ar').trim();

      const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`;
      const payload = templateName
        ? {
            messaging_product: 'whatsapp',
            to: input.toDigits,
            type: 'template',
            template: {
              name: templateName,
              language: { code: templateLang },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: input.clientName },
                    { type: 'text', text: input.targetTitle },
                    { type: 'text', text: input.eventDate },
                  ],
                },
              ],
            },
          }
        : {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: input.toDigits,
            type: 'text',
            text: {
              preview_url: false,
              body: input.messageBody,
            },
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      const rawJson = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          provider: 'meta',
          status: 'failed',
          providerMessageId: '',
          errorText: rawJson.error?.message || `Meta API HTTP ${res.status}`,
        };
      }
      return {
        provider: 'meta',
        status: 'sent',
        providerMessageId: rawJson.messages?.[0]?.id || '',
        errorText: '',
      };
    }

    if (provider === 'twilio') {
      const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
      const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
      const rawFrom = (process.env.TWILIO_WHATSAPP_FROM || '').trim().replace(/^whatsapp:/i, '');
      const fromValue = rawFrom.startsWith('+') ? `whatsapp:${rawFrom}` : `whatsapp:+${rawFrom}`;

      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
      const form = new URLSearchParams();
      form.set('To', `whatsapp:+${input.toDigits}`);
      form.set('From', fromValue);
      form.set('Body', input.messageBody);

      const basicAuth = Buffer.from(`${sid}:${authToken}`, 'utf8').toString('base64');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        signal: AbortSignal.timeout(12000),
      });
      const rawJson = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (!res.ok) {
        return {
          provider: 'twilio',
          status: 'failed',
          providerMessageId: '',
          errorText: rawJson.message || `Twilio HTTP ${res.status}`,
        };
      }
      return {
        provider: 'twilio',
        status: 'sent',
        providerMessageId: rawJson.sid || '',
        errorText: '',
      };
    }

    // UltraMsg
    const instanceId = (process.env.ULTRAMSG_INSTANCE_ID || '').trim();
    const token = (process.env.ULTRAMSG_TOKEN || '').trim();
    const endpoint = `https://api.ultramsg.com/${encodeURIComponent(instanceId)}/messages/chat`;
    const form = new URLSearchParams();
    form.set('token', token);
    form.set('to', `+${input.toDigits}`);
    form.set('body', input.messageBody);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(12000),
    });
    const rawJson = (await res.json().catch(() => ({}))) as { id?: string | number; sent?: string; error?: string };
    if (!res.ok || rawJson.error) {
      return {
        provider: 'ultramsg',
        status: 'failed',
        providerMessageId: '',
        errorText: String(rawJson.error || `UltraMsg HTTP ${res.status}`),
      };
    }
    return {
      provider: 'ultramsg',
      status: 'sent',
      providerMessageId: rawJson.id ? String(rawJson.id) : '',
      errorText: '',
    };
  } catch (err) {
    return {
      provider,
      status: 'failed',
      providerMessageId: '',
      errorText: err instanceof Error ? err.message : 'فشل الاتصال ببوابة الواتساب.',
    };
  }
}

function findMatchingWeddingTime(
  booking: BookingRecord,
  allInvitations: ElectronicInvitationRecord[]
): string {
  const targetDate = (booking.eventDate || '').trim().slice(0, 10);
  const match = allInvitations.find(
    (inv) => inv.ownerId === booking.clientId && inv.weddingDate.trim().slice(0, 10) === targetDate
  );
  if (match && /^\d{1,2}:\d{2}/.test((match.weddingTime || '').trim())) {
    return match.weddingTime.trim().slice(0, 5);
  }
  return '19:00';
}

export function buildUpcomingReminderPreviews(nowMs = Date.now()): UpcomingReminderPreview[] {
  const confirmedBookings = listAllBookings().filter((b) => b.status === 'confirmed');
  const invitations = listInvitationsForOwner();
  const previews: UpcomingReminderPreview[] = [];

  for (const booking of confirmedBookings) {
    const eventTime = findMatchingWeddingTime(booking, invitations);
    const eventTs = resolveCairoEventTimestamp(booking.eventDate, eventTime);
    if (eventTs === null) continue;

    // Show upcoming events and events from the last 12 hours for visibility
    const hoursUntilEvent = Number(((eventTs - nowMs) / (3600 * 1000)).toFixed(1));
    if (hoursUntilEvent < -12) continue;

    const dueSet = new Set(determineDueMilestones(eventTs, nowMs));
    const milestones: UpcomingReminderMilestoneState[] = WHATSAPP_MILESTONES.map((spec) => {
      const scheduledTs = eventTs - spec.hoursBefore * 3600 * 1000;
      const existingLog = getWhatsAppReminderByBookingMilestone(booking.id, spec.milestone);

      let state: UpcomingReminderMilestoneState['state'] = 'upcoming';
      if (existingLog) {
        state = existingLog.status;
      } else if (dueSet.has(spec.milestone)) {
        state = 'due_now';
      } else if (nowMs > scheduledTs) {
        state = 'missed_past';
      }

      return {
        milestone: spec.milestone,
        labelAr: spec.labelAr,
        scheduledAtIso: new Date(scheduledTs).toISOString(),
        state,
        sentAt: existingLog?.sentAt || undefined,
      };
    });

    previews.push({
      bookingId: booking.id,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      normalizedPhone: normalizeEgyptWhatsAppPhone(booking.clientPhone),
      targetTitle: booking.targetTitle,
      eventDate: booking.eventDate,
      eventTime,
      eventAtIso: new Date(eventTs).toISOString(),
      hoursUntilEvent,
      milestones,
    });
  }

  return previews.sort((a, b) => a.hoursUntilEvent - b.hoursUntilEvent);
}

async function executeReminderSweep(
  triggerSource: 'auto_interval' | 'cron_webhook' | 'admin_manual'
): Promise<ReminderSweepSummary> {
  const nowMs = Date.now();
  const confirmedBookings = listAllBookings().filter((b) => b.status === 'confirmed');
  const invitations = listInvitationsForOwner();

  let sentCount = 0;
  let simulatedCount = 0;
  let failedCount = 0;
  let skippedAlreadyLogged = 0;

  for (const booking of confirmedBookings) {
    const eventTime = findMatchingWeddingTime(booking, invitations);
    const eventTs = resolveCairoEventTimestamp(booking.eventDate, eventTime);
    if (eventTs === null) continue;

    const dueMilestones = determineDueMilestones(eventTs, nowMs);
    if (dueMilestones.length === 0) continue;

    for (const milestone of dueMilestones) {
      const existing = getWhatsAppReminderByBookingMilestone(booking.id, milestone);
      if (existing && (existing.status === 'sent' || existing.status === 'simulated')) {
        skippedAlreadyLogged += 1;
        continue;
      }

      const messageBody = buildWhatsAppReminderMessage({
        milestone,
        clientName: booking.clientName,
        targetTitle: booking.targetTitle,
        eventDate: booking.eventDate,
        eventTime,
      });

      const normalizedPhone = normalizeEgyptWhatsAppPhone(booking.clientPhone);
      if (!normalizedPhone) {
        upsertWhatsAppReminder({
          bookingId: booking.id,
          milestone,
          recipientPhone: booking.clientPhone || 'غير متوفر',
          clientName: booking.clientName,
          targetTitle: booking.targetTitle,
          eventDate: booking.eventDate,
          eventTime,
          messageBody,
          provider: resolveConfiguredProvider().provider,
          status: 'failed',
          errorText: 'رقم هاتف العميل غير صالح للإرسال عبر واتساب.',
          sentAt: new Date().toISOString(),
        });
        failedCount += 1;
        continue;
      }

      const dispatch = await sendViaProvider({
        toDigits: normalizedPhone,
        messageBody,
        clientName: booking.clientName,
        targetTitle: booking.targetTitle,
        eventDate: booking.eventDate,
      });

      upsertWhatsAppReminder({
        bookingId: booking.id,
        milestone,
        recipientPhone: `+${normalizedPhone}`,
        clientName: booking.clientName,
        targetTitle: booking.targetTitle,
        eventDate: booking.eventDate,
        eventTime,
        messageBody,
        provider: dispatch.provider,
        status: dispatch.status,
        providerMessageId: dispatch.providerMessageId,
        errorText: dispatch.errorText,
        sentAt: new Date().toISOString(),
      });

      if (dispatch.status === 'sent') {
        sentCount += 1;
      } else if (dispatch.status === 'simulated') {
        simulatedCount += 1;
      } else {
        failedCount += 1;
      }

      if (dispatch.status === 'sent' || dispatch.status === 'simulated') {
        const milestoneLabel = WHATSAPP_MILESTONES.find((m) => m.milestone === milestone)?.labelAr || milestone;
        createNotification({
          userId: booking.clientId,
          titleAr: `تذكير موعد زفافك (${milestoneLabel})`,
          bodyAr: `تم تجهيز تذكير الواتساب لحجز "${booking.targetTitle}" يوم ${booking.eventDate}.`,
          kind: 'booking',
          relatedRoute: 'bookings',
        });
      }
    }
  }

  return {
    triggerSource,
    checkedBookings: confirmedBookings.length,
    dispatchedCount: sentCount + simulatedCount,
    sentCount,
    simulatedCount,
    failedCount,
    skippedAlreadyLogged,
    ranAt: new Date().toISOString(),
  };
}

export function runScheduledWhatsAppReminders(
  triggerSource: 'auto_interval' | 'cron_webhook' | 'admin_manual'
): Promise<ReminderSweepSummary> {
  if (!activeSweepPromise) {
    activeSweepPromise = executeReminderSweep(triggerSource).finally(() => {
      activeSweepPromise = null;
    });
  }
  return activeSweepPromise;
}

export async function sendTestWhatsAppReminder(input: {
  phone: string;
  milestone: WhatsAppMilestone;
  clientName?: string;
  targetTitle?: string;
  eventDate?: string;
  eventTime?: string;
}): Promise<WhatsAppReminderRecord> {
  const normalizedPhone = normalizeEgyptWhatsAppPhone(input.phone);
  if (!normalizedPhone) {
    throw new Error('رقم الواتساب غير صالح. يرجى إدخال رقم صحيح مثل 01012345678 أو +201012345678.');
  }

  const milestone: WhatsAppMilestone =
    input.milestone === '3d' || input.milestone === '1d' || input.milestone === '6h' ? input.milestone : '3d';
  const clientName = (input.clientName || 'عميل VÉLORA').trim();
  const targetTitle = (input.targetTitle || 'قصر الأوركيد الملكي — التجمع الخامس').trim();
  const eventDate = (input.eventDate || new Date(Date.now() + 3 * 86400 * 1000).toISOString().slice(0, 10)).trim();
  const eventTime = (input.eventTime || '19:00').trim().slice(0, 5);

  const messageBody = buildWhatsAppReminderMessage({
    milestone,
    clientName,
    targetTitle,
    eventDate,
    eventTime,
  });

  const dispatch = await sendViaProvider({
    toDigits: normalizedPhone,
    messageBody,
    clientName,
    targetTitle,
    eventDate,
  });

  return upsertWhatsAppReminder({
    bookingId: `test-${crypto.randomUUID().slice(0, 8)}`,
    milestone,
    recipientPhone: `+${normalizedPhone}`,
    clientName,
    targetTitle,
    eventDate,
    eventTime,
    messageBody,
    provider: dispatch.provider,
    status: dispatch.status,
    providerMessageId: dispatch.providerMessageId,
    errorText: dispatch.errorText,
    sentAt: new Date().toISOString(),
  });
}

export function getRemindersAdminSnapshot() {
  return {
    config: getWhatsAppConfigSummary(),
    upcoming: buildUpcomingReminderPreviews(),
    logs: listWhatsAppReminders(100),
  };
}
