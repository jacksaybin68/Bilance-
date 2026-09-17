import type { User } from '@/types/api';
import { tokenStore } from '@/lib/auth/tokenStore';
import { isRecord } from '@/lib/parsers';
import { isUserRole } from '@/types/api';

const USER_KEY = 'okbong.user';

export interface Session {
  user: User;
}

function parseUser(value: unknown): User | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.email !== 'string') return null;
  if (!isUserRole(value.role)) return null;

  return {
    id: value.id,
    email: value.email,
    fullName: typeof value.fullName === 'string' ? value.fullName : null,
    role: value.role,
    status:
      value.status === 'active' || value.status === 'inactive' || value.status === 'banned'
        ? value.status
        : 'active',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  };
}

export function saveSession(user: User, accessToken: string, refreshToken?: string): void {
  tokenStore.set(accessToken, refreshToken);

  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Session persistence is best effort; the token itself is what matters.
  }
}

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;

    const user = parseUser(JSON.parse(raw) as unknown);
    return user ? { user } : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  tokenStore.clear();

  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  return tokenStore.getAccessToken() !== null;
}

/** Returns the persisted user profile (if any) for UI display purposes. */
export function getStoredUser(): User | null {
  return readSession()?.user ?? null;
}