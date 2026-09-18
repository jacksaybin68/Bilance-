import { ApiError, apiClient, API_BASE_URL } from './client';

/** Types mirrored from okbong-backend (no `any` in the admin console). */
export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'user';
export type UserStatus = 'active' | 'inactive' | 'banned';

export interface AdminUserDto {
  id: string;
  email: string;
  fullName?: string | null;
  role: AdminRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName?: string;
  role?: AdminRole;
  status?: UserStatus;
}

export interface AdminWalletDto {
  id: string;
  userId: string;
  type: 'e-wallet' | 'bank';
  balance: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface AdminBillDto {
  id: string;
  userId: string;
  amount: number;
  type: string;
  status: string;
  description?: string | null;
  createdAt: string;
}

export interface AdminTransactionDto {
  id: string;
  walletId: string;
  userId: string;
  type: string;
  status: string;
  amount: number;
  feeAmount?: number | null;
  reference?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface AdminPlanDto {
  id: string;
  name: string;
  price: number;
  duration: string;
  features?: string[] | null;
  status: string;
  createdAt: string;
}

export interface AdminSettingDto {
  key: string;
  label: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean';
  updatedAt: string;
}

export interface AdminActivityDto {
  id: string;
  userId: string;
  action: string;
  description?: string | null;
  metadata?: string | null;
  createdAt: string;
  user?: { id: string; email: string; fullName?: string | null } | null;
}

export interface AdminCronJobDto {
  name: string;
  type: 'cron' | 'interval' | 'timeout';
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
}

export interface AdminMarketSymbolDto {
  symbol: string;
  price: number;
  volume: number | null;
  updatedAt: string | null;
}

export type AdminOrderSide = 'buy' | 'sell';
export type AdminOrderStatus = 'pending' | 'win' | 'lose';

export interface AdminOrderDto {
  id: string;
  userId: string;
  pair: string;
  side: AdminOrderSide;
  amount: number;
  price: number;
  type: string;
  status: AdminOrderStatus;
  note?: string | null;
  settledBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AdminChatThreadDto {
  userId: string;
  userEmail?: string;
  fullName?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  lastSenderRole: 'user' | 'admin';
}

export interface AdminChatMessageDto {
  id: string;
  userId: string;
  senderRole: 'user' | 'admin';
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AdminStatsDto {
  users: { total: number; active: number; banned: number };
  wallets: { total: number; active: number };
  bills: { pending: number; paid: number; total: number };
  transactions: number;
  activity: number;
  totalBalance: number;
}

/** `/admin/cards` payload — the backend has no card model yet. */
export interface AdminCardListDto {
  items: AdminCardDto[];
  total: number;
  implemented: boolean;
}

export interface AdminCardDto {
  id: string;
  userId: string;
  cardType: string;
  last4: string;
  expiry: string;
  status: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  userId?: string;
  role?: string;
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query.length > 0 ? `?${query}` : '';
}

function listPath(resource: string, params: ListQuery): string {
  return `/admin/${resource}${buildQuery({ ...params })}`;
}

export const statsApi = {
  dashboard: (signal?: AbortSignal) => apiClient.get<AdminStatsDto>('/admin/stats', signal),
};

export const userApi = {
  list: (params: ListQuery = {}): Promise<PaginatedResult<AdminUserDto>> =>
    apiClient.getWithTotal<AdminUserDto>(listPath('users', params)),
  detail: (id: string) => apiClient.get<AdminUserDto>(`/admin/users/${id}`),
  create: (payload: CreateUserPayload) =>
    apiClient.post<AdminUserDto>('/admin/users', payload),
  update: (id: string, payload: Partial<AdminUserDto>) =>
    apiClient.put<AdminUserDto>(`/admin/users/${id}`, payload),
  ban: (id: string) => apiClient.post<AdminUserDto>(`/admin/users/${id}/ban`),
  unban: (id: string) => apiClient.post<AdminUserDto>(`/admin/users/${id}/unban`),
};

export const walletApi = {
  list: (params: ListQuery = {}): Promise<PaginatedResult<AdminWalletDto>> =>
    apiClient.getWithTotal<AdminWalletDto>(listPath('wallets', params)),
};

export const billApi = {
  list: (params: ListQuery = {}): Promise<PaginatedResult<AdminBillDto>> =>
    apiClient.getWithTotal<AdminBillDto>(listPath('bills', params)),
};

export const paymentApi = {
  list: (params: ListQuery = {}): Promise<PaginatedResult<AdminTransactionDto>> =>
    apiClient.getWithTotal<AdminTransactionDto>(listPath('payments', params)),
  review: (id: string, status: string, description?: string) =>
    apiClient.put<AdminTransactionDto>(`/admin/payments/${id}/review`, { status, description }),
};

export interface AdminPostDto {
  id: string;
  title: string;
  category: 'news' | 'announcement' | 'promotion';
  status: 'draft' | 'published' | 'archived';
  content: string;
  author?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}

export const contentApi = {
  list: (params: ListQuery = {}): Promise<PaginatedResult<AdminPostDto>> =>
    apiClient.getWithTotal<AdminPostDto>(listPath('content', params)),
  create: (payload: Partial<AdminPostDto>) => apiClient.post<AdminPostDto>('/admin/content', payload),
  update: (id: string, payload: Partial<AdminPostDto>) =>
    apiClient.put<AdminPostDto>(`/admin/content/${id}`, payload),
  remove: (id: string) => apiClient.delete<{ deleted: true }>(`/admin/content/${id}`),
};

export const planApi = {
  list: (): Promise<AdminPlanDto[]> => apiClient.get<AdminPlanDto[]>('/admin/plans'),
  create: (payload: { name: string; price: number; duration?: string; features?: string[] }) =>
    apiClient.post<AdminPlanDto>('/admin/plans', payload),
  update: (id: string, payload: Partial<AdminPlanDto>) =>
    apiClient.put<AdminPlanDto>(`/admin/plans/${id}`, payload),
};

export const settingApi = {
  list: (): Promise<AdminSettingDto[]> => apiClient.get<AdminSettingDto[]>('/admin/settings'),
  save: (settings: { key: string; value: string }[]): Promise<AdminSettingDto[]> =>
    apiClient.put<AdminSettingDto[]>('/admin/settings', { settings }),
};

export const activityApi = {
  list: (params: { limit?: number } = {}): Promise<PaginatedResult<AdminActivityDto>> =>
    apiClient.getWithTotal<AdminActivityDto>(`/admin/activity${buildQuery({ ...params })}`),
};

export const cronApi = {
  list: (): Promise<{ jobs: AdminCronJobDto[] }> => apiClient.get('/admin/cron'),
};

export const marketApi = {
  symbols: (): Promise<AdminMarketSymbolDto[]> =>
    apiClient.get<AdminMarketSymbolDto[]>('/admin/market/symbols'),
  setPrice: (symbol: string, price: number, volume?: number) =>
    apiClient.put<unknown>(`/admin/market/symbols/${encodeURIComponent(symbol)}`, { price, volume }),
};

export const cardApi = {
  list: (): Promise<AdminCardListDto> => apiClient.get<AdminCardListDto>('/admin/cards'),
};

export const chatApi = {
  threads: (onlyUnread = false): Promise<PaginatedResult<AdminChatThreadDto>> =>
    apiClient.get<PaginatedResult<AdminChatThreadDto>>(
      `/admin/chat/threads${onlyUnread ? buildQuery({ read: 'false' }) : ''}`,
    ),
  threadMessages: (userId: string): Promise<AdminChatMessageDto[]> =>
    apiClient.get<AdminChatMessageDto[]>(`/admin/chat/threads/${userId}`),
  reply: (userId: string, content: string): Promise<AdminChatMessageDto> =>
    apiClient.post<AdminChatMessageDto>('/admin/chat/reply', { userId, content }),
};

export const orderApi = {
  list: (
    params: {
      page?: number;
      limit?: number;
      status?: string;
      side?: string;
      userId?: string;
    } = {},
  ): Promise<PaginatedResult<AdminOrderDto>> =>
    apiClient.get<PaginatedResult<AdminOrderDto>>(
      `/admin/orders${buildQuery({
        page: params.page,
        limit: params.limit,
        status: params.status,
        side: params.side,
        userId: params.userId,
      })}`,
    ),
  setResult: (id: string, result: 'win' | 'lose', note?: string): Promise<AdminOrderDto> =>
    apiClient.post<AdminOrderDto>(`/admin/orders/${id}/result`, { result, note }),
};

export interface AdminProfileDto {
  id: string;
  email: string;
  role: AdminRole;
}

export const authApi = {
  profile: (accessToken?: string): Promise<AdminProfileDto> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    return fetch(`${API_BASE_URL}/auth/profile`, { headers }).then(async (response) => {
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError('PROFILE_FAILED', response.status);
      return payload as AdminProfileDto;
    });
  },
};
