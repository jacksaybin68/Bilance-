import type { TableProps } from 'antd';
import { Button, Typography } from 'antd';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { DEMO_PAYMENTS, type PaymentRow } from './demoData';

export function PaymentHistory() {
  const { t, locale } = useI18n();

  const columns: TableProps<PaymentRow>['columns'] = [
    { title: t('table.type'), dataIndex: 'type', key: 'type' },
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    {
      title: t('table.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatCurrency(value, locale),
    },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    { title: t('table.createdAt'), dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: () => <Button size="small" type="primary">{t('common.details')}</Button>,
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.payments.title')}
      </Typography.Title>

      <DataTable<PaymentRow>
        columns={columns}
        rows={DEMO_PAYMENTS}
        rowKey="id"
        searchKeys={['userId', 'type']}
        filters={[
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'completed', label: t('status.completed') },
              { value: 'pending', label: t('status.pending') },
              { value: 'approved', label: t('status.approved') },
              { value: 'rejected', label: t('status.rejected') },
            ],
          },
        ]}
      />
    </div>
  );
}
