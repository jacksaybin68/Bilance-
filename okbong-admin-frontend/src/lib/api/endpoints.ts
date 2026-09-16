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
