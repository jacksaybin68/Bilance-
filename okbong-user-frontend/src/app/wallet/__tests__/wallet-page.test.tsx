import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Wallet } from '@/types/api';

const listMineMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/endpoints', () => ({
  walletApi: {
    listMine: listMineMock,
    deposit: vi.fn(),
    withdraw: vi.fn(),
  },
}));

import WalletPage from '@/app/wallet/page';

function makeWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: 'w-1',
    userId: 'u-1',
    type: 'e-wallet',
    balance: 1250000,
    currency: 'VND',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('WalletPage', () => {
  beforeEach(() => {
    listMineMock.mockReset();
    window.localStorage.clear();
  });

  it('shows the empty state when the user has no wallets', async () => {
    listMineMock.mockResolvedValue([]);

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Bạn chưa có ví nào.')).toBeTruthy();
    });
  });

  it('renders the total balance and deposit/withdraw actions', async () => {
    listMineMock.mockResolvedValue([makeWallet()]);

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Tổng tài sản')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Nạp tiền' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rút tiền' })).toBeTruthy();
  });

  it('shows an error alert with retry when the API fails', async () => {
    // getErrorMessage surfaces plain Error messages; a rejected promise like a
    // network failure would render the exact message we assert on.
    listMineMock.mockRejectedValue(new Error('Không tải được thông tin ví. Vui lòng thử lại.'));

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Không tải được thông tin ví. Vui lòng thử lại.')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
  });
});