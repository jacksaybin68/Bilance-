import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketCoinDto } from './dto/market-coin.dto';
import { AssetClass, MarketDataProvider, MarketFetchResult } from './providers/market-data-provider.interface';
import { MarketDataService } from './market-data.service';

function coin(overrides: Partial<MarketCoinDto> = {}): MarketCoinDto {
  return Object.assign(new MarketCoinDto(), {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    image: 'https://img/btc.png',
    price: 1000,
    currency: 'VND',
    change24h: 1.5,
    volume24h: 42,
    marketCap: 42000,
    sparkline: [],
    updatedAt: '2026-09-17T11:58:00.000Z',
    stale: false,
    ...overrides,
  });
}

interface FakeProviderOptions {
  coins?: MarketCoinDto[];
  /** Ném lỗi khi fetch (đơn giản hơn mock fetch toàn cục). */
  failWith?: Error;
  /** Bắt đầu lỗi từ lần fetch thứ N (1-based) — để test "lỗi sau khi đã có cache". */
  failFromCall?: number;
  /** Trễ fetch để test dedupe in-flight. */
  delayMs?: number;
  ttlMs?: number;
}

function fakeProvider(
  assetClass: AssetClass,
  options: FakeProviderOptions = {},
): MarketDataProvider & { calls: { symbols: string; vs: 'vnd' | 'usd' }[] } {
  const self = {
    assetClass,
    calls: [] as { symbols: string; vs: 'vnd' | 'usd' }[],
    cacheTtlMs: () => options.ttlMs ?? 30_000,
    defaultSymbols: () => (assetClass === 'crypto' ? 'bitcoin,ethereum' : ''),
    async fetch(input: { symbols: string; vs: 'vnd' | 'usd' }): Promise<MarketFetchResult> {
      self.calls.push({ symbols: input.symbols, vs: input.vs });
      const callNumber = self.calls.length;
      if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      const shouldFail =
        !!options.failWith && (!options.failFromCall || callNumber >= options.failFromCall);
      if (shouldFail) throw options.failWith;
      const coins = options.coins ?? [coin()];
      return { coins, source: 'coingecko' as const, cached: false, updatedAt: coins[0].updatedAt };
    },
  };
  return self;
}

function buildService(
  providers: (MarketDataProvider & { calls: { symbols: string; vs: 'vnd' | 'usd' }[] })[],
): MarketDataService {
  const config = { get: () => undefined } as unknown as ConfigService;
  return new MarketDataService(providers, config);
}

describe('MarketDataService (orchestrator ADR 008)', () => {
  describe('chọn provider theo assetClass', () => {
    it('TC1 — không truyền assetClass → dùng crypto, hành vi cũ giữ nguyên', async () => {
      const crypto = fakeProvider('crypto');
      const service = buildService([crypto]);

      const result = await service.getMarkets({ vs: 'vnd', ids: 'bitcoin' });

      expect(crypto.calls).toEqual([{ symbols: 'bitcoin', vs: 'vnd' }]);
      // coin() mặc định chưa gán assetClass — TC1 chỉ khẳng định route đúng provider
      // và response shape cũ (việc gắn assetClass vào coin là trách nhiệm của provider).
      expect(result.coins[0].id).toBe('bitcoin');
      expect(result.source).toBe('coingecko');
    });

    it('crypto dùng MARKET_COIN_IDS của provider khi không truyền ids', async () => {
      const crypto = fakeProvider('crypto');
      const service = buildService([crypto]);

      await service.getMarkets({ vs: 'usd' });

      expect(crypto.calls[0].symbols).toBe('bitcoin,ethereum');
    });

    it('assetClass=equity → route sang provider equity với symbols', async () => {
      const crypto = fakeProvider('crypto');
      const equity = fakeProvider('equity', { coins: [coin({ id: 'AAPL', symbol: 'AAPL' })] });
      const service = buildService([crypto, equity]);

      const result = await service.getMarkets({ vs: 'usd', assetClass: 'equity', symbols: 'AAPL' });

      expect(equity.calls).toEqual([{ symbols: 'AAPL', vs: 'usd' }]);
      expect(crypto.calls).toHaveLength(0);
      expect(result.coins[0].id).toBe('AAPL');
    });

    it('TC2a — symbols + assetClass mặc định (crypto) → 400', async () => {
      const service = buildService([fakeProvider('crypto')]);

      await expect(service.getMarkets({ vs: 'vnd', symbols: 'AAPL' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC2b — ids dùng cho assetClass != crypto → 400', async () => {
      const service = buildService([fakeProvider('crypto'), fakeProvider('equity')]);

      await expect(
        service.getMarkets({ vs: 'usd', assetClass: 'equity', ids: 'bitcoin' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC2c — assetClass chưa có provider (fx) → 400 kèm danh sách hỗ trợ', async () => {
      const service = buildService([fakeProvider('crypto')]);

      const error = await service
        .getMarkets({ vs: 'usd', assetClass: 'fx', symbols: 'USDVND=X' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toContain('chưa được hỗ trợ');
      expect((error as BadRequestException).message).toContain('crypto');
    });
  });
});

describe('cache và dedupe', () => {
    it('cache hit trong TTL → không gọi lại provider, source=cache, cached=true', async () => {
      const crypto = fakeProvider('crypto');
      const service = buildService([crypto]);

      const first = await service.getMarkets({ vs: 'vnd', ids: 'bitcoin' });
      const second = await service.getMarkets({ vs: 'vnd', ids: 'bitcoin' });

      expect(crypto.calls).toHaveLength(1);
      expect(first.source).toBe('coingecko');
      expect(second.source).toBe('cache');
      expect(second.cached).toBe(true);
      expect(second.coins[0].stale).toBe(false);
    });

    it('multi-symbol: cache key khác nhau theo ids và vs → gọi lại khi đổi tham số', async () => {
      const crypto = fakeProvider('crypto');
      const service = buildService([crypto]);

      await service.getMarkets({ vs: 'vnd', ids: 'bitcoin' });
      await service.getMarkets({ vs: 'vnd', ids: 'bitcoin,ethereum' });
      await service.getMarkets({ vs: 'usd', ids: 'bitcoin' });

      expect(crypto.calls.map((call) => `${call.vs}:${call.symbols}`)).toEqual([
        'vnd:bitcoin',
        'vnd:bitcoin,ethereum',
        'usd:bitcoin',
      ]);
    });

    it('cache tách theo assetClass — equity không ăn phải cache crypto', async () => {
      const crypto = fakeProvider('crypto', { coins: [coin()] });
      const equity = fakeProvider('equity', {
        coins: [coin({ id: 'AAPL', symbol: 'AAPL', price: 42 })],
      });
      const service = buildService([crypto, equity]);

      await service.getMarkets({ vs: 'usd', ids: 'bitcoin' });
      const equityResult = await service.getMarkets({
        vs: 'usd',
        assetClass: 'equity',
        symbols: 'AAPL',
      });

      expect(equityResult.coins[0].id).toBe('AAPL');
      expect(equity.calls).toHaveLength(1);
    });

    it('hai request song song cùng key → provider chỉ gọi 1 lần (dedupe in-flight)', async () => {
      const crypto = fakeProvider('crypto', { delayMs: 20 });
      const service = buildService([crypto]);

      const [a, b] = await Promise.all([
        service.getMarkets({ vs: 'vnd', ids: 'bitcoin' }),
        service.getMarkets({ vs: 'vnd', ids: 'bitcoin' }),
      ]);

      expect(crypto.calls).toHaveLength(1);
      expect(a.coins).toEqual(b.coins);
    });

    it('request tuần tự sau khi in-flight xong vẫn tái dùng cache (không fetch thêm)', async () => {
      const crypto = fakeProvider('crypto');
      const service = buildService([crypto]);

      await service.getMarkets({ vs: 'vnd', ids: 'bitcoin' });
      await service.getMarkets({ vs: 'vnd', ids: 'bitcoin' });

      expect(crypto.calls).toHaveLength(1);
    });
  });

describe('luật lỗi thống nhất (ADR 008 D5)', () => {
    it('TC3 — provider lỗi + còn cache → trả cache cũ, stale=true (không bịa price 0)', async () => {
      // Lần 1 thành công để có cache; TTL=0 khiến lần 2 bỏ qua cache hit và fetch lại → lỗi.
      const crypto = fakeProvider('crypto', {
        coins: [coin({ price: 1000 })],
        failFromCall: 2,
        failWith: new Error('CoinGecko HTTP 500'),
        ttlMs: 0,
      });
      const service = buildService([crypto]);

      const first = await service.getMarkets({ vs: 'vnd', ids: 'bitcoin' });
      const second = await service.getMarkets({ vs: 'vnd', ids: 'bitcoin' });

      expect(first.source).toBe('coingecko');
      expect(crypto.calls).toHaveLength(2);
      expect(second.source).toBe('cache');
      expect(second.cached).toBe(true);
      expect(second.coins).toHaveLength(1);
      expect(second.coins[0].stale).toBe(true);
      expect(second.coins[0].price).toBe(1000);
    });

    it('TC4 — provider lỗi + không có cache → ServiceUnavailableException (503)', async () => {
      const failing = fakeProvider('crypto', { failWith: new Error('CoinGecko HTTP 500') });
      const service = buildService([failing]);

      await expect(service.getMarkets({ vs: 'vnd', ids: 'bitcoin' })).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect((failing as unknown as { calls: unknown[] }).calls).toHaveLength(1);
    });

    it('TC5 — dedupe multi-symbol: ids "bitcoin,bitcoin,ethereum" là một key riêng, fetch 1 lần cho 2 request song song', async () => {
      const crypto = fakeProvider('crypto', { delayMs: 15 });
      const service = buildService([crypto]);

      const [a, b] = await Promise.all([
        service.getMarkets({ vs: 'vnd', ids: 'bitcoin,bitcoin,ethereum' }),
        service.getMarkets({ vs: 'vnd', ids: 'bitcoin,bitcoin,ethereum' }),
      ]);

      expect(crypto.calls).toHaveLength(1);
      expect(a.coins).toEqual(b.coins);
    });
  });

describe('findBySymbol (hợp đồng nội bộ cũ)', () => {
    it('tìm coin theo symbol không phân biệt hoa/thường', async () => {
      const crypto = fakeProvider('crypto', {
        coins: [coin({ id: 'ethereum', symbol: 'ETH', name: 'Ethereum' })],
      });
      const service = buildService([crypto]);

      expect((await service.findBySymbol('eth'))?.id).toBe('ethereum');
      expect(await service.findBySymbol('nope')).toBeNull();
      expect(await service.findBySymbol('')).toBeNull();
    });
  });



