import {
  CheckOutlined,
  CloseOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Modal, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { DEMO_TRANSACTIONS, type TransactionRow } from './demoData';

export function Transactions() {
  const { t, locale } = useI18n();
  const { modal, message } = App.useApp();
  const [rows, setRows] = useState<TransactionRow[]>(DEMO_TRANSACTIONS);
  const [detail, setDetail] = useState<TransactionRow | null>(null);

  const updateStatus = (id: string, status: 'approved' | 'rejected') => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row)),
    );
  };

  const handleApprove = (record: TransactionRow) => {
    modal.confirm({
      title: 'Duyệt giao dịch',
      content: (
        <div className="space-y-1 text-sm">
          <p>Người dùng: <strong>{record.userId}</strong></p>
          <p>Loại: <strong>{record.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}</strong></p>
          <p>Số tiền: <strong>{formatCurrency(record.amount, locale)} {record.currency}</strong></p>
          <p>Phương thức: {record.method}</p>
        </div>
      ),
      okText: 'Duyệt',
      okType: 'primary',
      cancelText: t('common.cancel'),
      onOk: () => {
        updateStatus(record.id, 'approved');
        void message.success('Đã duyệt giao dịch thành công.');
      },
    });
  };

  const handleReject = (record: TransactionRow) => {
    modal.confirm({
      title: 'Từ chối giao dịch',
      content: (
        <div className="space-y-1 text-sm">
          <p>Người dùng: <strong>{record.userId}</strong></p>
          <p>Loại: <strong>{record.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}</strong></p>
          <p>Số tiền: <strong>{formatCurrency(record.amount, locale)} {record.currency}</strong></p>
        </div>
      ),
      okText: 'Từ chối',
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => {
        updateStatus(record.id, 'rejected');
        void message.warning('Đã từ chối giao dịch.');
      },
    });
  };

  const canAction = (status: TransactionRow['status']) =>
    status === 'pending' || status === 'processing';

  const columns: TableProps<TransactionRow>['columns'] = [
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (value: TransactionRow['type']) =>
        value === 'deposit' ? (
          <Tag icon={<ArrowDownOutlined />} color="green">Nạp tiền</Tag>
        ) : (
          <Tag icon={<ArrowUpOutlined />} color="orange">Rút tiền</Tag>
        ),
    },
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    {
      title: t('table.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number, record) =>
        `${formatCurrency(value, locale)} ${record.currency}`,
    },
    { title: 'Phương thức', dataIndex: 'method', key: 'method' },
    {
      title: t('table.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusTag status={value} />,
    },
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
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            disabled={!canAction(record.status)}
            onClick={() => handleApprove(record)}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            disabled={!canAction(record.status)}
            onClick={() => handleReject(record)}
          >
            Từ chối
          </Button>
          <Button
            size="small"
            onClick={() => setDetail(record)}
          >
            {t('common.view')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        Duyệt Nạp / Rút
      </Typography.Title>

      <DataTable<TransactionRow>
        columns={columns}
        rows={rows}
        rowKey="id"
        searchKeys={['userId', 'method', 'note']}
        filters={[
          {
            key: 'type',
            label: t('filter.type'),
            options: [
              { value: 'deposit', label: 'Nạp tiền' },
              { value: 'withdrawal', label: 'Rút tiền' },
            ],
          },
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'pending', label: t('status.pending') },
              { value: 'processing', label: t('status.processing') },
              { value: 'approved', label: t('status.approved') },
              { value: 'rejected', label: t('status.rejected') },
            ],
          },
        ]}
      />

      {/* Modal chi tiết giao dịch */}
      <Modal
        open={detail !== null}
        title="Chi tiết giao dịch"
        onCancel={() => setDetail(null)}
        footer={
          <Space>
            {detail && canAction(detail.status) && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    handleApprove(detail);
                    setDetail(null);
                  }}
                >
                  Duyệt
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    handleReject(detail);
                    setDetail(null);
                  }}
                >
                  Từ chối
                </Button>
              </>
            )}
            <Button onClick={() => setDetail(null)}>{t('common.close')}</Button>
          </Space>
        }
      >
        {detail ? (
          <div className="space-y-2 text-sm">
            <p>ID: <code>{detail.id}</code></p>
            <p>{t('table.user')}: <strong>{detail.userId}</strong></p>
            <p>Loại giao dịch: <strong>{detail.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}</strong></p>
            <p>{t('table.amount')}: <strong>{formatCurrency(detail.amount, locale)} {detail.currency}</strong></p>
            <p>Phương thức: {detail.method}</p>
            <p>Ghi chú: {detail.note}</p>
            <p>{t('table.status')}: <StatusTag status={detail.status} /></p>
            <p>{t('table.createdAt')}: {new Date(detail.createdAt).toLocaleString()}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
