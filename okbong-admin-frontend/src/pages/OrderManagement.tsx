import { CloseOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { formatDateTime, formatNumber } from '@/lib/format';
import { ApiError } from '@/lib/api/client';
import {
  orderAdminApi,
  type AdminOrderDto,
  type OrderSide,
  type OrderStats,
  type OrderStatus,
} from '@/lib/api/endpoints';

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'MATCHING',
  'MATCHED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
];

/**
 * Mirror of the backend's transition table. Terminal states cannot be changed,
 * so the select is limited to the legal next states for the current order.
 */
const TERMINAL_STATUSES: readonly OrderStatus[] = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['MATCHING', 'MATCHED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
  MATCHING: ['PENDING', 'MATCHED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
  MATCHED: ['MATCHED', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

interface ResultFormValues {
  status: OrderStatus;
  filledAmount?: number;
  price?: number;
  reason?: string;
}

/** Lists orders and lets administrators apply valid result transitions. */
export function OrderManagement() {
  const { t, locale } = useI18n();
  const { modal, message } = App.useApp();

  const [rows, setRows] = useState<AdminOrderDto[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [sideFilter, setSideFilter] = useState<OrderSide | undefined>();
  const [detail, setDetail] = useState<AdminOrderDto | null>(null);
  const [adjusting, setAdjusting] = useState<AdminOrderDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ResultFormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [page, statsResult] = await Promise.all([
        orderAdminApi.list({ status: statusFilter, side: sideFilter, limit: 100 }),
        orderAdminApi.stats(),
      ]);
      setRows(page.items);
      setStats(statsResult);
    } catch (error) {
      void message.error(error instanceof ApiError ? error.message : t('ordersAdmin.loadError'));
    } finally {
      setLoading(false);
    }
  }, [message, sideFilter, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdjust = (order: AdminOrderDto) => {
    setAdjusting(order);
    const nextStatuses = ALLOWED_TRANSITIONS[order.status];
    form.setFieldsValue({
      status: nextStatuses[0] ?? order.status,
      filledAmount: Number(order.filledAmount),
      price: Number(order.price),
      reason: '',
    });
  };

  const submitResult = async () => {
    if (adjusting === null) return;

    let values: ResultFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    if (
      values.filledAmount !== undefined &&
      values.filledAmount > Number(adjusting.amount)
    ) {
      void message.error(t('ordersAdmin.adjust.overFill'));
      return;
    }

    setSubmitting(true);
    try {
      await orderAdminApi.setResult(adjusting.id, values);
      void message.success(t('ordersAdmin.adjust.success'));
      setAdjusting(null);
      form.resetFields();
      await load();
    } catch (error) {
      void message.error(error instanceof ApiError ? error.message : t('ordersAdmin.adjust.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = (order: AdminOrderDto) => {
    modal.confirm({
      title: t('ordersAdmin.cancelConfirm'),
      okText: t('ordersAdmin.cancel'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await orderAdminApi.cancel(order.id, 'admin cancel');
          void message.success(t('ordersAdmin.cancelled'));
          await load();
        } catch (error) {
          void message.error(
            error instanceof ApiError ? error.message : t('ordersAdmin.adjust.error'),
          );
        }
      },
    });
  };

  const columns: TableProps<AdminOrderDto>['columns'] = [
    {
      title: t('ordersAdmin.pair'),
      dataIndex: 'pair',
      key: 'pair',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: t('ordersAdmin.side'),
      dataIndex: 'side',
      key: 'side',
      render: (value: OrderSide) => (
        <Tag color={value === 'buy' ? 'green' : 'red'}>
          {t(`ordersAdmin.side.${value}` as 'ordersAdmin.side.buy')}
        </Tag>
      ),
    },
    {
      title: t('table.user'),
      key: 'user',
      render: (_value, record) => record.userEmail ?? record.userId,
    },
    {
      title: t('ordersAdmin.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatNumber(Number(value), locale),
    },
    {
      title: t('ordersAdmin.filled'),
      dataIndex: 'filledAmount',
      key: 'filledAmount',
      render: (value: number) => formatNumber(Number(value), locale),
    },
    {
      title: t('ordersAdmin.price'),
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => formatNumber(Number(value), locale),
    },
    {
      title: t('ordersAdmin.result'),
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: t('table.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDateTime(value, locale),
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
            icon={<EditOutlined />}
            disabled={TERMINAL_STATUSES.includes(record.status)}
            onClick={() => openAdjust(record)}
          >
            {t('ordersAdmin.adjustResult')}
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            disabled={TERMINAL_STATUSES.includes(record.status)}
            onClick={() => cancelOrder(record)}
          >
            {t('ordersAdmin.cancel')}
          </Button>
          <Button size="small" onClick={() => setDetail(record)}>
            {t('common.view')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t('ordersAdmin.title')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('ordersAdmin.subtitle')}</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          {t('common.refresh')}
        </Button>
      </div>

      {stats ? (
        <Row gutter={[12, 12]}>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic title={t('ordersAdmin.stats.total')} value={stats.total} />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title={t('ordersAdmin.stats.pending')}
                value={stats.byStatus.PENDING ?? 0}
                valueStyle={{ color: '#d97706' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title={t('ordersAdmin.stats.matched')}
                value={(stats.byStatus.MATCHING ?? 0) + (stats.byStatus.MATCHED ?? 0)}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic title={t('ordersAdmin.stats.completed')} value={stats.byStatus.COMPLETED ?? 0} />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic title={t('ordersAdmin.stats.cancelled')} value={stats.byStatus.CANCELLED ?? 0} />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small">
              <Statistic
                title={t('ordersAdmin.stats.volume')}
                value={stats.filledVolume}
                precision={2}
              />
            </Card>
          </Col>
        </Row>
      ) : null}

      <Space wrap align="end">
        <Select
          allowClear
          placeholder={t('ordersAdmin.result')}
          style={{ minWidth: 170 }}
          value={statusFilter}
          onChange={(value: OrderStatus | undefined) => setStatusFilter(value)}
          options={ORDER_STATUSES.map((value) => ({
            value,
            label: t(`status.${value}` as 'status.pending'),
          }))}
        />
        <Select
          allowClear
          placeholder={t('ordersAdmin.side')}
          style={{ minWidth: 140 }}
          value={sideFilter}
          onChange={(value: OrderSide | undefined) => setSideFilter(value)}
          options={[
            { value: 'buy', label: t('ordersAdmin.side.buy') },
            { value: 'sell', label: t('ordersAdmin.side.sell') },
          ]}
        />
      </Space>

      <DataTable<AdminOrderDto> columns={columns} rows={rows} rowKey="id" loading={loading} />

      <Modal
        open={adjusting !== null}
        title={t('ordersAdmin.adjust.title')}
        onCancel={() => setAdjusting(null)}
        onOk={() => void submitResult()}
        okText={t('ordersAdmin.adjust.submit')}
        confirmLoading={submitting}
        cancelText={t('common.cancel')}
      >
        {adjusting ? (
          <>
            <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
              <Descriptions.Item label={t('ordersAdmin.pair')}>
                <strong>{adjusting.pair}</strong>
              </Descriptions.Item>
              <Descriptions.Item label={t('table.user')}>
                {adjusting.userEmail ?? adjusting.userId}
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.amount')}>
                {formatNumber(Number(adjusting.amount), locale)}
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.result')}>
                <StatusTag status={adjusting.status} />
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              <Form.Item
                name="status"
                label={t('ordersAdmin.adjust.status')}
                rules={[{ required: true }]}
              >
                <Select
                  options={ALLOWED_TRANSITIONS[adjusting.status].map((value) => ({
                    value,
                    label: t(`status.${value}` as 'status.pending'),
                  }))}
                />
              </Form.Item>
              <Form.Item name="filledAmount" label={t('ordersAdmin.adjust.filledAmount')}>
                <InputNumber min={0} max={Number(adjusting.amount)} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="price" label={t('ordersAdmin.adjust.price')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="reason" label={t('ordersAdmin.adjust.reason')}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </>
        ) : null}
      </Modal>

      <Modal
        open={detail !== null}
        title={t('ordersAdmin.title')}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>{t('common.close')}</Button>}
      >
        {detail ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="ID">
              <code>{detail.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label={t('table.user')}>
              {detail.userEmail ?? detail.userId}
            </Descriptions.Item>
            <Descriptions.Item label={t('ordersAdmin.pair')}>{detail.pair}</Descriptions.Item>
            <Descriptions.Item label={t('ordersAdmin.side')}>
              {t(`ordersAdmin.side.${detail.side}` as 'ordersAdmin.side.buy')}
            </Descriptions.Item>
            <Descriptions.Item label={t('ordersAdmin.amount')}>
              {formatNumber(Number(detail.amount), locale)}
            </Descriptions.Item>
            <Descriptions.Item label={t('ordersAdmin.filled')}>
              {formatNumber(Number(detail.filledAmount), locale)}
            </Descriptions.Item>
            <Descriptions.Item label={t('ordersAdmin.price')}>
              {formatNumber(Number(detail.price), locale)}
            </Descriptions.Item>
            <Descriptions.Item label={t('ordersAdmin.result')}>
              <StatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label={t('table.createdAt')}>
              {formatDateTime(detail.createdAt, locale)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
}
