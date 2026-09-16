import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from '@/app/error';
import GlobalErrorBoundary from '@/app/global-error';

describe('Route segment error boundary (app/error.tsx)', () => {
  it('renders the fallback UI and calls retry when clicked', () => {
    const retry = vi.fn();
    const error = new Error('boom') as Error & { digest?: string };
    error.digest = 'digest-1';

    render(<ErrorBoundary error={error} retry={retry} />);

    expect(screen.getByText('Đã xảy ra lỗi')).toBeTruthy();
    expect(screen.getByText('Trang này gặp sự cố khi hiển thị. Bạn có thể thử lại.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('Global error boundary (app/global-error.tsx)', () => {
  it('renders the standalone fallback UI and calls retry when clicked', () => {
    const retry = vi.fn();
    const error = new Error('fatal');

    render(<GlobalErrorBoundary error={error} retry={retry} />);

    // global-error renders its own <html>/<body> (Next convention) and cannot
    // use the app's providers, so it carries its own inline copy instead of i18n.
    expect(screen.getByText('Đã xảy ra lỗi')).toBeTruthy();
    expect(
      screen.getByText('Ứng dụng gặp sự cố không mong muốn. Bạn có thể thử lại.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
