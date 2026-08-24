export const API_BASE = import.meta.env.VITE_API_BASE || 'https://pueri-backend-kltk.onrender.com/api';

// Jeton d'authentification reçu à la connexion (voir AuthContext.tsx).
// Conservé ici en mémoire et attaché automatiquement à chaque requête
// protégée via l'en-tête "Authorization: Bearer <token>", que le backend
// (MongoTokenAuthentication) exige pour reconnaître un admin/professeur/parent.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
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

// Upload de fichier (multipart/form-data) — ne PAS fixer le header
// Content-Type ici : le navigateur doit générer lui-même la "boundary"
// du multipart, sinon la requête est invalide côté serveur.
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Erreur API (${res.status})`);
  }

  return res.json() as Promise<T>;
}
