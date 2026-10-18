const KEY = "blackjack:session";

export interface StoredSession {
  code: string;
  playerId: string;
  rejoinToken: string;
  name: string;
  email: string;
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // localStorage kan geblokkeerd zijn (bv. privémodus) - sessie werkt dan zonder reconnect-herstel.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // negeren
  }
}
