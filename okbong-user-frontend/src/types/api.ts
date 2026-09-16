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
}

export interface Bill {
  id: string;
  userId: string;
  type: BillType;
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