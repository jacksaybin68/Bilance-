'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LanguageToggle } from '@/components/language-toggle/LanguageToggle';
import { ThemeToggle } from '@/components/theme-toggle/ThemeToggle';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { clearSession, isAuthenticated } from '@/lib/auth/session';

interface NavItem {
  href: string;
  key: MessageKey;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', key: 'nav.dashboard' },
  { href: '/market', key: 'nav.market' },
  { href: '/wallet', key: 'nav.wallet' },
  { href: '/price', key: 'nav.price' },
  { href: '/bill', key: 'nav.bills' },
];

export function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = useCallback(() => {
    clearSession();
    setAuthenticated(false);
    router.push('/landing');
  }, [router]);

  const linkClass = (href: string): string => {
    const isActive = pathname === href || pathname?.startsWith(`${href}/`);

    return [
      'rounded-md px-2 py-1 text-sm font-medium transition-colors',
      isActive
        ? 'text-primary'
        : 'text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary',
    ].join(' ');
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/90 backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/landing" className="text-xl font-bold tracking-tighter text-primary">
          {t('app.name')}
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {t(item.key)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />

          {authenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300 md:inline-flex"
            >
              {t('nav.logout')}
            </button>
          ) : (
            <Link
              href="/auth"
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300 md:inline-flex"
            >
              {t('nav.login')}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t('nav.menu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300/70 text-gray-600 dark:border-gray-600/60 dark:text-gray-200 md:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="mobile-menu"
          className="border-t border-gray-200/70 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-900 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {t(item.key)}
              </Link>
            ))}
            {authenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md px-2 py-1 text-left text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300"
              >
                {t('nav.logout')}
              </button>
            ) : (
              <Link
                href="/auth"
                className="rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </nav>
  );
}