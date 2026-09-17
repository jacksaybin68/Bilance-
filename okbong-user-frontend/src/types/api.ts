/**
 * Shared API types. These mirror the DTOs exposed by okbong-backend so the
 * frontend never has to fall back to `any` when talking to the API.
 */

export type Role = 'super_admin' | 'admin' | 'moderator' | 'user';

export type UserStatus = 'active' | 'inactive' | 'banned';

export type WalletType = 'e-wallet' | 'bank';

export type WalletStatus = 'active' | 'pending' | 'verified' | 'blocked';

export type BillType = 'transfer' | 'e-wallet' | 'fluctuation' | 'priority';

export type BillStatus = 'draft' | 'pending' | 'processing' | 'completed' | 'cancelled';

export interface User {
  id: string;
  email: string;
  fullName?: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  type: WalletType;
  balance: number;
  currency: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out' | 'fee' | 'adjustment';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface Transaction {
  id: string;
  walletId: string;
  userId: string;
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
}

export interface TransactionQuery {
  walletType?: WalletType;
  walletId?: string;
  userId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  minAmount?: number;
  maxAmount?: number;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
}

export interface Bill {
  id: string;
  userId: string;
  type: BillType;
  amount: number;
  content: string;
  status: BillStatus;
  createdAt: string;
}

export interface PricePoint {
  symbol: string;
  price: number;
  recordedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number | string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface CreateBillRequest {
  type: BillType;
  content: string;
  reference?: string;
}

export interface WalletMutationRequest {
  userId: string;
  amount: number;
  type?: WalletType;
}

export interface BillFilter {
  status?: BillStatus;
  type?: BillType;
}

/** ── Support chat (okbong-backend `src/chat`) ─────────────────────── */

export type ConversationStatus = 'open' | 'pending' | 'closed';

export type ConversationTopic = 'general' | 'deposit' | 'withdraw' | 'order' | 'kyc' | 'technical';

export type MessageKind = 'text' | 'image' | 'file';

export type MessageSenderRole = 'user' | 'admin' | 'system';

export interface ChatConversation {
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
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  kind: MessageKind;
  body: string;
  attachment?: string | null;
  readByAdmin: boolean;
  readByUser: boolean;
  createdAt: string;
}

export interface PaginatedMessages {
  items: ChatMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SendMessageRequest {
  body: string;
  kind?: MessageKind;
  attachment?: string;
}

/** ── Orders (okbong-backend `src/order`) ──────────────────────────── */

export type OrderSide = 'buy' | 'sell';

export type OrderType = 'LIMIT' | 'MARKET';

export type OrderStatus =
  | 'PENDING'
  | 'MATCHING'
  | 'MATCHED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface Order {
  id: string;
  userId: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price: number;
  filledAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderRequest {
  pair: string;
  side: OrderSide;
  amount: number;
  price: number;
  type?: OrderType;
}

export interface OrderFilter {
  status?: OrderStatus;
  pair?: string;
  side?: OrderSide;
  page?: number;
  limit?: number;
}

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'MATCHING',
  'MATCHED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
];

export const CONVERSATION_TOPICS: readonly ConversationTopic[] = [
  'general',
  'deposit',
  'withdraw',
  'order',
  'kyc',
  'technical',
];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Shape returned by okbong-backend's global exception filter. */
export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}

export const BILL_TYPES: readonly BillType[] = [
  'transfer',
  'e-wallet',
  'fluctuation',
  'priority',
];

export const USER_ROLES: readonly Role[] = ['super_admin', 'admin', 'moderator', 'user'];

export function isBillType(value: unknown): value is BillType {
  return typeof value === 'string' && (BILL_TYPES as readonly string[]).includes(value);
}

export function isUserRole(value: unknown): value is Role {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}