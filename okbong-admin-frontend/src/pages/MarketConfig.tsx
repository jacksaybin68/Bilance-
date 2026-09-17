import { EditOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Form, InputNumber, Modal, Tag, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { errorMessage, useApi } from '@/lib/hooks/useApi';
import { marketApi, type AdminMarketSymbolDto } from '@/lib/api/endpoints';

interface PriceFormValues {
  price: number;
  volume?: number;
}

/**
 * Market configuration. The backend has no coin catalogue — symbols and prices
 * come from the price-history feed, and saving appends a new price row.
 */
export function MarketConfig() {
  const { t, locale } = useI18n();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<AdminMarketSymbolDto | null>(null);
  const [form] = Form.useForm<PriceFormValues>();

  const load = useCallback((signal: AbortSignal) => marketApi.symbols(), []);
  const { data, loading, error, reload } = useApi(load);
  const rows = data ?? [];

  const openEdit = (record: AdminMarketSymbolDto) => {
    setEditing(record);
    form.setFieldsValue({ price: record.price, volume: record.volume ?? undefined });
  };

  const handleSave = async (values: PriceFormValues) => {
    if (!editing) return;
    try {
      await marketApi.setPrice(editing.symbol, values.price, values.volume);
      message.success(t('common.save'));
      setEditing(null);
      reload();
    } catch (caught) {
      message.error(errorMessage(caught, t('common.error')));
    }
  };

  const columns: TableProps<AdminMarketSymbolDto>['columns'] = [
    {
      title: 'Symbol',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (value: string) => <Tag color="geekblue">{value}</Tag>,
    },
    {
      title: 'Giá hiện tại',
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => Number(value).toLocaleString('en-US'),
    },
    {
      title: 'Khối lượng',
      dataIndex: 'volume',
      key: 'volume',
      render: (value: number | null) => (value === null ? '—' : Number(value).toLocaleString('en-US')),
    },
    {
      title: 'Cập nhật lúc',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string | null) => (value ? formatDateTime(value, locale) : '—'),
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
        {t('page.market.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminMarketSymbolDto>
        columns={columns}
        rows={rows}
        rowKey="symbol"
        loading={loading}
        searchKeys={['symbol']}
      />

      <Modal
        open={editing !== null}
        title={`Cập nhật giá ${editing?.symbol ?? ''}`}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnHidden
      >
        <Form<PriceFormValues> form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="price"
            label="Giá"
            rules={[{ required: true, type: 'number', min: 0 }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
          </Form.Item>
          <Form.Item name="volume" label="Khối lượng">
            <InputNumber style={{ width: '100%' }} min={0} step={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}