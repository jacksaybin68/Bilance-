import {
  PlusOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { DEMO_COINS, type CoinRow } from './demoData';

const CATEGORY_LABELS: Record<string, string> = {
  stablecoin: 'Stablecoin',
  crypto: 'Crypto',
  utility: 'Utility Token',
};

interface CoinFormValues {
  symbol: string;
  name: string;
  priceUsd: number;
  priceBdsd: number;
  category: string;
  status: CoinRow['status'];
}

export function MarketConfig() {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [rows, setRows] = useState<CoinRow[]>(DEMO_COINS);
  const [editing, setEditing] = useState<CoinRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form] = Form.useForm<CoinFormValues>();

  const openNew = () => {
    setIsNew(true);
    setEditing({
      id: `coin-${Date.now()}`,
      symbol: '',
      name: '',
      priceUsd: 0,
      priceBdsd: 0,
      change24h: 0,
      status: 'active',
      category: 'crypto',
      updatedAt: new Date().toISOString(),
    });
    form.resetFields();
  };

  const openEdit = (record: CoinRow) => {
    setIsNew(false);
    setEditing(record);
    form.setFieldsValue({
      symbol: record.symbol,
      name: record.name,
      priceUsd: record.priceUsd,
      priceBdsd: record.priceBdsd,
      category: record.category,
      status: record.status,
    });
  };

  const handleSave = (values: CoinFormValues) => {
    if (!editing) return;
    const updated: CoinRow = {
      ...editing,
      ...values,
      updatedAt: new Date().toISOString(),
    };
    if (isNew) {
      setRows((current) => [updated, ...current]);
    } else {
      setRows((current) => current.map((row) => (row.id === editing.id ? updated : row)));
    }
    void message.success(t('common.save'));
    setEditing(null);
  };

  const columns: TableProps<CoinRow>['columns'] = [
    {
      title: 'Symbol',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (value: string) => <Tag color="geekblue">{value}</Tag>,
    },
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    {
      title: 'Giá (USD)',
      dataIndex: 'priceUsd',
      key: 'priceUsd',
      render: (value: number) =>
        value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
    },
    {
      title: 'Giá (BDSD)',
      dataIndex: 'priceBdsd',
      key: 'priceBdsd',
      render: (value: number) => `${value.toLocaleString()} BDSD`,
    },
    {
      title: 'Thay đổi 24h',
      dataIndex: 'change24h',
      key: 'change24h',
      render: (value: number) => {
        const isPositive = value >= 0;
        return (
          <Space size={2}>
            {isPositive ? (
              <ArrowUpOutlined style={{ color: '#52c41a' }} />
            ) : (
              <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
            )}
            <Typography.Text style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
              {isPositive ? '+' : ''}{value.toFixed(2)}%
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      render: (value: string) => CATEGORY_LABELS[value] ?? value,
    },
    {
      title: t('table.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: 'Cập nhật lúc',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_value, record) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
          {t('common.edit')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        Cấu hình Market – Danh mục Coin &amp; Giá
      </Typography.Title>

      <DataTable<CoinRow>
        columns={columns}
        rows={rows}
        rowKey="id"
        searchKeys={['symbol', 'name', 'category']}
        filters={[
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'active', label: t('status.active') },
              { value: 'inactive', label: t('status.inactive') },
              { value: 'delisted', label: 'Đã huỷ niêm yết' },
            ],
          },
          {
            key: 'category',
            label: 'Danh mục',
            options: [
              { value: 'stablecoin', label: 'Stablecoin' },
              { value: 'crypto', label: 'Crypto' },
              { value: 'utility', label: 'Utility Token' },
            ],
          },
        ]}
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            Thêm coin
          </Button>
        }
      />

      {/* Form thêm/sửa coin */}
      <Modal
        open={editing !== null}
        title={isNew ? 'Thêm coin mới' : `Chỉnh sửa: ${editing?.symbol}`}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={560}
        destroyOnHidden
      >
        <Form<CoinFormValues> form={form} layout="vertical" onFinish={handleSave}>
          <Space style={{ width: '100%' }}>
            <Form.Item
              name="symbol"
              label="Symbol"
              rules={[{ required: true, message: 'Nhập symbol (VD: BTC)' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="BTC" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
            <Form.Item
              name="name"
              label="Tên coin"
              rules={[{ required: true, message: 'Nhập tên coin' }]}
              style={{ flex: 2 }}
            >
              <Input placeholder="Bitcoin" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }}>
            <Form.Item
              name="priceUsd"
              label="Giá USD"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                prefix="$"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
            <Form.Item
              name="priceBdsd"
              label="Giá BDSD"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                addonAfter="BDSD"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }}>
            <Form.Item
              name="category"
              label="Danh mục"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                options={[
                  { value: 'stablecoin', label: 'Stablecoin' },
                  { value: 'crypto', label: 'Crypto' },
                  { value: 'utility', label: 'Utility Token' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="status"
              label={t('table.status')}
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                options={[
                  { value: 'active', label: t('status.active') },
                  { value: 'inactive', label: t('status.inactive') },
                  { value: 'delisted', label: 'Đã huỷ niêm yết' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
