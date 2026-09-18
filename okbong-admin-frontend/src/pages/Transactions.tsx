import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
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
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ApiError } from '@/lib/api/client';
import {
  transactionApi,
  type AdminTransactionDto,
  type AdminTransactionFilter,
  type TransactionStats,
  type TransactionStatus,
  type TransactionType,
} from '@/lib/api/endpoints';

const TYPE_LABEL_KEY: Record<TransactionType, string> = {
  deposit: 'transaction.type.deposit',
  withdraw: 'transaction.type.withdraw',
  transfer_in: 'transaction.type.transfer_in',
  transfer_out: 'transaction.type.transfer_out',
  fee: 'transaction.type.fee',
  adjustment: 'transaction.type.adjustment',
};

/** Deposit-like rows credit the wallet; everything else debits it. */
const CREDIT_TYPES: readonly TransactionType[] = ['deposit', 'transfer_in'];

const STATUS_OPTIONS: TransactionStatus[] = ['pending', 'completed', 'failed', 'reversed'];

type ReviewAction = 'approve' | 'reject' | 'reverse';

const ACTION_MESSAGE_KEY: Record<ReviewAction, string> = {
  approve: 'transaction.approved',
  reject: 'transaction.rejected',
  reverse: 'transaction.reversed',
};

const CONFIRM_KEY: Record<ReviewAction, string> = {
  approve: 'transaction.approveConfirm',
  reject: 'transaction.rejectConfirm',
  reverse: 'transaction.reverseConfirm',
};

/** Reviews transactions and exposes guarded wallet-adjustment controls. */
export function Transactions() {
  const { t, locale } = useI18n();
  const { modal, message } = App.useApp();

  const [rows, setRows] = useState<AdminTransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [detail, setDetail] = useState<AdminTransactionDto | null>(null);
  const [filters, setFilters] = useState<AdminTransactionFilter>({});
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm] = Form.useForm<{ walletId: string; amount: number; reason: string }>();

  const load = useCallback(
    async (nextFilters: AdminTransactionFilter) => {
      setLoading(true);
      try {
        const [page, statsResult] = await Promise.all([
          transactionApi.list(nextFilters),
          transactionApi.stats(),
        ]);
        setRows(page.items);
        setStats(statsResult);
      } catch (error) {
        void message.error(error instanceof ApiError ? error.message : t('transaction.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [message, t],
  );

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const refresh = () => void load(filters);

  const isPending = (row: AdminTransactionDto) => row.status === 'pending';
  const isCompleted = (row: AdminTransactionDto) => row.status === 'completed';

  const runAction = async (action: ReviewAction, row: AdminTransactionDto, reason?: string) => {
    try {
      if (action === 'approve') await transactionApi.approve(row.id, reason);
      else if (action === 'reject') await transactionApi.reject(row.id, reason);
      else await transactionApi.reverse(row.id, reason);

      void message.success(t(ACTION_MESSAGE_KEY[action] as 'transaction.approved'));
      refresh();
    } catch (error) {
      void message.error(error instanceof ApiError ? error.message : t('transaction.actionError'));
    }
  };

  /** Rejecting and reversing are money-affecting, so a reason is mandatory. */
  const askReason = (action: ReviewAction, row: AdminTransactionDto, reasonRequired: boolean) => {
    let reason = '';

    modal.confirm({
      title: t(CONFIRM_KEY[action] as 'transaction.approveConfirm'),
      content: (
        <div className="space-y-2">
          <Descriptions size="small" column={1}>
            <Descriptions.Item label={t('table.user')}>
              {row.userEmail ?? row.userId ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.type')}>
              {t(TYPE_LABEL_KEY[row.type] as 'transaction.type.deposit')}
            </Descriptions.Item>
            <Descriptions.Item label={t('table.amount')}>
              {formatCurrency(Number(row.amount), locale, row.currency ?? undefined)}
            </Descriptions.Item>
          </Descriptions>
          <Input.TextArea
            rows={2}
            placeholder={t('transaction.reason')}
            onChange={(event) => {
              reason = event.target.value;
            }}
          />
        </div>
      ),
      okText: t(`transaction.${action}` as 'transaction.approve'),
      okType: action === 'approve' ? 'primary' : 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        if (reasonRequired && reason.trim().length === 0) {
          void message.error(t('transaction.reasonRequired'));
          // Rejecting keeps the dialog open so the admin can supply a reason.
          return Promise.reject(new Error('reason required'));
        }
        await runAction(action, row, reason.trim() || undefined);
      },
    });
  };

  const handleAdjust = async () => {
    let values: { walletId: string; amount: number; reason: string };
    try {
      values = await adjustForm.validateFields();
    } catch {
      return;
    }

    try {
      await transactionApi.adjust(values);
      void message.success(t('transaction.adjust.success'));
      setAdjustOpen(false);
      adjustForm.resetFields();
      refresh();
    } catch (error) {
      void message.error(error instanceof ApiError ? error.message : t('transaction.actionError'));
    }
  };

  const columns: TableProps<AdminTransactionDto>['columns'] = [
    {
      title: t('transaction.type'),
      dataIndex: 'type',
      key: 'type',
      render: (value: TransactionType) =>
        CREDIT_TYPES.includes(value) ? (
          <Tag icon={<ArrowDownOutlined />} color="green">
            {t(TYPE_LABEL_KEY[value] as 'transaction.type.deposit')}
          </Tag>
        ) : (
          <Tag icon={<ArrowUpOutlined />} color="orange">
            {t(TYPE_LABEL_KEY[value] as 'transaction.type.deposit')}
          </Tag>
        ),
    },
    {
      title: t('table.user'),
      key: 'user',
      render: (_value, record) => record.userEmail ?? record.userId ?? '—',
    },
    {
      title: t('table.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number, record) =>
        formatCurrency(Number(value), locale, record.currency ?? undefined),
    },
    {
      title: t('transaction.balanceAfter'),
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (value: number, record) =>
        formatCurrency(Number(value), locale, record.currency ?? undefined),
    },
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
            icon={<CheckOutlined />}
            disabled={!isPending(record)}
            onClick={() => askReason('approve', record, false)}
          >
            {t('transaction.approve')}
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            disabled={!isPending(record)}
            onClick={() => askReason('reject', record, true)}
          >
            {t('transaction.reject')}
          </Button>
          <Button
            size="small"
            disabled={!isCompleted(record)}
            onClick={() => askReason('reverse', record, true)}
          >
            {t('transaction.reverse')}
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
            {t('transaction.title')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('transaction.subtitle')}</Typography.Text>
        </div>
        <Space>
          <Button icon={<SlidersOutlined />} onClick={() => setAdjustOpen(true)}>
            {t('transaction.adjust')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
            {t('common.refresh')}
          </Button>
        </Space>
      </div>

      {stats ? (
        <Row gutter={[12, 12]}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title={t('transaction.stats.total')} value={stats.total} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title={t('transaction.stats.pending')}
                value={stats.pending}
                valueStyle={{ color: '#d97706' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title={t('transaction.stats.totalDeposit')} value={stats.totalDeposit} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title={t('transaction.stats.totalWithdraw')} value={stats.totalWithdraw} />
            </Card>
          </Col>
        </Row>
      ) : null}

      <Space wrap align="end">
        <Select
          allowClear
          placeholder={t('transaction.type')}
          style={{ minWidth: 180 }}
          value={filters.type}
          onChange={(value: TransactionType | undefined) =>
            setFilters((current) => ({ ...current, type: value }))
          }
          options={Object.keys(TYPE_LABEL_KEY).map((value) => ({
            value,
            label: t(TYPE_LABEL_KEY[value as TransactionType] as 'transaction.type.deposit'),
          }))}
        />
        <Select
          allowClear
          placeholder={t('table.status')}
          style={{ minWidth: 160 }}
          value={filters.status}
          onChange={(value: TransactionStatus | undefined) =>
            setFilters((current) => ({ ...current, status: value }))
          }
          options={STATUS_OPTIONS.map((value) => ({
            value,
            label: t(`status.${value}` as 'status.pending'),
          }))}
        />
        <Input.Search
          allowClear
          placeholder={t('transaction.searchPlaceholder')}
          style={{ width: 260 }}
          onSearch={(value) =>
            setFilters((current) => ({ ...current, search: value.trim() || undefined }))
          }
        />
      </Space>

      <DataTable<AdminTransactionDto> columns={columns} rows={rows} rowKey="id" loading={loading} />

      <Modal
        open={detail !== null}
        title={t('transaction.detail')}
        onCancel={() => setDetail(null)}
        footer={
          <Space>
            {detail && isPending(detail) ? (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    askReason('approve', detail, false);
                    setDetail(null);
                  }}
                >
                  {t('transaction.approve')}
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    askReason('reject', detail, true);
                    setDetail(null);
                  }}
                >
                  {t('transaction.reject')}
                </Button>
              </>
            ) : null}
            {detail && isCompleted(detail) ? (
              <Button
                danger
                onClick={() => {
                  askReason('reverse', detail, true);
                  setDetail(null);
                }}
              >
                {t('transaction.reverse')}
              </Button>
            ) : null}
            <Button onClick={() => setDetail(null)}>{t('common.close')}</Button>
          </Space>
        }
      >
        {detail ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="ID">
              <code>{detail.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label={t('table.user')}>
              {detail.userEmail ?? detail.userId ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.wallet')}>
              <code>{detail.walletId}</code>
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.type')}>
              {t(TYPE_LABEL_KEY[detail.type] as 'transaction.type.deposit')}
            </Descriptions.Item>
            <Descriptions.Item label={t('table.amount')}>
              {formatCurrency(Number(detail.amount), locale, detail.currency ?? undefined)}
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.balanceBefore')}>
              {formatCurrency(Number(detail.balanceBefore), locale, detail.currency ?? undefined)}
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.balanceAfter')}>
              {formatCurrency(Number(detail.balanceAfter), locale, detail.currency ?? undefined)}
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.reference')}>
              {detail.reference ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.description')}>
              {detail.description ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('table.status')}>
              <StatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label={t('table.createdAt')}>
              {formatDateTime(detail.createdAt, locale)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        open={adjustOpen}
        title={t('transaction.adjust.title')}
        onCancel={() => setAdjustOpen(false)}
        onOk={() => void handleAdjust()}
        okText={t('transaction.adjust.submit')}
        cancelText={t('common.cancel')}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          {t('transaction.adjust.hint')}
        </Typography.Paragraph>
        <Form form={adjustForm} layout="vertical">
          <Form.Item
            name="walletId"
            label={t('transaction.adjust.walletId')}
            rules={[{ required: true, message: t('transaction.adjust.walletRequired') }]}
          >
            <Input placeholder="00000000-0000-0000-0000-000000000000" />
          </Form.Item>
          <Form.Item
            name="amount"
            label={t('transaction.adjust.amount')}
            rules={[
              { required: true, message: t('transaction.adjust.amountRequired') },
              {
                validator: (_rule, value) =>
                  typeof value === 'number' && value !== 0
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('transaction.adjust.amountRequired'))),
              },
            ]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label={t('transaction.adjust.reason')}
            rules={[{ required: true, message: t('transaction.reasonRequired') }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
