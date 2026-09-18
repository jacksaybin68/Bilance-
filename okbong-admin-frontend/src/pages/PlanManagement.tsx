import { PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Form, Input, InputNumber, Modal, Select, Tag, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { errorMessage, useApi } from '@/lib/hooks/useApi';
import { planApi, type AdminPlanDto } from '@/lib/api/endpoints';

interface PlanFormValues {
  name: string;
  price: number;
  duration: string;
  status: string;
  features?: string;
}

function toPayload(values: PlanFormValues) {
  return {
    name: values.name,
    price: values.price,
    duration: values.duration,
    status: values.status,
    features: values.features
      ? values.features.split(',').map((feature) => feature.trim()).filter(Boolean)
      : [],
  };
}

export function PlanManagement() {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<AdminPlanDto | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<PlanFormValues>();

  const load = useCallback((signal: AbortSignal) => planApi.list(), []);
  const { data, loading, error, reload } = useApi(load);
  const rows = data ?? [];

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ duration: '1 month', status: 'active' } as PlanFormValues);
    setOpen(true);
  };

  const openEdit = (record: AdminPlanDto) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      price: Number(record.price),
      duration: record.duration,
      status: record.status,
      features: (record.features ?? []).join(', '),
    });
    setOpen(true);
  };

  const handleSubmit = async (values: PlanFormValues) => {
    try {
      if (editing) await planApi.update(editing.id, toPayload(values));
      else await planApi.create(toPayload(values));
      message.success(t('common.save'));
      setOpen(false);
      reload();
    } catch (caught) {
      message.error(errorMessage(caught, t('common.error')));
    }
  };

  const columns: TableProps<AdminPlanDto>['columns'] = [
    { title: t('table.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('table.price'),
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => <Tag color="blue">{Number(value)} USD</Tag>,
    },
    { title: t('table.duration'), dataIndex: 'duration', key: 'duration' },
    {
      title: t('table.features'),
      dataIndex: 'features',
      key: 'features',
      render: (value: string[] | null) =>
        !value || value.length === 0 ? '—' : value.map((feature) => <Tag key={feature}>{feature}</Tag>),
    },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_value, record) => (
        <Button size="small" type="primary" onClick={() => openEdit(record)}>
          {t('common.edit')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.plans.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminPlanDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['name']}
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('common.add')}
          </Button>
        }
      />

      <Modal
        open={open}
        title={editing ? t('common.edit') : t('common.add')}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnHidden
      >
        <Form<PlanFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('table.name')} rules={[{ required: true, max: 60 }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="price"
            label={t('table.price')}
            rules={[{ required: true, type: 'number', min: 0, max: 100000 }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
          </Form.Item>
          <Form.Item name="duration" label={t('table.duration')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: '1 month', label: '1 month' },
                { value: '3 months', label: '3 months' },
                { value: '6 months', label: '6 months' },
                { value: '12 months', label: '12 months' },
              ]}
            />
          </Form.Item>
          <Form.Item name="features" label={t('table.features')}>
            <Input placeholder="Unlimited bills, Priority support" />
          </Form.Item>
          <Form.Item name="status" label={t('table.status')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: t('status.active') },
                { value: 'inactive', label: t('status.inactive') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}