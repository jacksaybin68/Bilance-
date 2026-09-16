import type { TableProps } from 'antd';
import { Button, Typography } from 'antd';
import { DataTable } from '@/components/ui/DataTable';
import { useI18n } from '@/lib/i18n';
import { DEMO_BANNED_USERS, type BannedUserRow } from './demoData';

export function BannedUsers() {
  const { t } = useI18n();

  const columns: TableProps<BannedUserRow>['columns'] = [
    { title: t('table.username'), dataIndex: 'username', key: 'username' },
    { title: t('table.email'), dataIndex: 'email', key: 'email' },
    { title: t('table.reason'), dataIndex: 'reason', key: 'reason' },
    { title: t('table.bannedAt'), dataIndex: 'bannedAt', key: 'bannedAt' },
    { title: t('table.duration'), dataIndex: 'duration', key: 'duration' },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: () => <Button size="small">{t('common.view')}</Button>,
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.banned.title')}
      </Typography.Title>

      <DataTable<BannedUserRow>
        columns={columns}
        rows={DEMO_BANNED_USERS}
        rowKey="id"
        searchKeys={['username', 'email']}
      />
    </div>
  );
}
