'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LanguageToggle } from '@/components/language-toggle/LanguageToggle';
import { ThemeToggle } from '@/components/theme-toggle/ThemeToggle';
import { useI18n } from '@/lib/i18n';
import { clearSession, getStoredUser, isAuthenticated } from '@/lib/auth/session';

export function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; role?: string } | null>(null);

  useEffect(() => {
    const isAuth = isAuthenticated();
    setAuthenticated(isAuth);
    if (isAuth) {
      setUser(getStoredUser());
    } else {
      setUser(null);
    }
    setMenuOpen(false);
    setProfileDropdownOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  const handleLogout = useCallback(() => {
    clearSession();
    setAuthenticated(false);
    setUser(null);
    router.push('/auth');
  }, [router]);

  const isExpressActive = pathname === '/' || pathname === '/landing';
  const isP2PActive = pathname === '/p2p' || pathname === '/market';

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Sub-Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 items-center justify-center rounded-lg bg-black px-2.5 text-lg font-black tracking-widest text-white transition-transform group-hover:scale-105 dark:bg-white dark:text-black">
              NexTrading
            </div>
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-primary sm:inline-block">
              P2P Express
            </span>
          </Link>

          {/* Sub-nav: Chuyển đổi giữa 2 chế độ */}
          <div className="hidden items-center gap-1 sm:flex">
            <Link
              href="/"
              className={`relative rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
                isExpressActive
                  ? 'text-black dark:text-white after:absolute after:bottom-[-19px] after:left-0 after:h-[2px] after:w-full after:bg-black dark:after:bg-white'
                  : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {t('nav.express')}
            </Link>

            <Link
              href="/market"
              className={`relative rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
                isP2PActive && !isExpressActive
                  ? 'text-black dark:text-white after:absolute after:bottom-[-19px] after:left-0 after:h-[2px] after:w-full after:bg-black dark:after:bg-white'
                  : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {t('nav.p2p')}
            </Link>
          </div>
        </div>

        {/* Right: Menu người dùng & Cài đặt */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Currency Display Badge */}
          <div className="hidden items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>VND (₫)</span>
          </div>

          <LanguageToggle />
          <ThemeToggle />

          {/* Notifications button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-black dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label={t('nav.notifications')}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950"></span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('nav.notifications')}</h4>
                  <span className="text-[10px] text-primary">Đã đọc tất cả</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Bảo chứng Escrow kích hoạt</p>
                    <p className="text-gray-500 dark:text-gray-400">Giao dịch P2P qua ngân hàng Việt Nam hiện được bảo chứng 100% an toàn.</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Tỷ giá VND cập nhật</p>
                    <p className="text-gray-500 dark:text-gray-400">Tỷ giá tham chiếu USDT/VND vừa khớp giá tốt nhất 25.450 ₫.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lệnh của tôi (Orders) */}
          <Link
            href="/dashboard"
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-black dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white md:inline-flex"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('nav.orders')}
          </Link>

          {/* Tài sản (Assets) */}
          <Link
            href="/wallet"
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-black dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white md:inline-flex"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {t('nav.assets')}
          </Link>

          {/* User Profile / Auth State */}
          {authenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pr-2 pl-1.5 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden max-w-[100px] truncate text-xs font-semibold sm:inline-block">
                  {user?.email?.split('@')[0] ?? 'User'}
                </span>
                <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  KYC 1
                </span>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.email}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Đã xác minh KYC Cấp 1</p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t('nav.profile')}
                  </Link>
                  <Link
                    href="/wallet"
                    className="block rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t('nav.assets')}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-lg bg-black px-3.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
            >
              {t('nav.login')}
            </Link>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t('nav.menu')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-300 md:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="border-t border-gray-200/80 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 md:hidden">
          <div className="flex flex-col gap-1 text-sm font-medium">
            <Link href="/" className={`rounded-lg px-3 py-2 ${isExpressActive ? 'bg-gray-100 font-bold dark:bg-gray-800' : ''}`}>
              {t('nav.express')}
            </Link>
            <Link href="/market" className="rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900">
              {t('nav.p2p')}
            </Link>
            <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900">
              {t('nav.orders')}
            </Link>
            <Link href="/wallet" className="rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900">
              {t('nav.assets')}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}