import type { TableProps } from 'antd';
import { Button, Modal, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { billApi, type AdminBillDto } from '@/lib/api/endpoints';
import { useI18n } from '@/lib/i18n';
import { DEMO_BILLS } from './demoData';

export function BillManagement() {
  const { t } = useI18n();
  const [rows, setRows] = useState<AdminBillDto[]>(DEMO_BILLS);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AdminBillDto | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await billApi.list();
        if (!cancelled && result.items.length > 0) setRows(result.items);
      } catch {
        if (!cancelled) setRows(DEMO_BILLS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: TableProps<AdminBillDto>['columns'] = [
    { title: t('table.type'), dataIndex: 'type', key: 'type', render: (value: string) => <Tag color="blue">{value}</Tag> },
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    { title: t('table.details'), dataIndex: 'content', key: 'content' },
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

      <DataTable<AdminBillDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['userId', 'content']}
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
          {
            key: 'type',
            label: t('filter.type'),
            options: [
              { value: 'transfer', label: 'Transfer' },
              { value: 'e-wallet', label: 'E-Wallet' },
              { value: 'fluctuation', label: 'Fluctuation' },
              { value: 'priority', label: 'Priority' },
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
            <p>{t('table.details')}: {detail.content}</p>
            <p>{t('table.status')}: <StatusTag status={detail.status} /></p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
