import { InfoCircleOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Alert, Tag, Typography } from 'antd';
import { useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { useI18n } from '@/lib/i18n';
import { useApi } from '@/lib/hooks/useApi';
import { cardApi, type AdminCardDto } from '@/lib/api/endpoints';

/**
 * Card management. The backend has no card model yet, so `/admin/cards`
 * reports `implemented: false` and this screen shows the empty state instead
 * of fabricated rows.
 */
export function CardManagement() {
  const { t } = useI18n();

  const load = useCallback((signal: AbortSignal) => cardApi.list(), []);
  const { data, loading } = useApi(load);
  const rows = data?.items ?? [];

  const columns: TableProps<AdminCardDto>['columns'] = [
    {
      title: t('table.cardType'),
      dataIndex: 'cardType',
      key: 'cardType',
      render: (value: string) => <Tag color="blue">{value.toUpperCase()}</Tag>,
    },
    { title: t('table.user'), dataIndex: 'userId', key: 'userId' },
    { title: t('table.last4'), dataIndex: 'last4', key: 'last4' },
    { title: t('table.expiry'), dataIndex: 'expiry', key: 'expiry' },
    { title: t('table.status'), dataIndex: 'status', key: 'status' },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.cards.title')}
      </Typography.Title>

      {data && !data.implemented ? (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message="Backend chưa có model thẻ — màn hình hiển thị trạng thái rỗng."
        />
      ) : null}

      <DataTable<AdminCardDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['userId', 'last4']}
      />
    </div>
  );
}