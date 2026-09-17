import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { App, Button, Input, Radio, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  orderApi,
  type AdminOrderDto,
  type AdminOrderStatus,
} from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/hooks/useApi';
import { useI18n } from '@/lib/i18n';

const STATUS_TAG: Record<AdminOrderStatus, { color: string; text: string }> = {
  pending: { color: 'gold', text: 'Chờ kết quả' },
  win: { color: 'green', text: 'Win' },
  lose: { color: 'red', text: 'Lose' },
};

const SIDE_TAG: Record<AdminOrderDto['side'], { color: string; text: string }> = {
  buy: { color: 'green', text: 'Mua (lên)' },
  sell: { color: 'red', text: 'Bán (xuống)' },
};

export function OrderManagement() {
  const { t } = useI18n();
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<AdminOrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | ''>('');
  const [sideFilter, setSideFilter] = useState<AdminOrderDto['side'] | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await orderApi.list({
        page,
        limit: pageSize,
        status: statusFilter || undefined,
        side: sideFilter || undefined,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (caught) {
      message.error(errorMessage(caught, t('page.orders.error')));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, sideFilter, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const settle = (record: AdminOrderDto, result: 'win' | 'lose') => {
    modal.confirm({
      title: result === 'win' ? t('page.orders.win') : t('page.orders.lose'),
      content: `${record.pair} · ${formatAmount(record.amount)} BDSD — ${
        result === 'win' ? t('page.orders.confirmWin') : t('page.orders.confirmLose')
      }`,
      okText: t('common.save'),
      okButtonProps: { danger: result === 'lose' },
      cancelText: t('common.cancel'),
      onOk: async () => {
        setSettlingId(record.id);
        try {
          const note = notes[record.id]?.trim() || undefined;
          await orderApi.setResult(record.id, result, note);
          message.success(t('page.orders.done'));
          await load();
        } catch (caught) {
          message.error(errorMessage(caught, t('page.orders.settleError')));
        } finally {
          setSettlingId(null);
        }
      },
    });
  };

  const columns: TableProps<AdminOrderDto>['columns'] = [
    {
      title: t('page.orders.pair'),
      dataIndex: 'pair',
      key: 'pair',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: t('page.orders.side'),
      dataIndex: 'side',
      key: 'side',
      width: 120,
      render: (value: AdminOrderDto['side']) => (
        <Tag color={SIDE_TAG[value].color}>{SIDE_TAG[value].text}</Tag>
      ),
    },
    {
      title: t('page.orders.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (value: number) => formatAmount(value),
    },
    {
      title: t('page.orders.price'),
      dataIndex: 'price',
      key: 'price',
      width: 130,
      render: (value: number) => (value > 0 ? value.toLocaleString() : '—'),
    },
    {
      title: t('page.orders.status'),
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: AdminOrderStatus) => (
        <Tag color={STATUS_TAG[value].color}>{STATUS_TAG[value].text}</Tag>
      ),
    },
    {
      title: t('page.orders.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: t('page.orders.resultNote'),
      key: 'note',
      width: 200,
      render: (_value, record) =>
        record.status === 'pending' ? (
          <Input
            size="small"
            placeholder={t('page.orders.resultNote')}
            value={notes[record.id] ?? ''}
            onChange={(event) =>
              setNotes((prev) => ({ ...prev, [record.id]: event.target.value }))
            }
          />
        ) : (
          <Typography.Text type="secondary">
            {record.note || (record.settledBy ? `by ${record.settledBy.slice(0, 8)}` : '—')}
          </Typography.Text>
        ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      width: 170,
      render: (_value, record) => {
        if (record.status !== 'pending') {
          return (
            <Space size={4}>
              <Tag color={STATUS_TAG[record.status].color}>{STATUS_TAG[record.status].text}</Tag>
              <Typography.Text type="secondary" className="text-xs">
                {new Date(record.updatedAt ?? record.createdAt).toLocaleString()}
              </Typography.Text>
            </Space>
          );
        }
        return (
          <Space size={4}>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={settlingId === record.id}
              onClick={() => settle(record, 'win')}
            >
              {t('page.orders.win')}
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              loading={settlingId === record.id}
              onClick={() => settle(record, 'lose')}
            >
              {t('page.orders.lose')}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t('page.orders.title')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('page.orders.subtitle')}</Typography.Text>
        </div>
        <Space wrap>
          <Radio.Group
            size="middle"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as AdminOrderStatus | '');
              setPage(1);
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="">{t('page.orders.all')}</Radio.Button>
            <Radio.Button value="pending">{t('page.orders.pending')}</Radio.Button>
          </Radio.Group>
          <Radio.Group
            size="middle"
            value={sideFilter}
            onChange={(event) => {
              setSideFilter(event.target.value as AdminOrderDto['side'] | '');
              setPage(1);
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="">{t('common.all')}</Radio.Button>
            <Radio.Button value="buy">{t('page.orders.side')}: {SIDE_TAG.buy.text}</Radio.Button>
            <Radio.Button value="sell">{SIDE_TAG.sell.text}</Radio.Button>
          </Radio.Group>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            {t('common.refresh')}
          </Button>
        </Space>
      </div>

      <Table<AdminOrderDto>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
        scroll={{ x: 980 }}
      />

      <Space>
        <SwapOutlined />
        <Typography.Text type="secondary">
          {t('page.orders.subtitle')} — {t('page.orders.done')}
        </Typography.Text>
      </Space>
    </div>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}