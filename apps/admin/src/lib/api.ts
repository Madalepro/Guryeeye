import { createApiClient } from '@guryeeye/shared';

// Separate key from the web app so an admin session never leaks into the hotel workspace on a shared origin.
export const TOKEN_KEY = 'guryeeye.admin.token';

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  getToken: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  onUnauthorized: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(TOKEN_KEY);
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
  },
});
