import type { TableProps } from 'antd';
import { Button, Tag, Typography } from 'antd';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { DEMO_CARDS, type CardRow } from './demoData';

export function CardManagement() {
  const { t } = useI18n();

  const columns: TableProps<CardRow>['columns'] = [
    {
      title: t('table.cardType'),
      dataIndex: 'cardType',
      key: 'cardType',
      render: (value: string) => <Tag color="blue">{value.toUpperCase()}</Tag>,
    },
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    { title: t('table.last4'), dataIndex: 'last4', key: 'last4' },
    { title: t('table.expiry'), dataIndex: 'expiry', key: 'expiry' },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: () => <Button size="small" type="primary">{t('common.manage')}</Button>,
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.cards.title')}
      </Typography.Title>

      <DataTable<CardRow>
        columns={columns}
        rows={DEMO_CARDS}
        rowKey="id"
        searchKeys={['userId', 'last4']}
        filters={[
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'active', label: t('status.active') },
              { value: 'verified', label: t('status.verified') },
              { value: 'pending', label: t('status.pending') },
            ],
          },
        ]}
      />
    </div>
  );
}
