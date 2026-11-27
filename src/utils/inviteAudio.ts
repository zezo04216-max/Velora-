/**
 * Invitation voice/music, stored in Firestore as base64 chunks under
 * invitations/{slug}/audio/{0..3} (no paid storage needed).
 * 4 chunks x ~880 KB of base64 = about 2.6 MB of audio (roughly 3 minutes of voice).
 */
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const CHUNK_CHARS = 880_000; // multiple of 4, safely under the 1 MiB document limit
export const MAX_AUDIO_BYTES = Math.floor((CHUNK_CHARS * 4 * 3) / 4); // ~2.64 MB
export const MAX_RECORD_SECONDS = 150;

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('تعذر قراءة الملف الصوتي.'));
    r.readAsDataURL(blob);
  });

export async function loadInviteAudio(slug: string): Promise<{ url: string; mime: string; name: string } | null> {
  if (!db) return null;
  try {
    const snap = await getDocs(collection(db, 'invitations', slug, 'audio'));
    if (snap.empty) return null;
    const parts = snap.docs
      .map((d) => d.data() as { i: number; mime: string; data: string; name?: string })
      .sort((a, b) => a.i - b.i);
    const bin = atob(parts.map((p) => p.data).join(''));
    const bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    const mime = parts[0].mime || 'audio/webm';
    return { url: URL.createObjectURL(new Blob([bytes], { type: mime })), mime, name: parts[0].name || '' };
  } catch {
    return null;
  }
}

export async function deleteInviteAudio(slug: string): Promise<void> {
  if (!db) return;
  for (let i = 0; i < 4; i++) {
    try {
      await deleteDoc(doc(db, 'invitations', slug, 'audio', String(i)));
    } catch {
      /* ignore missing */
    }
  }
}

export async function saveInviteAudio(slug: string, blob: Blob, name = ''): Promise<void> {
  if (!db) throw new Error('الخدمة غير متاحة حاليًا.');
  if (blob.size > MAX_AUDIO_BYTES)
    throw new Error('الملف كبير. الحد الأقصى حوالي 2.5 ميجابايت (نحو 3 دقائق صوت). اختر ملفًا أقصر أو أقل جودة.');
  const mime = (blob.type || 'audio/webm').split(';')[0];
  const b64 = await toBase64(blob);
  const total = Math.ceil(b64.length / CHUNK_CHARS);
  await deleteInviteAudio(slug);
  for (let i = 0; i < total; i++) {
    await setDoc(doc(db, 'invitations', slug, 'audio', String(i)), {
      i,
      total,
      mime,
      name: name.slice(0, 80),
      data: b64.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS),
    });
  }
}
