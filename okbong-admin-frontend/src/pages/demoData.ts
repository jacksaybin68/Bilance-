/**
 * Typed demo rows for admin screens whose backend endpoints do not exist yet
 * (cards, plans, settings, activity log, cron jobs, payment history). They are
 * deliberately isolated here so replacing them with API calls is a one-file change.
 */
import type { AdminBillDto, AdminUserDto, AdminWalletDto } from '@/lib/api/endpoints';

export interface BannedUserRow {
  id: string;
  username: string;
  email: string;
  reason: string;
  bannedAt: string;
  duration: string;
}

export interface CardRow {
  id: string;
  userId: string;
  cardType: string;
  last4: string;
  expiry: string;
  status: string;
}

export interface PaymentRow {
  id: string;
  userId: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
}

export interface PlanRow {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  status: string;
}

export interface SettingRow {
  id: string;
  key: string;
  label: string;
  value: string | boolean;
}

export interface ActivityRow {
  id: string;
  user: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface CronJobRow {
  id: string;
  name: string;
  type: string;
  status: string;
  lastRun: string;
  nextRun: string;
}

export const DEMO_USERS: AdminUserDto[] = [
  { id: 'usr-001', email: 'john@test.com', fullName: 'John Doe', role: 'user', status: 'active', createdAt: '2026-01-15T09:00:00Z', updatedAt: '2026-01-15T09:00:00Z' },
  { id: 'usr-002', email: 'jane@test.com', fullName: 'Jane Smith', role: 'admin', status: 'active', createdAt: '2026-01-14T09:00:00Z', updatedAt: '2026-01-14T09:00:00Z' },
  { id: 'usr-003', email: 'bob@test.com', fullName: 'Bob Wilson', role: 'moderator', status: 'banned', createdAt: '2026-01-13T09:00:00Z', updatedAt: '2026-01-13T09:00:00Z' },
];

export const DEMO_WALLETS: AdminWalletDto[] = [
  { id: 'wal-001', userId: 'usr-001', type: 'e-wallet', balance: 500.5, currency: 'BDSD', status: 'active', createdAt: '2026-01-15T09:00:00Z' },
  { id: 'wal-002', userId: 'usr-002', type: 'bank', balance: 1250, currency: 'USD', status: 'verified', createdAt: '2026-01-14T09:00:00Z' },
  { id: 'wal-003', userId: 'usr-003', type: 'e-wallet', balance: 25, currency: 'BDSD', status: 'pending', createdAt: '2026-01-13T09:00:00Z' },
];

export const DEMO_BILLS: AdminBillDto[] = [
  { id: 'bil-001', userId: 'usr-001', type: 'transfer', description: 'VCB transfer', status: 'completed', createdAt: '2026-01-15T09:00:00Z' },
  { id: 'bil-002', userId: 'usr-002', type: 'e-wallet', description: 'Wallet top-up', status: 'pending', createdAt: '2026-01-14T09:00:00Z' },
  { id: 'bil-003', userId: 'usr-003', type: 'fluctuation', description: 'BDSD price order', status: 'processing', createdAt: '2026-01-13T09:00:00Z' },
  { id: 'bil-004', userId: 'usr-001', type: 'priority', description: 'Priority settlement', status: 'completed', createdAt: '2026-01-12T09:00:00Z' },
];

export const DEMO_BANNED_USERS: BannedUserRow[] = [
  { id: 'ban-001', username: 'johndoe', email: 'john@test.com', reason: 'Suspicious activity', bannedAt: '2026-01-15', duration: '30 days' },
  { id: 'ban-002', username: 'janesmith', email: 'jane@test.com', reason: 'Violation of TOS', bannedAt: '2026-01-10', duration: 'Permanent' },
  { id: 'ban-003', username: 'bobwilson', email: 'bob@test.com', reason: 'Multiple complaints', bannedAt: '2026-01-08', duration: '7 days' },
];

export const DEMO_CARDS: CardRow[] = [
  { id: 'card-001', userId: 'usr-001', cardType: 'visa', last4: '4242', expiry: '12/28', status: 'active' },
  { id: 'card-002', userId: 'usr-002', cardType: 'mastercard', last4: '5555', expiry: '06/26', status: 'verified' },
  { id: 'card-003', userId: 'usr-003', cardType: 'visa', last4: '4444', expiry: '03/27', status: 'pending' },
];

export const DEMO_PAYMENTS: PaymentRow[] = [
  { id: 'pay-001', userId: 'usr-001', amount: 100, type: 'deposit', status: 'completed', createdAt: '2026-01-15T14:30:00Z' },
  { id: 'pay-002', userId: 'usr-002', amount: 50, type: 'withdraw', status: 'pending', createdAt: '2026-01-14T10:15:00Z' },
  { id: 'pay-003', userId: 'usr-003', amount: 200, type: 'bill payment', status: 'approved', createdAt: '2026-01-13T16:45:00Z' },
  { id: 'pay-004', userId: 'usr-004', amount: 75, type: 'deposit', status: 'rejected', createdAt: '2026-01-12T09:30:00Z' },
];

export const DEMO_PLANS: PlanRow[] = [
  { id: 'plan-001', name: 'Basic', price: 9.99, duration: '1 month', features: ['1 bill/month'], status: 'active' },
  { id: 'plan-002', name: 'Pro', price: 19.99, duration: '1 month', features: ['Unlimited bills', 'Priority support'], status: 'active' },
  { id: 'plan-003', name: 'Enterprise', price: 99.99, duration: '1 month', features: ['Dedicated support', 'Custom integration'], status: 'active' },
];

export const DEMO_SETTINGS: SettingRow[] = [
  { id: 'set-001', key: 'system_name', label: 'System Name', value: 'NexTrading' },
  { id: 'set-002', key: 'support_email', label: 'Support Email', value: 'support@nextrading.com' },
  { id: 'set-003', key: 'maintenance_mode', label: 'Maintenance Mode', value: false },
  { id: 'set-004', key: 'email_notifications', label: 'Email Notifications', value: true },
  { id: 'set-005', key: 'default_currency', label: 'Default Currency', value: 'BDSD' },
];

export const DEMO_ACTIVITY: ActivityRow[] = [
  { id: 'act-001', user: 'johndoe', action: 'Login', details: 'Successful login from IP 192.168.1.1', createdAt: '2026-01-15T14:30:00Z' },
  { id: 'act-002', user: 'janesmith', action: 'Deposit', details: 'Deposited 50.00 BDSD', createdAt: '2026-01-14T10:15:00Z' },
  { id: 'act-003', user: 'bobwilson', action: 'Bill Creation', details: 'Created bill #12345', createdAt: '2026-01-13T16:45:00Z' },
  { id: 'act-004', user: 'admin', action: 'User Ban', details: 'Banned user johndoe', createdAt: '2026-01-12T09:30:00Z' },
];

export interface TransactionRow {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  note: string;
  createdAt: string;
}

export interface PostRow {
  id: string;
  title: string;
  category: 'news' | 'announcement' | 'promotion';
  status: 'draft' | 'published' | 'archived';
  author: string;
  publishedAt: string | null;
  createdAt: string;
  content: string;
}

export interface CoinRow {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceBdsd: number;
  change24h: number;
  status: 'active' | 'inactive' | 'delisted';
  category: string;
  updatedAt: string;
}

export const DEMO_TRANSACTIONS: TransactionRow[] = [
  { id: 'txn-001', userId: 'usr-001', type: 'deposit', amount: 500, currency: 'BDSD', method: 'VCB Bank', status: 'pending', note: 'Nạp tiền qua VCB', createdAt: '2026-01-15T14:30:00Z' },
  { id: 'txn-002', userId: 'usr-002', type: 'withdrawal', amount: 200, currency: 'BDSD', method: 'Momo', status: 'pending', note: 'Rút về Momo', createdAt: '2026-01-14T10:15:00Z' },
  { id: 'txn-003', userId: 'usr-003', type: 'deposit', amount: 1000, currency: 'BDSD', method: 'Techcombank', status: 'approved', note: 'Nạp tiền TCB', createdAt: '2026-01-13T16:45:00Z' },
  { id: 'txn-004', userId: 'usr-004', type: 'withdrawal', amount: 75, currency: 'USD', method: 'ACB Bank', status: 'rejected', note: 'Rút USD – từ chối do thiếu KYC', createdAt: '2026-01-12T09:30:00Z' },
  { id: 'txn-005', userId: 'usr-001', type: 'deposit', amount: 250, currency: 'BDSD', method: 'ZaloPay', status: 'processing', note: 'Nạp ZaloPay đang xử lý', createdAt: '2026-01-11T08:00:00Z' },
];

export const DEMO_POSTS: PostRow[] = [
  { id: 'post-001', title: 'Thông báo bảo trì hệ thống tháng 1', category: 'announcement', status: 'published', author: 'admin', publishedAt: '2026-01-14T08:00:00Z', createdAt: '2026-01-13T16:00:00Z', content: 'Hệ thống sẽ tạm ngừng từ 2:00 - 4:00 sáng ngày 20/1/2026 để nâng cấp.' },
  { id: 'post-002', title: 'Khuyến mãi nạp tiền đầu năm 2026', category: 'promotion', status: 'published', author: 'moderator', publishedAt: '2026-01-10T09:00:00Z', createdAt: '2026-01-09T15:00:00Z', content: 'Nạp từ 500 BDSD tặng 50 BDSD bonus, áp dụng từ 1-31/1/2026.' },
  { id: 'post-003', title: 'Ra mắt tính năng giao dịch nhanh', category: 'news', status: 'draft', author: 'admin', publishedAt: null, createdAt: '2026-01-15T10:00:00Z', content: 'Tính năng "giao dịch nhanh" cho phép xử lý lệnh trong vòng 5 giây.' },
  { id: 'post-004', title: 'Cập nhật điều khoản sử dụng', category: 'announcement', status: 'archived', author: 'super_admin', publishedAt: '2025-12-01T00:00:00Z', createdAt: '2025-11-30T12:00:00Z', content: 'Điều khoản sử dụng phiên bản 2.0 chính thức có hiệu lực từ 1/12/2025.' },
];

export const DEMO_COINS: CoinRow[] = [
  { id: 'coin-001', symbol: 'BDSD', name: 'BDSD Coin', priceUsd: 1.25, priceBdsd: 1, change24h: 2.5, status: 'active', category: 'stablecoin', updatedAt: '2026-01-15T14:00:00Z' },
  { id: 'coin-002', symbol: 'BTC', name: 'Bitcoin', priceUsd: 45000, priceBdsd: 36000, change24h: -1.2, status: 'active', category: 'crypto', updatedAt: '2026-01-15T14:00:00Z' },
  { id: 'coin-003', symbol: 'ETH', name: 'Ethereum', priceUsd: 2500, priceBdsd: 2000, change24h: 3.8, status: 'active', category: 'crypto', updatedAt: '2026-01-15T14:00:00Z' },
  { id: 'coin-004', symbol: 'USDT', name: 'Tether', priceUsd: 1.0, priceBdsd: 0.8, change24h: 0.01, status: 'active', category: 'stablecoin', updatedAt: '2026-01-15T14:00:00Z' },
  { id: 'coin-005', symbol: 'OKB', name: 'OKB Token', priceUsd: 0.5, priceBdsd: 0.4, change24h: -3.1, status: 'inactive', category: 'utility', updatedAt: '2026-01-14T10:00:00Z' },
];

export const DEMO_CRON_JOBS: CronJobRow[] = [
  { id: 'cron-001', name: 'Daily Price Update', type: 'price', status: 'running', lastRun: '2026-01-15T14:30:00Z', nextRun: '2026-01-15T15:00:00Z' },
  { id: 'cron-002', name: 'Weekly Report', type: 'report', status: 'completed', lastRun: '2026-01-08T00:00:00Z', nextRun: '2026-01-15T00:00:00Z' },
  { id: 'cron-003', name: 'Monthly Cleanup', type: 'cleanup', status: 'pending', lastRun: '2025-12-01T00:00:00Z', nextRun: '2026-02-01T00:00:00Z' },
  { id: 'cron-004', name: 'Monthly Bill Export', type: 'export', status: 'completed', lastRun: '2026-01-12T00:00:00Z', nextRun: '2026-02-01T00:00:00Z' },
];
