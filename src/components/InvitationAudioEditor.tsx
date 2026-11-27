import React, { useEffect, useRef, useState } from 'react';
import { Mic, Music2, Square, Trash2 } from 'lucide-react';
import {
  MAX_AUDIO_BYTES,
  MAX_RECORD_SECONDS,
  deleteInviteAudio,
  loadInviteAudio,
  saveInviteAudio,
} from '../utils/inviteAudio';

/** Owner tool: record a voice message or upload music/Quran. It plays when the guest opens the envelope. */
export const InvitationAudioEditor: React.FC<{ slug: string }> = ({ slug }) => {
  const [open, setOpen] = useState(false);
  const [audio, setAudio] = useState<{ url: string; name: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [msg, setMsg] = useState('');
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    void loadInviteAudio(slug).then((a) => {
      setAudio(a ? { url: a.url, name: a.name } : null);
      setLoaded(true);
    });
  }, [open, loaded, slug]);

  const persist = async (blob: Blob, name: string) => {
    setBusy(true);
    setMsg('');
    try {
      await saveInviteAudio(slug, blob, name);
      setAudio({ url: URL.createObjectURL(blob), name });
      setMsg('تم حفظ الصوت. هيشتغل للضيف أول ما يفتح الظرف.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'تعذر حفظ الصوت.');
    } finally {
      setBusy(false);
    }
  };

  const startRec = async () => {
    setMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 0) void persist(blob, 'تسجيل صوتي');
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setSecs(0);
      timerRef.current = window.setInterval(() => {
        setSecs((s) => {
          if (s + 1 >= MAX_RECORD_SECONDS) recRef.current?.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setMsg('مش قادر أوصل للميكروفون. اسمح للمتصفح بالوصول إليه أو ارفع ملف صوتي بدل التسجيل.');
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('audio/')) return setMsg('اختر ملفًا صوتيًا فقط (mp3 أو m4a أو wav أو ogg).');
    if (f.size > MAX_AUDIO_BYTES)
      return setMsg(`الملف كبير (${(f.size / 1048576).toFixed(1)} ميجا). الحد الأقصى حوالي 2.5 ميجا، نحو 3 دقائق.`);
    void persist(f, f.name);
  };

  const remove = async () => {
    setBusy(true);
    await deleteInviteAudio(slug);
    setAudio(null);
    setMsg('تم حذف الصوت.');
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-[#E8DCF3] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-[#5B3278]">
        <span className="inline-flex items-center gap-1.5"><Music2 className="w-3.5 h-3.5" /> رسالة صوتية أو موسيقى للضيوف</span>
        <span className="text-[#8C799B] font-normal">{open ? 'إخفاء' : 'إضافة'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5 text-xs text-[#5E4D6B]">
          <p>بتشتغل للضيف أول ما يفتح الظرف، وعنده زر إيقاف وكتم. تسجيلك أو ملف صوت (قرآن أو موسيقى) حتى حوالي 2.5 ميجا.</p>
          {audio && (
            <div className="space-y-1.5">
              <audio controls src={audio.url} className="w-full h-9" />
              {audio.name && <p className="text-[#8C799B] truncate">{audio.name}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!recording ? (
              <button type="button" disabled={busy} onClick={startRec} className="inline-flex items-center gap-1.5 rounded-lg bg-[#5B3278] text-white px-3 py-2 font-bold disabled:opacity-60">
                <Mic className="w-3.5 h-3.5" /> تسجيل صوتي
              </button>
            ) : (
              <button type="button" onClick={() => recRef.current?.stop()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#B3261E] text-white px-3 py-2 font-bold">
                <Square className="w-3.5 h-3.5" /> إيقاف وحفظ ({secs}ث)
              </button>
            )}
            <label className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E8DCF3] px-3 py-2 font-bold cursor-pointer ${busy || recording ? 'opacity-60 pointer-events-none' : ''}`}>
              <Music2 className="w-3.5 h-3.5" /> رفع ملف صوتي
              <input type="file" accept="audio/*" className="hidden" onChange={onFile} />
            </label>
            {audio && (
              <button type="button" disabled={busy} onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg border border-[#F2C9C6] text-[#B3261E] px-3 py-2 font-bold">
                <Trash2 className="w-3.5 h-3.5" /> حذف
              </button>
            )}
          </div>
          {busy && <p>جارٍ الحفظ…</p>}
          {msg && <p className="font-semibold text-[#5B3278]">{msg}</p>}
        </div>
      )}
    </div>
  );
};
