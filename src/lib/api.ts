export const API_BASE = import.meta.env.VITE_API_BASE || 'https://pueri-backend-kltk.onrender.com/api';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Erreur API (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return fetchJson<T>(`${API_BASE}${path}`);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return fetchJson<T>(`${API_BASE}${path}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return fetchJson<T>(`${API_BASE}${path}`, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete(path: string): Promise<void> {
  return fetchJson<void>(`${API_BASE}${path}`, { method: 'DELETE' });
}

