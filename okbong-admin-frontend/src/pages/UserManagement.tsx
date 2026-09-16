import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Form, Input, Modal, Select, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { userApi, type AdminUserDto } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { DEMO_USERS } from './demoData';

interface UserFormValues {
  fullName: string;
  email: string;
  role: AdminUserDto['role'];
  status: AdminUserDto['status'];
}

export function UserManagement() {
  const { t } = useI18n();
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<AdminUserDto[]>(DEMO_USERS);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminUserDto | null>(null);
  const [form] = Form.useForm<UserFormValues>();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await userApi.list({ page: 1, limit: 20 });
        if (!cancelled && result.items.length > 0) setRows(result.items);
      } catch {
        // Backend offline: keep the typed demo rows so the screen stays usable.
        if (!cancelled) setRows(DEMO_USERS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openEdit = (record: AdminUserDto) => {
    setEditing(record);
    form.setFieldsValue({
      fullName: record.fullName ?? '',
      email: record.email,
      role: record.role,
      status: record.status,
    });
  };

  const handleSave = async (values: UserFormValues) => {
    if (!editing) return;

    try {
      await userApi.update(editing.id, values);
      message.success(t('common.save'));
    } catch (error) {
      message.error(error instanceof ApiError ? (error.messages[0] ?? t('common.error')) : t('common.error'));
    }

    setRows((current) =>
      current.map((row) => (row.id === editing.id ? { ...row, ...values } : row)),
    );
    setEditing(null);
  };

  const confirmDelete = (record: AdminUserDto) => {
    modal.confirm({
      title: t('common.delete'),
      content: record.email,
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      onOk: () => setRows((current) => current.filter((row) => row.id !== record.id)),
    });
  };

  const columns: TableProps<AdminUserDto>['columns'] = [
    { title: t('table.username'), dataIndex: 'fullName', key: 'fullName', render: (value: string | null) => value ?? '—' },
    { title: t('table.email'), dataIndex: 'email', key: 'email' },
    { title: t('table.role'), dataIndex: 'role', key: 'role', render: (value: AdminUserDto['role']) => t(`role.${value}` as MessageKey) },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
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
        {t('page.users.title')}
      </Typography.Title>

      <DataTable<AdminUserDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['email', 'fullName']}
        filters={[
          {
            key: 'role',
            label: t('filter.role'),
            options: [
              { value: 'admin', label: t('role.admin') },
              { value: 'moderator', label: t('role.moderator') },
              { value: 'user', label: t('role.user') },
            ],
          },
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'active', label: t('status.active') },
              { value: 'inactive', label: t('status.inactive') },
              { value: 'banned', label: t('status.banned') },
            ],
          },
        ]}
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(DEMO_USERS[0])}>
            {t('common.add')}
          </Button>
        }
      />

      <Modal
        open={editing !== null}
        title={t('page.users.addTitle')}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnHidden
      >
        <Form<UserFormValues> form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="fullName" label={t('table.fullName')}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('table.email')}
            rules={[
              { required: true, message: t('common.error') },
              { type: 'email', message: t('common.error') },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="role" label={t('table.role')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'admin', label: t('role.admin') },
                { value: 'moderator', label: t('role.moderator') },
                { value: 'user', label: t('role.user') },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label={t('table.status')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: t('status.active') },
                { value: 'inactive', label: t('status.inactive') },
                { value: 'banned', label: t('status.banned') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
