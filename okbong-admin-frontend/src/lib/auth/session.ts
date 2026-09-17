export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'user';

export interface AdminUser {
  id: string;
  email: string;
  fullName?: string;
  role: AdminRole;
}

export interface AdminSession {
  user: AdminUser;
  accessToken: string;
  issuedAt: string;
}

const SESSION_KEY = 'admin.session';
const TOKEN_KEY = 'admin.accessToken';

/** Roles allowed to open the admin console. */
export const ADMIN_ROLES: readonly AdminRole[] = ['super_admin', 'admin'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isAdminRole(value: unknown): value is AdminRole {
  return value === 'super_admin' || value === 'admin' || value === 'moderator' || value === 'user';
}

function parseSession(value: unknown): AdminSession | null {
  if (!isRecord(value) || !isRecord(value.user)) return null;
  const { user } = value;

  if (
    typeof user.id !== 'string' ||
    typeof user.email !== 'string' ||
    !isAdminRole(user.role) ||
    typeof value.accessToken !== 'string'
  ) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: typeof user.fullName === 'string' ? user.fullName : undefined,
      role: user.role,
    },
    accessToken: value.accessToken,
    issuedAt: typeof value.issuedAt === 'string' ? value.issuedAt : new Date().toISOString(),
  };
}

export function saveSession(session: AdminSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  } catch {
    // storage unavailable: the session simply will not survive a reload
  }
}

export function readSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return parseSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** True when the stored session holds one of the given roles (admin by default). */
export function hasRole(roles: readonly AdminRole[] = ADMIN_ROLES): boolean {
  const session = readSession();
  return session !== null && roles.includes(session.user.role);
}

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
