import type { TableProps } from 'antd';
import { App, Button, Input, Select, Switch, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { useI18n } from '@/lib/i18n';
import { errorMessage, useApi } from '@/lib/hooks/useApi';
import { settingApi, type AdminSettingDto } from '@/lib/api/endpoints';

const CURRENCIES = ['BDSD', 'USD', 'EUR'];

/** System settings screen (super admin only - enforced by the route guard). */
export function SettingsPage() {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [rows, setRows] = useState<AdminSettingDto[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback((signal: AbortSignal) => settingApi.list(), []);
  const { data, loading, error, reload } = useApi(load);

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const updateValue = (key: string, value: string) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, value } : row)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingApi.save(rows.map((row) => ({ key: row.key, value: row.value })));
      message.success(t('common.save'));
      reload();
    } catch (caught) {
      message.error(errorMessage(caught, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  const columns: TableProps<AdminSettingDto>['columns'] = [
    { title: t('table.setting'), dataIndex: 'label', key: 'label' },
    {
      title: t('table.value'),
      dataIndex: 'value',
      key: 'value',
      render: (value: string, record) => {
        if (record.key === 'default_currency') {
          return (
            <Select
              value={value}
              style={{ width: 160 }}
              options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
              onChange={(next: string) => updateValue(record.key, next)}
            />
          );
        }

        if (record.valueType === 'boolean') {
          return (
            <Switch
              checked={value === 'true'}
              onChange={(checked: boolean) => updateValue(record.key, String(checked))}
            />
          );
        }

        return (
          <Input
            value={value}
            onChange={(event) => updateValue(record.key, event.target.value)}
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

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminSettingDto>
        columns={columns}
        rows={rows}
        rowKey="key"
        loading={loading}
        searchKeys={['label', 'key']}
        toolbarExtra={
          <Button type="primary" loading={saving} onClick={handleSave}>
            {t('common.save')}
          </Button>
        }
      />
    </div>
  );
}