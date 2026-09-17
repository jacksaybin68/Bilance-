import type {
  AuthTokens,
  Bill,
  BillFilter,
  ChatConversation,
  ChatMessage,
  CreateBillRequest,
  CreateOrderRequest,
  LoginRequest,
  Order,
  OrderFilter,
  PaginatedMessages,
  PaginatedOrders,
  PaginatedTransactions,
  PricePoint,
  RegisterRequest,
  SendMessageRequest,
  User,
  Wallet,
  WalletMutationRequest,
} from '@/types/api';
import { apiClient } from './client';

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });

  const query = search.toString();
  return query.length > 0 ? `?${query}` : '';
}

export const authApi = {
  login: (payload: LoginRequest): Promise<AuthTokens> =>
    apiClient.post<AuthTokens>('/auth/login', payload, { auth: false }),
  register: (payload: RegisterRequest): Promise<User> =>
    apiClient.post<User>('/users', payload, { auth: false }),
  refresh: (refreshToken: string): Promise<AuthTokens> =>
    apiClient.post<AuthTokens>('/auth/refresh', { refreshToken }, { auth: false }),
};

export const userApi = {
  me: (): Promise<User> => apiClient.get<User>('/users/me'),
  list: (params: { page?: number; limit?: number; search?: string } = {}): Promise<User[]> =>
    apiClient.get<User[]>(`/users${toQuery(params)}`),
  update: (id: string, payload: Partial<Pick<User, 'email' | 'fullName' | 'role' | 'status'>>): Promise<User> =>
    apiClient.put<User>(`/users/${id}`, payload),
};

export const walletApi = {
  listMine: (): Promise<Wallet[]> => apiClient.get<Wallet[]>('/wallet'),
  byUser: (userId: string): Promise<Wallet[]> => apiClient.get<Wallet[]>(`/wallet/${userId}`),
  deposit: (payload: WalletMutationRequest): Promise<Wallet> =>
    apiClient.post<Wallet>('/wallet/deposit', payload),
  withdraw: (payload: WalletMutationRequest): Promise<Wallet> =>
    apiClient.post<Wallet>('/wallet/withdraw', payload),
  transactions: (
    walletId: string,
    params: {
      type?: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out' | 'fee' | 'adjustment';
      status?: 'pending' | 'completed' | 'failed' | 'reversed';
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<PaginatedTransactions> =>
    apiClient.get<PaginatedTransactions>(
      `/wallet/${walletId}/transactions${toQuery({
        type: params.type,
        status: params.status,
        limit: params.limit,
        offset: params.offset,
      })}`,
    ),
};

export const billApi = {
  list: (filter: BillFilter = {}): Promise<Bill[]> =>
    apiClient.get<Bill[]>(`/bill${toQuery({ status: filter.status, type: filter.type })}`),
  create: (payload: CreateBillRequest): Promise<Bill> => apiClient.post<Bill>('/bill', payload),
  detail: (id: string): Promise<Bill> => apiClient.get<Bill>(`/bill/${id}`),
};

export const priceApi = {
  current: (symbol: string): Promise<number> =>
    apiClient.get<number>(`/price/current${toQuery({ symbol })}`, { auth: false }),
  history: (symbol: string, limit = 100): Promise<PricePoint[]> =>
    apiClient.get<PricePoint[]>(`/price/history${toQuery({ symbol, limit })}`, { auth: false }),
};

export const chatApi = {
  /** Returns the user's open support thread, creating it on first contact. */
  openConversation: (payload: { subject?: string; topic?: string } = {}): Promise<ChatConversation> =>
    apiClient.post<ChatConversation>('/chat/conversations', payload),
  conversations: (): Promise<ChatConversation[]> =>
    apiClient.get<ChatConversation[]>('/chat/conversations'),
  unread: (): Promise<{ unreadMessages: number }> =>
    apiClient.get<{ unreadMessages: number }>('/chat/unread'),
  messages: (conversationId: string, params: { limit?: number; since?: string } = {}): Promise<PaginatedMessages> =>
    apiClient.get<PaginatedMessages>(
      `/chat/conversations/${conversationId}/messages${toQuery({ limit: params.limit, since: params.since })}`,
    ),
  send: (conversationId: string, payload: SendMessageRequest): Promise<ChatMessage> =>
    apiClient.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, payload),
  markRead: (conversationId: string): Promise<ChatConversation> =>
    apiClient.post<ChatConversation>(`/chat/conversations/${conversationId}/read`, {}),
};

export const orderApi = {
  listMine: (filter: OrderFilter = {}): Promise<PaginatedOrders> =>
    apiClient.get<PaginatedOrders>(
      `/orders${toQuery({
        status: filter.status,
        pair: filter.pair,
        side: filter.side,
        page: filter.page,
        limit: filter.limit,
      })}`,
    ),
  create: (payload: CreateOrderRequest): Promise<Order> =>
    apiClient.post<Order>('/orders', payload),
  detail: (id: string): Promise<Order> => apiClient.get<Order>(`/orders/${id}`),
  cancel: (id: string): Promise<Order> => apiClient.post<Order>(`/orders/${id}/cancel`, {}),
};