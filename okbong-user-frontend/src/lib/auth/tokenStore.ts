const TOKEN_KEY = 'okbong.accessToken';
const REFRESH_TOKEN_KEY = 'okbong.refreshToken';

function safeRead(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(key);
    // A blank value means "no token": an empty string is not a credential and
    // would otherwise make `isAuthenticated()` report a signed-in user, so the
    // UI would call authenticated endpoints and render 401 errors.
    return value === null || value === '' ? null : value;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage is optional: keep the app usable when it is unavailable.
  }
}

/**
 * Reads/writes the persisted JWT pair. Kept dependency free so both the API
 * client and the session helpers can use it without importing each other.
 */
export const tokenStore = {
  getAccessToken: (): string | null => safeRead(TOKEN_KEY),
  getRefreshToken: (): string | null => safeRead(REFRESH_TOKEN_KEY),
  set: (accessToken: string, refreshToken?: string): void => {
    safeWrite(TOKEN_KEY, accessToken);
    if (refreshToken) safeWrite(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: (): void => {
    safeWrite(TOKEN_KEY, null);
    safeWrite(REFRESH_TOKEN_KEY, null);
  },
};
