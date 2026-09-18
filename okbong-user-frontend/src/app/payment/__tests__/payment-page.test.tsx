import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { billApi } from '@/lib/api/endpoints';
import { requestWithMeta } from '@/lib/api/client';
import PaymentHistoryPage from '@/app/payment/page';

vi.mock('@/lib/api/endpoints', () => ({
  billApi: {
    list: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    requestWithMeta: vi.fn(),
  };
});

const mockBills: ReturnType<typeof billApi.list> extends Promise<infer T> ? T : never = [
  {
    id: 'b1',
    userId: 'u1',
    amount: 150000,
    type: 'recurring',
    status: 'paid',
    content: 'Thanh toán hóa đơn điện',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'b2',
    userId: 'u1',
    amount: 320000,
    type: 'payment',
    status: 'pending',
    content: 'Nạp ví điện tử',
    createdAt: '2024-01-16T14:30:00.000Z',
    updatedAt: '2024-01-16T14:30:00.000Z',
  },
] as any;

const mockMarketCoins = [
  {
    id: 'tether',
    symbol: 'USDT',
    name: 'Tether',
    image: 'https://example.com/usdt.png',
    price: 25450,
    currency: 'VND',
    change24h: 0.05,
    volume24h: 1000000,
    marketCap: 50000000000,
    sparkline: [25000, 25100, 25200, 25300, 25400, 25450],
    updatedAt: '2026-09-17T11:58:00.000Z',
    stale: false,
  },
];

describe('Payment history page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requestWithMeta as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockMarketCoins,
      meta: {
        source: 'coingecko',
        cached: false,
        updatedAt: '2026-09-17T11:58:00.000Z',
      },
    });
  });

  it('shows a loading spinner while fetching payment history', () => {
    (billApi.list as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}),
    );

    render(<PaymentHistoryPage />);
    expect(screen.getByText('Đang tải…')).toBeTruthy();
  });

  it('renders the payment history list after load', async () => {
    (billApi.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockBills);

    render(<PaymentHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('150,000')).toBeTruthy();
      expect(screen.getByText('320,000')).toBeTruthy();
    });

    expect(screen.getAllByText('Lịch sử thanh toán')[1]).toBeTruthy();
    expect(screen.getByText('2 thanh toán')).toBeTruthy();
    expect(screen.getByText('Thanh toán hóa đơn điện')).toBeTruthy();
    expect(screen.getByText('Nạp ví điện tử')).toBeTruthy();
  });

  it('shows empty state when there are no bills', async () => {
    (billApi.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<PaymentHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Không có thanh toán nào.')).toBeTruthy();
    });
  });

  it('shows error state and retry button when load fails', async () => {
    (billApi.list as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error'),
    );
    (requestWithMeta as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error'),
    );

    render(<PaymentHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    expect(screen.getAllByRole('button', { name: 'Thử lại' })[0]).toBeTruthy();
  });
});
