import { UndoOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Popconfirm, Typography } from 'antd';
import { useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { formatDateTime } from '@/lib/format';
import { errorMessage, useApi } from '@/lib/hooks/useApi';
import { userApi, type AdminUserDto } from '@/lib/api/endpoints';

/** Banned users — the same collection as User Management filtered by status. */
export function BannedUsers() {
  const { t, locale } = useI18n();
  const { message } = App.useApp();

  const load = useCallback(
    (signal: AbortSignal) => userApi.list({ status: 'banned', limit: 100 }),
    [],
  );
  const { data, loading, error, reload } = useApi(load);
  const rows = data?.items ?? [];

  const unban = async (record: AdminUserDto) => {
    try {
      await userApi.unban(record.id);
      message.success(t('common.save'));
      reload();
    } catch (caught) {
      message.error(errorMessage(caught, t('common.error')));
    }
  };

  const columns: TableProps<AdminUserDto>['columns'] = [
    { title: t('table.username'), dataIndex: 'fullName', key: 'fullName', render: (value: string | null) => value ?? '—' },
    { title: t('table.email'), dataIndex: 'email', key: 'email' },
    { title: t('table.role'), dataIndex: 'role', key: 'role', render: (value: AdminUserDto['role']) => t(`role.${value}` as MessageKey) },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    {
      title: t('table.bannedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string) => formatDateTime(value, locale),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_value, record) => (
        <Popconfirm title={t('status.active')} onConfirm={() => unban(record)}>
          <Button size="small" icon={<UndoOutlined />}>
            {t('status.active')}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.banned.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminUserDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['fullName', 'email']}
      />
    </div>
  );
}