import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Popconfirm, Space, Tag, Typography } from 'antd';
import { useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { errorMessage, useApi } from '@/lib/hooks/useApi';
import { paymentApi, type AdminTransactionDto } from '@/lib/api/endpoints';

/** Transaction approval queue backed by `/admin/payments`. */
export function Transactions() {
  const { t, locale } = useI18n();
  const { message } = App.useApp();

  const load = useCallback((signal: AbortSignal) => paymentApi.list({ limit: 100 }), []);
  const { data, loading, error, reload } = useApi(load);
  const rows = data?.items ?? [];

  const review = async (record: AdminTransactionDto, status: 'completed' | 'failed') => {
    try {
      await paymentApi.review(record.id, status);
      message.success(t('common.save'));
      reload();
    } catch (caught) {
      message.error(errorMessage(caught, t('common.error')));
    }
  };

  const columns: TableProps<AdminTransactionDto>['columns'] = [
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    { title: t('table.type'), dataIndex: 'type', key: 'type', render: (value: string) => <Tag color="blue">{value}</Tag> },
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
    {
      title: t('table.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_value, record) => (
        <Space size={4}>
          <Popconfirm title={t('status.completed')} onConfirm={() => review(record, 'completed')}>
            <Button size="small" type="primary" icon={<CheckOutlined />} />
          </Popconfirm>
          <Popconfirm title={t('status.rejected')} onConfirm={() => review(record, 'failed')}>
            <Button size="small" danger icon={<CloseOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.transactions.title')}
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
              { value: 'completed', label: t('status.completed') },
              { value: 'failed', label: t('status.rejected') },
              { value: 'reversed', label: t('status.reversed') },
            ],
          },
        ]}
      />
    </div>
  );
}