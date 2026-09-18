import type { TableProps } from 'antd';
import { Typography } from 'antd';
import { useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { useApi } from '@/lib/hooks/useApi';
import { paymentApi, type AdminTransactionDto } from '@/lib/api/endpoints';

/** Payment / wallet transaction history, backed by `/admin/payments`. */
export function PaymentHistory() {
  const { t, locale } = useI18n();

  const load = useCallback((signal: AbortSignal) => paymentApi.list({ limit: 100 }), []);
  const { data, loading, error } = useApi(load);
  const rows = data?.items ?? [];

  const columns: TableProps<AdminTransactionDto>['columns'] = [
    { title: t('table.type'), dataIndex: 'type', key: 'type' },
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    {
      title: t('table.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatCurrency(Number(value), locale),
    },
    {
      title: t('table.details'),
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null) => value ?? '—',
    },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    { title: t('table.createdAt'), dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.payments.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminTransactionDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['userId', 'type', 'reference']}
        filters={[
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'pending', label: t('status.pending') },
              { value: 'processing', label: t('status.processing') },
              { value: 'completed', label: t('status.completed') },
              { value: 'cancelled', label: t('status.cancelled') },
            ],
          },
        ]}
      />
    </div>
  );
}