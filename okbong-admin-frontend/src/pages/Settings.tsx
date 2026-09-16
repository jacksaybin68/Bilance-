import type { TableProps } from 'antd';
import { App, Button, Input, Select, Switch, Typography } from 'antd';
import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { useI18n } from '@/lib/i18n';
import { DEMO_SETTINGS, type SettingRow } from './demoData';

const CURRENCIES = ['BDSD', 'USD', 'EUR'];

/** System settings screen (super admin only - enforced by the route guard). */
export function SettingsPage() {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [rows, setRows] = useState<SettingRow[]>(DEMO_SETTINGS);

  const updateValue = (id: string, value: string | boolean) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, value } : row)));
  };

  const columns: TableProps<SettingRow>['columns'] = [
    { title: t('table.setting'), dataIndex: 'label', key: 'label' },
    {
      title: t('table.value'),
      dataIndex: 'value',
      key: 'value',
      render: (value: string | boolean, record) => {
        if (record.key === 'default_currency') {
          return (
            <Select
              value={String(value)}
              style={{ width: 160 }}
              options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
              onChange={(next: string) => updateValue(record.id, next)}
            />
          );
        }

        if (typeof value === 'boolean') {
          return (
            <Switch
              checked={value}
              onChange={(checked: boolean) => updateValue(record.id, checked)}
            />
          );
        }

        return (
          <Input
            value={value}
            onChange={(event) => updateValue(record.id, event.target.value)}
            style={{ maxWidth: 280 }}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.settings.title')}
      </Typography.Title>

      <DataTable<SettingRow>
        columns={columns}
        rows={rows}
        rowKey="id"
        searchKeys={['label', 'key']}
        toolbarExtra={
          <Button type="primary" onClick={() => message.success(t('common.save'))}>
            {t('common.save')}
          </Button>
        }
      />
    </div>
  );
}
