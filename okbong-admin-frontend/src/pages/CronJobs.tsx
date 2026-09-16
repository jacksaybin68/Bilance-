import { PlayCircleOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Tag, Typography } from 'antd';
import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { DEMO_CRON_JOBS, type CronJobRow } from './demoData';

const TYPE_COLORS: Record<string, string> = {
  price: 'blue',
  report: 'green',
  cleanup: 'orange',
  export: 'purple',
};

export function CronJobs() {
  const { t, locale } = useI18n();
  const { message } = App.useApp();
  const [rows, setRows] = useState<CronJobRow[]>(DEMO_CRON_JOBS);

  const runJob = (id: string) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, status: 'running' } : row)),
    );
    message.info(t('common.run'));
  };

  const columns: TableProps<CronJobRow>['columns'] = [
    { title: t('table.jobName'), dataIndex: 'name', key: 'name' },
    {
      title: t('table.type'),
      dataIndex: 'type',
      key: 'type',
      render: (value: string) => <Tag color={TYPE_COLORS[value] ?? 'default'}>{value}</Tag>,
    },
    { title: t('table.status'), dataIndex: 'status', key: 'status', render: (value: string) => <StatusTag status={value} /> },
    { title: t('table.lastRun'), dataIndex: 'lastRun', key: 'lastRun', render: (value: string) => formatDateTime(value, locale) },
    { title: t('table.nextRun'), dataIndex: 'nextRun', key: 'nextRun', render: (value: string) => formatDateTime(value, locale) },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_value, record) => (
        <Button
          size="small"
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={record.status === 'running'}
          onClick={() => runJob(record.id)}
        >
          {t('common.run')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.cron.title')}
      </Typography.Title>

      <DataTable<CronJobRow>
        columns={columns}
        rows={rows}
        rowKey="id"
        searchKeys={['name', 'type']}
        filters={[
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'running', label: t('status.running') },
              { value: 'completed', label: t('status.completed') },
              { value: 'pending', label: t('status.pending') },
            ],
          },
        ]}
      />
    </div>
  );
}
