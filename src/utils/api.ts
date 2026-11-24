let authToken: string | null = null;

export function setClientAuthToken(token: string | null): void {
  authToken = token;
}

export function getClientAuthToken(): string | null {
  return authToken;
}

export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }

  if (!res.ok) {
    const errMsg = typeof parsed.error === 'string' ? parsed.error : `حدث خطأ غير متوقع (${res.status})`;
    throw new Error(errMsg);
  }
  return parsed as T;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الملف المحدد.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const res = await apiFetch<{ url: string }>('/api/media/upload', {
    method: 'POST',
    body: JSON.stringify({ dataUrl, filename: file.name }),
  });
  return res.url;
}
