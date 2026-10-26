import { isPreferences, validateDateDeck, type DatePreferences } from '../../supabase/functions/_shared/date-deck';

export const SESSION_KEY = 'lgc-together-v1';
export interface TogetherSession {
  version: 1;
  createdAt: number;
  preferences: DatePreferences;
  cards: number[];
  index: number;
  revealed: boolean;
  favorites: number[];
  source: 'editorial' | 'ai';
}

export function restoreSession(raw: string | null, now = Date.now()): TogetherSession | null {
  try {
    const s = JSON.parse(raw ?? 'null');
    if (!s || s.version !== 1 || !Number.isFinite(s.createdAt) || s.createdAt > now || now - s.createdAt > 8 * 3600_000 ||
      !isPreferences(s.preferences) || !validateDateDeck(s.cards, s.preferences) ||
      !Number.isInteger(s.index) || s.index < 0 || s.index > s.cards.length ||
      typeof s.revealed !== 'boolean' || !['editorial', 'ai'].includes(s.source) ||
      !Array.isArray(s.favorites) || !s.favorites.every((id: number) => s.cards.includes(id))) return null;
    return s as TogetherSession;
  } catch { return null; }
}

export function readSession(): TogetherSession | null {
  try { return restoreSession(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function saveSession(session: TogetherSession | null): void {
  try {
    if (session && Date.now() - session.createdAt < 8 * 3600_000) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* Private browsing/storage full must never prevent play. */ }
}
