import { apiClient } from './client';

/** Types mirrored from okbong-backend (no `any` in the admin console). */
export interface AdminUserDto {
  id: string;
  email: string;
  fullName?: string | null;
  role: 'super_admin' | 'admin' | 'moderator' | 'user';
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  updatedAt: string;
}

export interface AdminWalletDto {
  id: string;
  userId: string;
  type: 'e-wallet' | 'bank';
  balance: number;
  currency: string;
  status: 'active' | 'pending' | 'verified' | 'blocked';
  createdAt: string;
}

export interface AdminBillDto {
  id: string;
  userId: string;
  type: 'transfer' | 'e-wallet' | 'fluctuation' | 'priority';
  content: string;
  status: 'draft' | 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query.length > 0 ? `?${query}` : '';
}

export const userApi = {
  list: (params: { page?: number; limit?: number; search?: string } = {}): Promise<
    PaginatedResult<AdminUserDto>
  > => apiClient.getWithTotal<AdminUserDto>(`/users${buildQuery(params)}`),
  detail: (id: string) => apiClient.get<AdminUserDto>(`/users/${id}`),
  update: (id: string, payload: Partial<AdminUserDto>) =>
    apiClient.put<AdminUserDto>(`/users/${id}`, payload),
};

export const walletApi = {
  list: () => apiClient.get<AdminWalletDto[]>('/wallet'),
};

export const billApi = {
  list: (params: { status?: string; type?: string } = {}): Promise<
    PaginatedResult<AdminBillDto>
  > => apiClient.getWithTotal<AdminBillDto>(`/bill${buildQuery(params)}`),
  detail: (id: string) => apiClient.get<AdminBillDto>(`/bill/${id}`),
};

/** ── Transactions (okbong-backend `src/admin/services/transaction-management.service.ts`) ── */

export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'transfer_in'
  | 'transfer_out'
  | 'fee'
  | 'adjustment';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface AdminTransactionDto {
  id: string;
  walletId: string;
  userId?: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  feeAmount?: number | null;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail?: string | null;
  walletType?: string | null;
  currency?: string | null;
}

export interface AdminTransactionFilter {
  userId?: string;
  walletId?: string;
  walletType?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  minAmount?: number;
  maxAmount?: number;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransactionStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  reversed: number;
  totalDeposit: number;
  totalWithdraw: number;
  netFlow: number;
}

export const transactionApi = {
  list: (params: AdminTransactionFilter = {}): Promise<PaginatedResult<AdminTransactionDto>> =>
    apiClient.get<PaginatedResult<AdminTransactionDto>>(
      `/admin/transactions${buildQuery(params as Record<string, string | number | undefined>)}`,
    ),
  detail: (id: string) => apiClient.get<AdminTransactionDto>(`/admin/transactions/${id}`),
  stats: () => apiClient.get<TransactionStats>('/admin/transactions/stats'),
  pendingCount: () => apiClient.get<{ pending: number }>('/admin/transactions/pending-count'),
  approve: (id: string, reason?: string) =>
    apiClient.post<AdminTransactionDto>(`/admin/transactions/${id}/approve`, { reason }),
  reject: (id: string, reason?: string) =>
    apiClient.post<AdminTransactionDto>(`/admin/transactions/${id}/reject`, { reason }),
  reverse: (id: string, reason?: string) =>
    apiClient.post<AdminTransactionDto>(`/admin/transactions/${id}/reverse`, { reason }),
  adjust: (payload: { walletId: string; amount: number; reason: string }) =>
    apiClient.post<{ wallet: AdminWalletDto; transaction: AdminTransactionDto }>(
      '/admin/transactions/adjust',
      payload,
    ),
};

/** ── Support chat (okbong-backend `src/chat`) ─────────────────────── */

export type ConversationStatus = 'open' | 'pending' | 'closed';

export type ConversationTopic = 'general' | 'deposit' | 'withdraw' | 'order' | 'kyc' | 'technical';

export type MessageSenderRole = 'user' | 'admin' | 'system';

export interface AdminConversationDto {
  id: string;
  userId: string;
  subject: string;
  topic: ConversationTopic;
  status: ConversationStatus;
  assignedTo?: string | null;
  unreadForAdmin: number;
  unreadForUser: number;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail?: string | null;
  lastMessage?: string | null;
}

export interface AdminChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  kind: 'text' | 'image' | 'file';
  body: string;
  attachment?: string | null;
  readByAdmin: boolean;
  readByUser: boolean;
  createdAt: string;
}

export interface ChatSummary {
  open: number;
  pending: number;
  closed: number;
  unreadMessages: number;
}

export const chatAdminApi = {
  conversations: (params: { status?: ConversationStatus; topic?: ConversationTopic; search?: string; page?: number; limit?: number } = {}) =>
    apiClient.get<PaginatedResult<AdminConversationDto>>(
      `/admin/chat/conversations${buildQuery(params as Record<string, string | number | undefined>)}`,
    ),
  summary: () => apiClient.get<ChatSummary>('/admin/chat/summary'),
  detail: (id: string) => apiClient.get<AdminConversationDto>(`/admin/chat/conversations/${id}`),
  messages: (id: string, params: { limit?: number } = {}) =>
    apiClient.get<PaginatedResult<AdminChatMessageDto>>(
      `/admin/chat/conversations/${id}/messages${buildQuery(params)}`,
    ),
  reply: (id: string, body: string) =>
    apiClient.post<AdminChatMessageDto>(`/admin/chat/conversations/${id}/messages`, { body }),
  setStatus: (id: string, status: ConversationStatus) =>
    apiClient.patch<AdminConversationDto>(`/admin/chat/conversations/${id}/status`, { status }),
  assign: (id: string, assignedTo: string | null) =>
    apiClient.patch<AdminConversationDto>(`/admin/chat/conversations/${id}/assignment`, { assignedTo }),
  markRead: (id: string) =>
    apiClient.post<AdminConversationDto>(`/admin/chat/conversations/${id}/read`, {}),
};

/** ── Orders (okbong-backend `src/order`) ──────────────────────────── */

export type OrderSide = 'buy' | 'sell';

export type OrderStatus =
  | 'PENDING'
  | 'MATCHING'
  | 'MATCHED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface AdminOrderDto {
  id: string;
  userId: string;
  pair: string;
  side: OrderSide;
  type: 'LIMIT' | 'MARKET';
  amount: number;
  price: number;
  filledAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  userEmail?: string | null;
}

export interface OrderStats {
  total: number;
  byStatus: Record<OrderStatus, number>;
  bySide: { buy: number; sell: number };
  filledVolume: number;
}

export const orderAdminApi = {
  list: (params: { status?: OrderStatus; pair?: string; side?: OrderSide; userId?: string; page?: number; limit?: number } = {}) =>
    apiClient.get<PaginatedResult<AdminOrderDto>>(
      `/admin/orders${buildQuery(params as Record<string, string | number | undefined>)}`,
    ),
  stats: () => apiClient.get<OrderStats>('/admin/orders/stats'),
  detail: (id: string) => apiClient.get<AdminOrderDto>(`/admin/orders/${id}`),
  /** Admin override of the order result. */
  setResult: (id: string, payload: { status: OrderStatus; filledAmount?: number; price?: number; reason?: string }) =>
    apiClient.post<AdminOrderDto>(`/admin/orders/${id}/result`, payload),
  cancel: (id: string, reason?: string) =>
    apiClient.post<AdminOrderDto>(`/admin/orders/${id}/cancel`, { reason }),
};
