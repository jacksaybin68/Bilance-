import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MarketQueryDto } from './market-coin.dto';

/**
 * Validation tầng DTO (trước khi vào orchestrator) — ADR 008 D1.
 * Orchestrator tự chặn lại các cặp tham số sai (`symbols`+crypto...) bằng 400.
 */
describe('MarketQueryDto (assetClass/symbols — ADR 008)', () => {
  async function validateQuery(query: Record<string, unknown>) {
    const dto = plainToInstance(MarketQueryDto, query);
    const errors = await validate(dto, { whitelist: true });
    return { dto, messages: errors.map((error) => Object.values(error.constraints ?? {})).flat() };
  }

  it('TC1 — không truyền gì: mặc định vs=vnd, assetClass=crypto, hợp lệ', async () => {
    const { dto, messages } = await validateQuery({});

    expect(messages).toHaveLength(0);
    expect(dto.vs).toBe('vnd');
    expect(dto.assetClass).toBe('crypto');
  });

  it('TC2a — assetClass không nằm trong enum → 400', async () => {
    const { messages } = await validateQuery({ assetClass: 'nft' });

    expect(messages.length).toBeGreaterThan(0);
  });

  it('TC2b — symbols sai regex (ký tự đặc biệt) → 400', async () => {
    const { messages } = await validateQuery({ assetClass: 'equity', symbols: 'AAPL;DROP' });

    expect(messages.length).toBeGreaterThan(0);
  });

  it('symbols hợp lệ theo regex ADR 008: chữ, số, . , = ^ -', async () => {
    for (const symbols of ['AAPL,VCB.VN', 'USDVND=X', 'GC=F', '^GSPC', 'BRK.B']) {
      const { messages } = await validateQuery({ assetClass: 'equity', symbols });
      expect(messages, symbols).toHaveLength(0);
    }
  });

  it('ids vẫn giữ regex cũ (a-z0-9 và dấu phẩy)', async () => {
    const { messages } = await validateQuery({ ids: 'bitcoin,ethereum' });
    expect(messages).toHaveLength(0);

    const bad = await validateQuery({ ids: 'bitcoin,ETH-ereum' });
    expect(bad.messages.length).toBeGreaterThan(0);
  });
});
