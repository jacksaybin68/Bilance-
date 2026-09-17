import type { TableProps } from 'antd';
import { Button, Modal, Tag, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { billApi, type AdminBillDto } from '@/lib/api/endpoints';
import { useApi } from '@/lib/hooks/useApi';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';

export function BillManagement() {
  const { t, locale } = useI18n();
  const [detail, setDetail] = useState<AdminBillDto | null>(null);

  const load = useCallback((signal: AbortSignal) => billApi.list({ limit: 100 }), []);
  const { data, loading, error } = useApi(load);
  const rows = data?.items ?? [];

  const columns: TableProps<AdminBillDto>['columns'] = [
    { title: t('table.type'), dataIndex: 'type', key: 'type', render: (value: string) => <Tag color="blue">{value}</Tag> },
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    {
      title: t('table.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatCurrency(value, locale),
    },
    { title: t('table.details'), dataIndex: 'description', key: 'description', render: (value: string | null) => value ?? '—' },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    { title: t('table.createdAt'), dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_value, record) => (
        <Button size="small" type="primary" onClick={() => setDetail(record)}>
          {t('common.view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.bills.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminBillDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['userId', 'description']}
        filters={[
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'pending', label: t('status.pending') },
              { value: 'paid', label: t('status.paid') },
              { value: 'cancelled', label: t('status.cancelled') },
            ],
          },
          {
            key: 'type',
            label: t('filter.type'),
            options: [
              { value: 'recurring', label: 'Recurring' },
              { value: 'payment', label: 'Payment' },
              { value: 'charging', label: 'Charging' },
            ],
          },
        ]}
      />

      <Modal
        open={detail !== null}
        title={t('common.details')}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>{t('common.close')}</Button>}
      >
        {detail ? (
          <div className="space-y-2 text-sm">
            <p>ID: {detail.id}</p>
            <p>{t('table.user')}: {detail.userId}</p>
            <p>{t('table.amount')}: {formatCurrency(detail.amount, locale)}</p>
            <p>{t('table.details')}: {detail.description ?? '—'}</p>
            <p>{t('table.status')}: <StatusTag status={detail.status} /></p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
