import type { TableProps } from 'antd';
import { Tag, Typography } from 'antd';
import { useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks/useApi';
import { activityApi, type AdminActivityDto } from '@/lib/api/endpoints';

const ACTION_COLORS: Record<string, string> = {
  login: 'green',
  logout: 'default',
  bill_create: 'purple',
  bill_pay: 'blue',
  wallet_topup: 'cyan',
  wallet_transfer: 'geekblue',
  kyc_submit: 'gold',
  kyc_approve: 'green',
  kyc_reject: 'red',
  user_ban: 'red',
  user_unban: 'orange',
  settings_change: 'magenta',
};

export function ActivityLog() {
  const { t, locale } = useI18n();

  const load = useCallback((signal: AbortSignal) => activityApi.list({ limit: 100 }), []);
  const { data, loading, error } = useApi(load);
  const rows = data?.items ?? [];

  const columns: TableProps<AdminActivityDto>['columns'] = [
    {
      title: t('table.user'),
      dataIndex: 'user',
      key: 'user',
      render: (_value, record) => record.user?.email ?? record.userId,
    },
    {
      title: t('table.action'),
      dataIndex: 'action',
      key: 'action',
      render: (value: string) => <Tag color={ACTION_COLORS[value] ?? 'default'}>{value}</Tag>,
    },
    { title: t('table.details'), dataIndex: 'description', key: 'description', render: (value: string | null) => value ?? '—' },
    {
      title: t('table.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDateTime(value, locale),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.activity.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminActivityDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['action', 'description', 'userId']}
        filters={[
          {
            key: 'action',
            label: t('table.action'),
            options: Object.keys(ACTION_COLORS).map((action) => ({ value: action, label: action })),
          },
        ]}
      />
    </div>
  );
}