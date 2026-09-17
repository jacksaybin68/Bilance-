import type { TableProps } from 'antd';
import { Tag, Typography } from 'antd';
import { useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks/useApi';
import { cronApi, type AdminCronJobDto } from '@/lib/api/endpoints';

const TYPE_COLORS: Record<string, string> = {
  cron: 'blue',
  interval: 'green',
  timeout: 'orange',
};

/** Read-only view of the jobs registered with @nestjs/schedule. */
export function CronJobs() {
  const { t, locale } = useI18n();

  const load = useCallback((signal: AbortSignal) => cronApi.list(), []);
  const { data, loading, error } = useApi(load);
  const rows = data?.jobs ?? [];

  const columns: TableProps<AdminCronJobDto>['columns'] = [
    { title: t('table.jobName'), dataIndex: 'name', key: 'name' },
    {
      title: t('table.type'),
      dataIndex: 'type',
      key: 'type',
      render: (value: string) => <Tag color={TYPE_COLORS[value] ?? 'default'}>{value}</Tag>,
    },
    { title: t('table.duration'), dataIndex: 'schedule', key: 'schedule' },
    {
      title: t('table.lastRun'),
      dataIndex: 'lastRun',
      key: 'lastRun',
      render: (value: string | null) => (value ? formatDateTime(value, locale) : '—'),
    },
    {
      title: t('table.nextRun'),
      dataIndex: 'nextRun',
      key: 'nextRun',
      render: (value: string | null) => (value ? formatDateTime(value, locale) : '—'),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.cron.title')}
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminCronJobDto>
        columns={columns}
        rows={rows}
        rowKey="name"
        loading={loading}
        searchKeys={['name', 'type']}
        filters={[
          {
            key: 'type',
            label: t('filter.type'),
            options: [
              { value: 'cron', label: 'cron' },
              { value: 'interval', label: 'interval' },
              { value: 'timeout', label: 'timeout' },
            ],
          },
        ]}
      />
    </div>
  );
}