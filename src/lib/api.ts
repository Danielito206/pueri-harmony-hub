// URL de base du backend.
//
// La valeur par défaut est l'URL de PRODUCTION réelle. Elle n'est pas là pour
// faire joli : si la variable d'environnement VITE_API_BASE venait à
// disparaître de la configuration Vercel, l'application continuerait à
// fonctionner au lieu de parler silencieusement à un serveur mort.
// VITE_API_BASE reste prioritaire — c'est elle qu'on utilise pour pointer
// vers un backend local ou de test pendant le développement.
const PRODUCTION_API_BASE = 'https://api.pueri-angeli.cloud/api';

export const API_BASE = import.meta.env.VITE_API_BASE || PRODUCTION_API_BASE;

if (!import.meta.env.VITE_API_BASE && import.meta.env.DEV) {
  console.warn(
    `[api] VITE_API_BASE n'est pas définie — utilisation de l'URL de production (${PRODUCTION_API_BASE}).`
  );
}

// ---------------------------------------------------------------------------
// Jeton d'authentification
//
// Reçu à la connexion (voir AuthContext.tsx) puis attaché automatiquement à
// chaque requête via l'en-tête "Authorization: Bearer <token>", que le backend
// (MongoTokenAuthentication) exige pour reconnaître un admin/professeur/parent.
//
// Il est aussi conservé dans le sessionStorage : sans cela, un simple
// rafraîchissement de page ferait perdre la session en pleine saisie.
// sessionStorage plutôt que localStorage — la session disparaît à la
// fermeture de l'onglet, ce qui réduit la durée pendant laquelle un jeton
// reste récupérable sur un poste partagé.
// ---------------------------------------------------------------------------
const TOKEN_STORAGE_KEY = 'pueri.authToken';

const readStoredToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

let authToken: string | null = readStoredToken();

export function setAuthToken(token: string | null) {
  authToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Navigation privée ou stockage désactivé : on garde le jeton en mémoire,
    // la session ne survivra simplement pas au rafraîchissement.
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

// Appelé quand le serveur répond que la session n'est plus valable, pour que
// l'application puisse déconnecter proprement au lieu d'afficher une interface
// connectée dont chaque action échoue.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// ---------------------------------------------------------------------------
// Messages d'erreur
//
// Le backend renvoie ses erreurs en JSON, par exemple {"error": "Classe
// introuvable"}. Sans traitement, l'interface afficherait le JSON brut à
// l'utilisateur. On en extrait le message lisible.
// ---------------------------------------------------------------------------
async function buildError(res: Response): Promise<Error> {
  if (res.status === 401) {
    onUnauthorized?.();
    return new Error('Session expirée — reconnecte-toi pour continuer.');
  }

  const text = await res.text().catch(() => '');

  if (text) {
    try {
      const data = JSON.parse(text);
      if (typeof data === 'string' && data.trim()) return new Error(data);
      if (data?.error) return new Error(String(data.error));
      if (data?.detail) return new Error(String(data.detail));
      const first = data && typeof data === 'object' ? Object.values(data)[0] : null;
      if (Array.isArray(first) && first.length) return new Error(String(first[0]));
      if (typeof first === 'string' && first.trim()) return new Error(first);
    } catch {
      // Réponse non-JSON (page d'erreur HTML du serveur, par exemple) :
      // on ne la montre pas telle quelle, elle serait illisible.
      if (text.length < 200 && !text.trim().startsWith('<')) {
        return new Error(text);
      }
    }
  }

  if (res.status === 403) {
    return new Error("Permission refusée — ton compte n'a pas les droits pour cette action.");
  }
  if (res.status === 404) {
    return new Error('Ressource introuvable.');
  }
  if (res.status >= 500) {
    return new Error(`Erreur du serveur (${res.status}). Réessaie dans un instant.`);
  }
  return new Error(`Erreur API (${res.status})`);
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });
  } catch {
    // fetch ne rejette que sur un problème réseau (serveur injoignable,
    // coupure, CORS). Un message clair évite de chercher un bug côté code.
    throw new Error('Serveur injoignable — vérifie ta connexion internet.');
  }

  if (!res.ok) {
    throw await buildError(res);
  }

  if (res.status === 204) {
    return undefined as T;
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

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new Error('Serveur injoignable — vérifie ta connexion internet.');
  }

  if (!res.ok) {
    throw await buildError(res);
  }

  return res.json() as Promise<T>;
}
