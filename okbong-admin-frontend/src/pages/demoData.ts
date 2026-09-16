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
  { id: 'bil-001', userId: 'usr-001', type: 'transfer', content: 'VCB transfer', status: 'completed', createdAt: '2026-01-15T09:00:00Z' },
  { id: 'bil-002', userId: 'usr-002', type: 'e-wallet', content: 'Wallet top-up', status: 'pending', createdAt: '2026-01-14T09:00:00Z' },
  { id: 'bil-003', userId: 'usr-003', type: 'fluctuation', content: 'BDSD price order', status: 'processing', createdAt: '2026-01-13T09:00:00Z' },
  { id: 'bil-004', userId: 'usr-001', type: 'priority', content: 'Priority settlement', status: 'completed', createdAt: '2026-01-12T09:00:00Z' },
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
  { id: 'set-001', key: 'system_name', label: 'System Name', value: 'OKBong' },
  { id: 'set-002', key: 'support_email', label: 'Support Email', value: 'support@okbong.com' },
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

export const DEMO_CRON_JOBS: CronJobRow[] = [
  { id: 'cron-001', name: 'Daily Price Update', type: 'price', status: 'running', lastRun: '2026-01-15T14:30:00Z', nextRun: '2026-01-15T15:00:00Z' },
  { id: 'cron-002', name: 'Weekly Report', type: 'report', status: 'completed', lastRun: '2026-01-08T00:00:00Z', nextRun: '2026-01-15T00:00:00Z' },
  { id: 'cron-003', name: 'Monthly Cleanup', type: 'cleanup', status: 'pending', lastRun: '2025-12-01T00:00:00Z', nextRun: '2026-02-01T00:00:00Z' },
  { id: 'cron-004', name: 'Monthly Bill Export', type: 'export', status: 'completed', lastRun: '2026-01-12T00:00:00Z', nextRun: '2026-02-01T00:00:00Z' },
];
