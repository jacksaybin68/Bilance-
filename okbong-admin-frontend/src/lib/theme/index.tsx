import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  toggle: () => undefined,
});

const STORAGE_KEY = 'admin.theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Keep the first render deterministic (light) and sync with storage after mount.
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    let stored: string | null = null;

    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }

    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    setMode(stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;

    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // best effort only
    }
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#2563eb',
            borderRadius: 8,
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
          },
        }}
      >
        {/*
          `AntApp` provides the message/modal context hooks used by the pages
          (App.useApp) so notifications follow the active light/dark theme.
        */}
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  return useContext(ThemeContext);
}
