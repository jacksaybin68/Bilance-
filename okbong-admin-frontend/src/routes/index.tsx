import type { RouteObject } from 'react-router-dom';
import { RequireRole } from '@/components/RequireRole';
import { AdminLayout } from '@/layouts/AdminLayout';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { UserManagement } from '@/pages/UserManagement';
import { BannedUsers } from '@/pages/BannedUsers';
import { WalletsBanks } from '@/pages/WalletsBanks';
import { CardManagement } from '@/pages/CardManagement';
import { BillManagement } from '@/pages/BillManagement';
import { PaymentHistory } from '@/pages/PaymentHistory';
import { PlanManagement } from '@/pages/PlanManagement';
import { SettingsPage } from '@/pages/Settings';
import { ActivityLog } from '@/pages/ActivityLog';
import { CronJobs } from '@/pages/CronJobs';
import { Transactions } from '@/pages/Transactions';
import { ChatManagement } from '@/pages/ChatManagement';
import { OrderManagement } from '@/pages/OrderManagement';

/** Every admin screen is wrapped by the role guard (admin / super_admin). */
function guarded(element: React.ReactNode, roles?: Parameters<typeof RequireRole>[0]['roles']) {
  return <RequireRole roles={roles}>{element}</RequireRole>;
}

export const adminRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: guarded(<DashboardPage />) },
      { path: 'users', element: guarded(<UserManagement />) },
      { path: 'banned', element: guarded(<BannedUsers />) },
      { path: 'wallets', element: guarded(<WalletsBanks />) },
      { path: 'cards', element: guarded(<CardManagement />) },
      { path: 'bills', element: guarded(<BillManagement />) },
      { path: 'payments', element: guarded(<PaymentHistory />) },
      { path: 'transactions', element: guarded(<Transactions />) },
      { path: 'orders', element: guarded(<OrderManagement />) },
      { path: 'chat', element: guarded(<ChatManagement />) },
      { path: 'plans', element: guarded(<PlanManagement />) },
      { path: 'settings', element: guarded(<SettingsPage />, ['super_admin']) },
      { path: 'activity', element: guarded(<ActivityLog />) },
      { path: 'cron', element: guarded(<CronJobs />) },
    ],
  },
];
