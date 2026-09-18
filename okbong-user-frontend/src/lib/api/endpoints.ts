import type {
  AuthTokens,
  TwoFaChallengeResult,
  Bill,
  BillFilter,
  CreateBillRequest,
  LoginRequest,
  PaginatedTransactions,
  PricePoint,
  RegisterRequest,
  User,
  Wallet,
  WalletMutationRequest,
} from '@/types/api';
import { apiClient, requestWithMeta, type ResponseMeta } from './client';
import { DEFAULT_MARKET_IDS, type MarketCoin } from '@/lib/market/types';

function toQuery(params: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query.length > 0 ? `?${query}` : '';
}

export const authApi = {
  login: (payload: LoginRequest): Promise<AuthTokens & TwoFaChallengeResult> =>
    apiClient.post<AuthTokens & TwoFaChallengeResult>('/auth/login', payload, { auth: false }),
  register: (payload: RegisterRequest): Promise<User> =>
    apiClient.post<User>('/users', payload, { auth: false }),
  refresh: (refreshToken: string): Promise<AuthTokens> =>
    apiClient.post<AuthTokens>('/auth/refresh', { refreshToken }, { auth: false }),
  /** Hoàn tất đăng nhập 2FA — gọi sau khi nhận `requires2FA: true` từ /auth/login. */
  verify2fa: (
    payload: { sessionId: string; token: string },
  ): Promise<AuthTokens & { twoFactorEnabled: boolean; pendingSetupResolved: boolean; user: User }> =>
    apiClient.post<AuthTokens & { twoFactorEnabled: boolean; pendingSetupResolved: boolean; user: User }>(
      '/auth/2fa/verify',
      payload,
      { auth: false },
    ),
};

export const userApi = {
  me: (): Promise<User> => apiClient.get<User>('/users/me', { auth: true }),
  update: (
    body: Partial<Pick<User, 'fullName' | 'email'>>,
  ): Promise<User> => apiClient.patch<User>('/users/me', body, { auth: true }),
};

export const walletApi = {
  listMine: (): Promise<Wallet[]> =>
    apiClient.get<Wallet[]>('/wallets/mine', { auth: true }),
  deposit: (
    payload: WalletMutationRequest,
  ): Promise<Wallet> => apiClient.post<Wallet>('/wallets/deposit', payload, { auth: true }),
  withdraw: (
    payload: WalletMutationRequest,
  ): Promise<Wallet> => apiClient.post<Wallet>('/wallets/withdraw', payload, { auth: true }),
};

export const billApi = {
  list: (filter?: BillFilter): Promise<Bill[]> =>
    apiClient.get<Bill[]>('/bills', { auth: true, query: filter }),
  create: (payload: CreateBillRequest): Promise<Bill> =>
    apiClient.post<Bill>('/bills', payload, { auth: true }),
};

export const priceApi = {
  current: (symbol: string): Promise<number> =>
    apiClient.get<number>(`/price/current${toQuery({ symbol })}`, { auth: false }),
  history: (symbol: string, limit = 100): Promise<PricePoint[]> =>
    apiClient.get<PricePoint[]>(`/price/history${toQuery({ symbol, limit })}`, { auth: false }),
  /**
   * Dữ liệu thị trường thật (CoinGecko qua backend).
   * Contract: `okbong-backend/docs/contracts/trading-market-data.md`.
   */
  markets: (
    ids: readonly string[] = DEFAULT_MARKET_IDS,
    vs: 'vnd' | 'usd' = 'vnd',
  ): Promise<{ data: MarketCoin[]; meta: ResponseMeta }> =>
    requestWithMeta<MarketCoin[]>(
      `/price/markets${toQuery({ ids: ids.join(','), vs })}`,
      { auth: false },
    ),
};
