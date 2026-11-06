const API = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    ...(init.method && init.method !== 'GET' && !init.body ? { body: '{}' } : {}),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/me' && path !== '/auth/login')
      window.dispatchEvent(new Event('eduflow:session-expired'));
    const message =
      typeof data.message === 'string'
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join('. ')
          : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const dateTime = (date: string | Date, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat(getLocale(), {
    timeZone: 'Australia/Melbourne',
    ...options,
  }).format(new Date(date));

function getLocale(): 'en-AU' | 'zh-CN' {
  try {
    const saved = localStorage.getItem('eduflow.language');
    if (saved === 'zh-CN' || saved === 'en-AU') return saved;
  } catch {
    // Fall through to browser language detection.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-AU';
}

export const dateOnly = (date: string | Date) =>
  dateTime(date, { weekday: 'short', day: 'numeric', month: 'short' });
export const timeOnly = (date: string | Date) =>
  dateTime(date, { hour: 'numeric', minute: '2-digit' });

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
