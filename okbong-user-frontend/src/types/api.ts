/**
 * Shared API types. These mirror the DTOs exposed by okbong-backend so the
 * frontend never has to fall back to `any` when talking to the API.
 */

export type Role = 'super_admin' | 'admin' | 'moderator' | 'user';

export type UserStatus = 'active' | 'inactive' | 'banned';

export type WalletType = 'e-wallet' | 'bank';

export type WalletStatus = 'active' | 'pending' | 'verified' | 'blocked';

export type BillType = 'recurring' | 'payment' | 'charging';

export type BillStatus = 'pending' | 'paid' | 'cancelled';

export interface User {
  id: string;
  email: string;
  fullName?: string | null;
  role?: Role;
  status?: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  type: WalletType;
  balance: number;
  currency: string;
  status: WalletStatus;
  createdAt: string;
}

export type TransactionType = 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out' | 'fee' | 'adjustment';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface TransactionQuery {
  type?: TransactionType;
  status?: TransactionStatus;
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
  amount: number;
  type: BillType;
  status: BillStatus;
  content?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PricePoint {
  symbol: string;
  price: number;
  recordedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface TwoFaChallengeResult {
  requires2FA: boolean;
  sessionId: string;
  pendingSetup: boolean;
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
  amount: number;
  type: BillType;
  description?: string;
}

export interface WalletMutationRequest {
  userId: string;
  amount: number;
  type: WalletType;
}

export interface BillFilter {
  status?: BillStatus;
  type?: BillType;
  page?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

/** Shape returned by okbong-backend's global exception filter. */
export interface ApiErrorPayload {
  message: string | string[];
  details?: Record<string, unknown>;
}

export const USER_ROLES: readonly Role[] = ['super_admin', 'admin', 'moderator', 'user'];

export function isUserRole(value: unknown): value is Role {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}
