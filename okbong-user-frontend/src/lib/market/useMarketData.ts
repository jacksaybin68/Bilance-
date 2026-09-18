'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { priceApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import {
  DEFAULT_MARKET_IDS,
  isMarketCoin,
  type MarketCoin,
  type MarketMeta,
} from './types';

export type MarketLoadState = 'loading' | 'ready' | 'error';

export interface UseMarketDataOptions {
  /** CoinGecko ids cần lấy. Mặc định: bộ coin của sàn. */
  ids?: readonly string[];
  /** Chu kỳ làm mới (ms). `0` = chỉ tải một lần. Mặc định 30000. */
  refreshMs?: number;
  /** Đơn vị tiền tệ hiển thị. Mặc định `vnd`. */
  vs?: 'vnd' | 'usd';
}

export interface UseMarketDataResult {
  coins: MarketCoin[];
  meta: MarketMeta;
  state: MarketLoadState;
  errorMessage: string;
  /** `true` khi backend trả cache cũ (nguồn ngoài đang lỗi). */
  isStale: boolean;
  refresh: () => void;
}

const EMPTY_META: MarketMeta = { source: null, cached: false, updatedAt: null };

/**
 * Nguồn dữ liệu thị trường duy nhất cho mọi component. Tự làm mới theo chu kỳ,
 * giữ dữ liệu cũ khi lần tải sau thất bại (không nhấp nháy về trạng thái rỗng).
 */
export function useMarketData(options: UseMarketDataOptions = {}): UseMarketDataResult {
  const { refreshMs = 30_000, vs = 'vnd' } = options;
  const ids = options.ids ?? DEFAULT_MARKET_IDS;
  const idsKey = ids.join(',');

  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [meta, setMeta] = useState<MarketMeta>(EMPTY_META);
  const [state, setState] = useState<MarketLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  // Tránh setState sau khi unmount và tránh ghi đè dữ liệu mới bằng kết quả cũ.
  const requestIdRef = useRef(0);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const { data, meta: responseMeta } = await priceApi.markets(idsKey.split(','), vs);
        if (cancelled || requestId !== requestIdRef.current) return;

        const parsed = Array.isArray(data) ? data.filter(isMarketCoin) : [];
        setCoins(parsed);
        setMeta({
          source:
            responseMeta.source === 'coingecko' ||
            responseMeta.source === 'cache' ||
            responseMeta.source === 'fallback'
              ? responseMeta.source
              : null,
          cached: responseMeta.cached,
          updatedAt: responseMeta.updatedAt,
        });
        setState('ready');
        setErrorMessage('');
      } catch (error) {
        if (cancelled || requestId !== requestIdRef.current) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;

        // Giữ dữ liệu đang có; chỉ chuyển sang 'error' khi chưa từng có dữ liệu.
        setCoins((current) => {
          if (current.length === 0) setState('error');
          return current;
        });
        setErrorMessage(getErrorMessage(error, 'Không tải được dữ liệu thị trường.'));
      }
    };

    void load();

    if (refreshMs <= 0) {
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    const timer = window.setInterval(() => void load(), refreshMs);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [idsKey, refreshMs, reloadToken, vs]);

  return {
    coins,
    meta,
    state,
    errorMessage,
    isStale: coins.some((coin) => coin.stale),
    refresh,
  };
}
