import type { TableProps } from 'antd';
import { Button, Tag, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { useApi } from '@/lib/hooks/useApi';
import { walletApi, type AdminWalletDto } from '@/lib/api/endpoints';

export function WalletsBanks() {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback((signal: AbortSignal) => walletApi.list({ limit: 100 }), []);
  const { data, loading, error } = useApi(load);
  const rows = data?.items ?? [];

  const columns: TableProps<AdminWalletDto>['columns'] = [
    {
      title: t('table.type'),
      dataIndex: 'type',
      key: 'type',
      render: (value: AdminWalletDto['type']) => (
        <Tag color={value === 'bank' ? 'purple' : 'blue'}>{value}</Tag>
      ),
    },
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    {
      title: t('table.balance'),
      dataIndex: 'balance',
      key: 'balance',
      render: (value: number, record) => `${formatCurrency(Number(value), locale)} ${record.currency}`,
    },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_value, record) => (
        <Button size="small" onClick={() => setSelected(record.id)}>
          {selected === record.id ? t('common.details') : t('common.view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.wallets.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminWalletDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['userId', 'currency']}
        filters={[
          {
            key: 'type',
            label: t('filter.type'),
            options: [
              { value: 'e-wallet', label: 'E-Wallet' },
              { value: 'bank', label: 'Bank' },
            ],
          },
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'active', label: t('status.active') },
              { value: 'verified', label: t('status.verified') },
              { value: 'pending', label: t('status.pending') },
              { value: 'blocked', label: t('status.blocked') },
            ],
          },
        ]}
      />
    </div>
  );
}
