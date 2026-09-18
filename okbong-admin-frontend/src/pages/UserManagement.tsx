import { EditOutlined, PlusOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { errorMessage, useApi } from '@/lib/hooks/useApi';
import { userApi, type AdminUserDto } from '@/lib/api/endpoints';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';

interface UserFormValues {
  fullName: string;
  email: string;
  password?: string;
  role: AdminUserDto['role'];
  status: AdminUserDto['status'];
}

export function UserManagement() {
  const { t } = useI18n();
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<AdminUserDto[]>([]);
  const [editing, setEditing] = useState<AdminUserDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<UserFormValues>();

  const load = useCallback((signal: AbortSignal) => userApi.list({ page: 1, limit: 100 }), []);

  const { data, loading, error, reload } = useApi(load);

  useEffect(() => {
    if (data) setRows(data.items);
  }, [data]);

  const openEdit = (record: AdminUserDto) => {
    setEditing(record);
    setModalOpen(true);
    form.setFieldsValue({
      fullName: record.fullName ?? '',
      email: record.email,
      role: record.role,
      status: record.status,
    });
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
    form.setFieldsValue({ fullName: '', email: '', role: 'user', status: 'active' });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async (values: UserFormValues) => {
    try {
      if (editing) {
        await userApi.update(editing.id, values);
      } else {
        await userApi.create({
          email: values.email,
          password: values.password ?? '',
          fullName: values.fullName,
          role: values.role,
          status: values.status,
        });
      }
      message.success(t('common.save'));
      reload();
      closeModal();
    } catch (caught) {
      message.error(errorMessage(caught, t('common.error')));
    }
  };

  const confirmBan = (record: AdminUserDto) => {
    const banning = record.status !== 'banned';
    modal.confirm({
      title: banning ? t('status.banned') : t('status.active'),
      content: record.email,
      okText: t('common.save'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          if (banning) await userApi.ban(record.id);
          else await userApi.unban(record.id);
          message.success(t('common.save'));
          reload();
        } catch (caught) {
          message.error(errorMessage(caught, t('common.error')));
        }
      },
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
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button
            size="small"
            danger={record.status !== 'banned'}
            icon={record.status === 'banned' ? <UndoOutlined /> : <StopOutlined />}
            onClick={() => confirmBan(record)}
          >
            {record.status === 'banned' ? t('status.active') : t('status.banned')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.users.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

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
              { value: 'super_admin', label: t('role.super_admin') },
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('common.add')}
          </Button>
        }
      />

      <Modal
        open={modalOpen}
        title={editing ? t('page.users.editTitle') : t('page.users.addTitle')}
        onCancel={closeModal}
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
          {editing ? null : (
            <Form.Item
              name="password"
              label={t('table.password')}
              rules={[
                { required: true, message: t('common.error') },
                { min: 6, message: t('common.error') },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
          <Form.Item name="role" label={t('table.role')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'super_admin', label: t('role.super_admin') },
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
