import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { billApi } from '@/lib/api/endpoints';
import PaymentHistoryPage from '@/app/payment/page';

vi.mock('@/lib/api/endpoints', () => ({
  billApi: {
    list: vi.fn(),
  },
}));

const mockBills: ReturnType<typeof billApi.list> extends Promise<infer T> ? T : never = [
  {
    id: 'b1',
    userId: 'u1',
    amount: 150000,
    type: 'transfer',
    status: 'completed',
    description: 'Thanh toán hóa đơn điện',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'b2',
    userId: 'u1',
    amount: 320000,
    type: 'e-wallet',
    status: 'pending',
    description: 'Nạp ví điện tử',
    createdAt: '2024-01-16T14:30:00.000Z',
    updatedAt: '2024-01-16T14:30:00.000Z',
  },
] as any;

describe('Payment history page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(screen.getByText('Lịch sử thanh toán')).toBeTruthy();
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

    render(<PaymentHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Không tải được lịch sử thanh toán. Vui lòng thử lại.')).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
  });
});
