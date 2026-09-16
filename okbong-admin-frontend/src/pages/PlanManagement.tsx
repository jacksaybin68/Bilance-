import { PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Form, Input, InputNumber, Modal, Tag, Typography } from 'antd';
import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { DEMO_PLANS, type PlanRow } from './demoData';

interface PlanFormValues {
  name: string;
  price: number;
}

export function PlanManagement() {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [rows, setRows] = useState<PlanRow[]>(DEMO_PLANS);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<PlanFormValues>();

  const handleCreate = (values: PlanFormValues) => {
    setRows((current) => [
      ...current,
      {
        id: `plan-${Date.now()}`,
        name: values.name,
        price: values.price,
        duration: '1 month',
        features: [],
        status: 'active',
      },
    ]);
    message.success(t('common.save'));
    setOpen(false);
    form.resetFields();
  };

  const columns: TableProps<PlanRow>['columns'] = [
    { title: t('table.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('table.price'),
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => <Tag color="blue">{value} USD</Tag>,
    },
    { title: t('table.duration'), dataIndex: 'duration', key: 'duration' },
    {
      title: t('table.features'),
      dataIndex: 'features',
      key: 'features',
      render: (value: string[]) =>
        value.length === 0 ? '—' : value.map((feature) => <Tag key={feature}>{feature}</Tag>),
    },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: () => <Button size="small" type="primary">{t('common.edit')}</Button>,
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.plans.title')}
      </Typography.Title>

      <DataTable<PlanRow>
        columns={columns}
        rows={rows}
        rowKey="id"
        searchKeys={['name']}
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('common.add')}
          </Button>
        }
      />

      <Modal
        open={open}
        title={t('common.add')}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnHidden
      >
        <Form<PlanFormValues> form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label={t('table.name')} rules={[{ required: true, max: 60 }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="price"
            label={t('table.price')}
            rules={[{ required: true, type: 'number', min: 0.01, max: 100000 }]}
          >
            <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
