import { createApiClient } from '@guryeeye/shared';

export const TOKEN_KEY = 'guryeeye.token';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export const api = createApiClient({
  baseUrl: API_URL,
  getToken,
  onUnauthorized: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(TOKEN_KEY);
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
  },
});
