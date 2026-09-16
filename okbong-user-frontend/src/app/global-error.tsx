'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

/**
 * Root error boundary (Next.js App Router file convention).
 * Catches errors thrown by the root layout/template itself. It replaces the
 * whole document, so it must render its own <html> and <body> tags and cannot
 * rely on global providers (i18n, theme bootstrap…).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          color: '#111827',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 420 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>Đã xảy ra lỗi</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
            Ứng dụng gặp sự cố không mong muốn. Bạn có thể thử lại.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              border: 'none',
              borderRadius: 12,
              background: '#111827',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              padding: '10px 20px',
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
