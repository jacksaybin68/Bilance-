import type { TableProps } from 'antd';
import { Tag, Typography } from 'antd';
import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { DEMO_ACTIVITY, type ActivityRow } from './demoData';

const ACTION_COLORS: Record<string, string> = {
  Login: 'green',
  Deposit: 'blue',
  'Bill Creation': 'purple',
  'User Ban': 'red',
};

export function ActivityLog() {
  const { t, locale } = useI18n();
  const [rows] = useState(DEMO_ACTIVITY);

  const columns: TableProps<ActivityRow>['columns'] = [
    { title: t('table.user'), dataIndex: 'user', key: 'user' },
    {
      title: t('table.action'),
      dataIndex: 'action',
      key: 'action',
      render: (value: string) => <Tag color={ACTION_COLORS[value] ?? 'default'}>{value}</Tag>,
    },
    { title: t('table.details'), dataIndex: 'details', key: 'details' },
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

      <DataTable<ActivityRow>
        columns={columns}
        rows={rows}
        rowKey="id"
        searchKeys={['user', 'action', 'details']}
        filters={[
          {
            key: 'action',
            label: t('table.action'),
            options: ['Login', 'Deposit', 'Bill Creation', 'User Ban'].map((action) => ({
              value: action,
              label: action,
            })),
          },
        ]}
      />
    </div>
  );
}
