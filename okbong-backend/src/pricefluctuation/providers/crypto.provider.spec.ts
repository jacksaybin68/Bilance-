import { ConfigService } from '@nestjs/config';
import { CryptoProvider } from './crypto.provider';

/**
 * Baseline payload của `GET /price/markets` (assetClass=crypto) ghi lại TRƯỚC khi
 * refactor sang provider registry. Test này khẳng định việc refactor chỉ **thêm**
 * field `assetClass` và không đổi bất kỳ giá trị nào khác (ADR 008 D4).
 */
const BASELINE_COINS = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    image: 'https://img/btc.png',
    price: 1985259449,
    currency: 'VND',
    change24h: 0.09551,
    volume24h: 760868602834255,
    marketCap: 39827152756985760,
    sparkline: [794103779.6, 1588207559.2, 1985259449],
    updatedAt: '2026-09-17T11:58:00.000Z',
    stale: false,
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    image: null,
    price: 50000000,
    currency: 'VND',
    change24h: -1.5,
    volume24h: null,
    marketCap: null,
    sparkline: [],
    updatedAt: '2026-09-17T11:59:00.000Z',
    stale: false,
  },
];

const COINGECKO_RAW = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://img/btc.png',
    current_price: 1985259449,
    price_change_percentage_24h: 0.09551,
    total_volume: 760868602834255,
    market_cap: 39827152756985760,
    sparkline_in_7d: { price: [1000, 2000, 2500] },
    last_updated: '2026-09-17T11:58:00.000Z',
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    image: '',
    current_price: 50000000,
    price_change_percentage_24h: -1.5,
    total_volume: null,
    market_cap: null,
    sparkline_in_7d: null,
    last_updated: '2026-09-17T11:59:00.000Z',
  },
];

function buildConfig(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function stubFetch(
  responder: (url: string, init?: RequestInit) => Response | Promise<Response> = () =>
    new Response(JSON.stringify(COINGECKO_RAW), { status: 200 }),
) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => responder(url, init));
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Bỏ field mới để so sánh 1-1 với baseline. */
function withoutAssetClass(coins: { assetClass?: string }[]): unknown[] {
  return coins.map(({ assetClass, ...rest }) => rest);
}

describe('CryptoProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('giữ nguyên payload crypto như baseline, chỉ thêm field assetClass', async () => {
    stubFetch();
    const provider = new CryptoProvider(buildConfig());

    const result = await provider.fetch({ symbols: 'bitcoin,ethereum', vs: 'vnd' });

    expect(withoutAssetClass(result.coins)).toEqual(BASELINE_COINS);
    expect(result.coins.map((coin) => coin.assetClass)).toEqual(['crypto', 'crypto']);
    expect(result.source).toBe('coingecko');
    expect(result.cached).toBe(false);
    expect(result.updatedAt).toBe('2026-09-17T11:58:00.000Z');
  });

  it('gọi đúng endpoint CoinGecko với vs, ids, sparkline và header', async () => {
    const fetchMock = stubFetch();
    const provider = new CryptoProvider(buildConfig());

    await provider.fetch({ symbols: 'bitcoin,ethereum', vs: 'usd' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/coins/markets?');
    expect(url).toContain('vs_currency=usd');
    expect(url).toContain('ids=bitcoin%2Cethereum');
    expect(url).toContain('sparkline=true');
    expect(url).toContain('price_change_percentage=24h');
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('gửi API key khi có MARKET_API_KEY, không gửi khi không cấu hình', async () => {
    const withKey = stubFetch();
    await new CryptoProvider(buildConfig({ MARKET_API_KEY: 'demo-key' })).fetch({
      symbols: 'bitcoin',
      vs: 'vnd',
    });
    expect(
      (withKey.mock.calls[0][1] as RequestInit).headers as Record<string, string>,
    ).toMatchObject({ 'x-cg-demo-api-key': 'demo-key' });

    const withoutKey = stubFetch();
    await new CryptoProvider(buildConfig()).fetch({ symbols: 'bitcoin', vs: 'vnd' });
    expect(
      (withoutKey.mock.calls[0][1] as RequestInit).headers as Record<string, string>,
    ).not.toHaveProperty('x-cg-demo-api-key');
  });

  it('dùng MARKET_API_BASE cấu hình được', async () => {
    const fetchMock = stubFetch();
    await new CryptoProvider(
      buildConfig({ MARKET_API_BASE: 'https://example.test/api/v3' }),
    ).fetch({ symbols: 'bitcoin', vs: 'vnd' });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://example.test/api/v3/coins/markets?vs_currency=vnd&ids=bitcoin&order=market_cap_desc&sparkline=true&price_change_percentage=24h',
    );
  });

  it('ném lỗi khi CoinGecko trả mã không phải 2xx (để orchestrator xử lý)', async () => {
    stubFetch(() => new Response('rate limited', { status: 429 }));
    const provider = new CryptoProvider(buildConfig());

    await expect(provider.fetch({ symbols: 'bitcoin', vs: 'vnd' })).rejects.toThrow(
      'CoinGecko HTTP 429 (vs=vnd)',
    );
  });

  it('chuẩn hoá trường thiếu giống bản cũ: symbol UPPERCASE, image rỗng → null', async () => {
    stubFetch(() => new Response(JSON.stringify([COINGECKO_RAW[1]]), { status: 200 }));

    const result = await new CryptoProvider(buildConfig()).fetch({
      symbols: 'ethereum',
      vs: 'vnd',
    });

    expect(result.coins[0].symbol).toBe('ETH');
    expect(result.coins[0].image).toBeNull();
    expect(result.coins[0].sparkline).toEqual([]);
    expect(result.coins[0].volume24h).toBeNull();
  });

  it('giữ hành vi cũ khi nguồn thiếu current_price (ADR 008 D5 — siết lại là issue riêng)', async () => {
    stubFetch(() =>
      new Response(
        JSON.stringify([{ ...COINGECKO_RAW[0], current_price: null, last_updated: null }]),
        { status: 200 },
      ),
    );

    const result = await new CryptoProvider(buildConfig()).fetch({
      symbols: 'bitcoin',
      vs: 'vnd',
    });

    expect(result.coins[0].price).toBe(0);
    expect(typeof result.coins[0].updatedAt).toBe('string');
  });

  it('defaultSymbols dùng MARKET_COIN_IDS, fallback bộ mặc định của sàn', () => {
    expect(new CryptoProvider(buildConfig({ MARKET_COIN_IDS: 'bitcoin' })).defaultSymbols()).toBe(
      'bitcoin',
    );
    expect(new CryptoProvider(buildConfig()).defaultSymbols()).toBe(
      'bitcoin,ethereum,tether,solana,dogecoin,zcash',
    );
  });

  it('cacheTtlMs đọc MARKET_CACHE_TTL_MS, fallback 30s khi thiếu hoặc không hợp lệ', () => {
    expect(new CryptoProvider(buildConfig({ MARKET_CACHE_TTL_MS: '5000' })).cacheTtlMs()).toBe(5000);
    expect(new CryptoProvider(buildConfig()).cacheTtlMs()).toBe(30_000);
    expect(new CryptoProvider(buildConfig({ MARKET_CACHE_TTL_MS: 'abc' })).cacheTtlMs()).toBe(30_000);
  });
});

