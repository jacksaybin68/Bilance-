import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/footer/Footer';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'NexTrading - Sàn giao dịch P2P & Mua Bán Crypto Nhanh Chóng',
  description: 'Giao dịch mua bán Bitcoin, USDT, Ethereum và các loại tiền mã hoá nhanh chóng với VND. Khớp giá tốt nhất tự động, 0% phí giao dịch.',
};

/** Applies the persisted theme before paint so there is no light/dark flash. */
const themeBootstrapScript = `
(function () {
  try {
    var stored = window.localStorage.getItem('theme');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (error) {
    /* ignore */
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="flex min-h-screen flex-col bg-[var(--bg-page)] text-[var(--text-primary)] antialiased transition-colors duration-250 dark:bg-[var(--bg-page)] dark:text-[var(--text-primary)]">
        <I18nProvider>
          <Navbar />
          <main className="flex-1 pt-6">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}