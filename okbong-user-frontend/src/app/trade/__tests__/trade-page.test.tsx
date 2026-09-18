import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { priceApi } from '@/lib/api/endpoints';
import TradePage from '@/app/trade/page';

vi.mock('@/lib/api/endpoints', () => ({
  priceApi: { markets: vi.fn() },
}));

const marketsMock = priceApi.markets as unknown as ReturnType<typeof vi.fn>;

const UPDATED_AT = '2026-09-18T05:00:00.000Z';

/** Coin rút gọn, chỉ giữ field mà trang Trade và hook sử dụng. */
function coin(symbol: string, name: string, price: number, stale = false) {
  return {
    id: symbol.toLowerCase(),
    symbol,
    name,
    image: null,
    price,
    currency: 'VND',
    change24h: 0,
    volume24h: null,
    marketCap: null,
    sparkline: [],
    updatedAt: UPDATED_AT,
    stale,
  };
}

// Giá VND có tỷ lệ "đẹp" để assert chính xác: 26_000 / 2_000_000_000 = 0.000013
const COINS = [
  coin('USDT', 'Tether', 26_000),
  coin('BTC', 'Bitcoin', 2_000_000_000),
  coin('ETH', 'Ethereum', 50_000_000),
  coin('SOL', 'Solana', 3_000_000),
];

function mockMarkets(coins: ReturnType<typeof coin>[] = COINS, updatedAt: string | null = UPDATED_AT) {
  marketsMock.mockResolvedValue({
    data: coins,
    meta: { source: 'coingecko', cached: false, updatedAt },
  });
}

/** Nút chọn cặp trong lưới pair — textContent không có khoảng trắng: `USDT/BTC`. */
function pairButton(from: string, to: string): HTMLElement {
  const button = screen
    .getAllByRole('button')
    .find((element) => element.textContent === `${from}/${to}`);
  if (!button) throw new Error(`Không tìm thấy nút cặp ${from}/${to}`);
  return button;
}

describe('Trade page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkets();
  });

  it('hiển thị spinner khi đang tải dữ liệu thị trường', () => {
    marketsMock.mockReturnValue(new Promise(() => {}));

    render(<TradePage />);

    expect(screen.getByText('Đang tải…')).toBeTruthy();
  });

  it('render tiêu đề, cặp mặc định và tỷ giá USDT/BTC từ dữ liệu thật', async () => {
    render(<TradePage />);

    await waitFor(() => expect(screen.getByText('Sàn Giao Dịch')).toBeTruthy());

    expect(screen.getByText('Cặp giao dịch')).toBeTruthy();
    expect(screen.getByText('Bạn trả')).toBeTruthy();
    expect(screen.getByText('Bạn nhận')).toBeTruthy();
    expect(screen.getByText('Tỷ giá: 1 USDT ≈ 0.000013 BTC')).toBeTruthy();
    expect(screen.getByText('Cặp giao dịch gần đây')).toBeTruthy();
    expect(screen.getByText('Mua BTC')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Làm mới' })).toBeTruthy();
  });

  it('hiển thị thời điểm cập nhật lấy từ meta của API', async () => {
    render(<TradePage />);

    await waitFor(() => expect(screen.getByText(/Cập nhật lần cuối/)).toBeTruthy());
  });

  it('tính số lượng nhận được theo tỷ giá khi nhập số lượng', async () => {
    const user = userEvent.setup();
    render(<TradePage />);

    await waitFor(() => expect(screen.getByText('Bạn nhận')).toBeTruthy());
    await user.type(screen.getByRole('spinbutton'), '1000');

    expect(screen.getByText('0.013000')).toBeTruthy();
  });

  it('vô hiệu hoá nút mua khi số lượng trống hoặc bằng 0', async () => {
    const user = userEvent.setup();
    render(<TradePage />);

    await waitFor(() => expect(screen.getByText('Mua BTC')).toBeTruthy());
    const buyButton = screen.getByRole('button', { name: 'Mua BTC' }) as HTMLButtonElement;
    expect(buyButton.disabled).toBe(true);

    await user.type(screen.getByRole('spinbutton'), '5');
    expect(buyButton.disabled).toBe(false);

    await user.clear(screen.getByRole('spinbutton'));
    expect(buyButton.disabled).toBe(true);
  });

  it('đổi tỷ giá khi chọn cặp khác trong lưới pair', async () => {
    const user = userEvent.setup();
    render(<TradePage />);

    await waitFor(() => expect(screen.getByText('Tỷ giá: 1 USDT ≈ 0.000013 BTC')).toBeTruthy());

    await user.click(pairButton('USDT', 'ETH'));

    expect(screen.getByText('Tỷ giá: 1 USDT ≈ 0.000520 ETH')).toBeTruthy();
    expect(screen.getByText('Mua ETH')).toBeTruthy();
  });
});

describe('Trade page — đảo chiều cặp giao dịch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkets();
  });

  it('đảo from/to, tính lại tỷ giá và xoá số lượng đã nhập', async () => {
    const user = userEvent.setup();
    render(<TradePage />);

    await waitFor(() => expect(screen.getByText('Tỷ giá: 1 USDT ≈ 0.000013 BTC')).toBeTruthy());

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    await user.type(input, '1000');
    expect(screen.getByText('0.013000')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Đổi chiều cặp giao dịch' }));

    expect(screen.getByText('Tỷ giá: 1 BTC ≈ 76923.076923 USDT')).toBeTruthy();
    expect(screen.getByText('Mua USDT')).toBeTruthy();
    expect(input.value).toBe('');
  });

  it('hiển thị tỷ giá tham chiếu cho mọi cặp trong danh sách gần đây', async () => {
    render(<TradePage />);

    await waitFor(() => expect(screen.getByText('Cặp giao dịch gần đây')).toBeTruthy());

    expect(screen.getByText('1 USDT = 0.0000 BTC')).toBeTruthy();
    expect(screen.getByText('1 BTC = 40.0000 ETH')).toBeTruthy();
    expect(screen.getByText('1 USDT = 0.0087 SOL')).toBeTruthy();
  });
});

describe('Trade page — trạng thái dữ liệu cũ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị cảnh báo stale khi nguồn dữ liệu đang lỗi', async () => {
    mockMarkets([coin('USDT', 'Tether', 26_000, true), coin('BTC', 'Bitcoin', 2_000_000_000, true)]);

    render(<TradePage />);

    await waitFor(() => expect(screen.getByText('Dữ liệu stale')).toBeTruthy());
  });

  it('hiển thị nhãn tự động làm mới khi meta không có updatedAt', async () => {
    mockMarkets(COINS, null);

    render(<TradePage />);

    await waitFor(() =>
      // Nhãn nằm sau tiền tố `⟳` trong cùng một <p> nên phải match bằng regex.
      expect(screen.getByText(/Tự động làm mới mỗi 30 giây/)).toBeTruthy(),
    );
  });
});
