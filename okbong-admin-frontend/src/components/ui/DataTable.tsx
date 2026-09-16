import { SearchOutlined } from '@ant-design/icons';
import { Input, Select, Space, Table, Typography } from 'antd';
import type { TableProps } from 'antd';
import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';

export interface FilterConfig {
  /** Row property the filter applies to. */
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface DataTableProps<T extends object> {
  columns: TableProps<T>['columns'];
  rows: T[];
  rowKey: TableProps<T>['rowKey'];
  /** Row properties matched by the free text search box. */
  searchKeys?: (keyof T)[];
  filters?: FilterConfig[];
  loading?: boolean;
  pageSize?: number;
  toolbarExtra?: React.ReactNode;
}

/**
 * Table with free text search, per column filters and paging. Shared by every
 * admin screen so filtering/pagination behaves identically everywhere.
 */
export function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  searchKeys,
  filters,
  loading = false,
  pageSize = 10,
  toolbarExtra,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | undefined>>({});

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows.filter((row) => {
      const record = row as Record<string, unknown>;

      if (needle.length > 0 && searchKeys && searchKeys.length > 0) {
        const matches = searchKeys.some((key) =>
          String(record[String(key)] ?? '').toLowerCase().includes(needle),
        );
        if (!matches) return false;
      }

      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true;
        return String(record[key] ?? '') === value;
      });
    });
  }, [rows, search, searchKeys, activeFilters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Space wrap>
          {searchKeys && searchKeys.length > 0 ? (
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('common.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 260, maxWidth: '100%' }}
            />
          ) : null}

          {filters?.map((filter) => (
            <Select
              key={filter.key}
              allowClear
              placeholder={filter.label}
              value={activeFilters[filter.key]}
              onChange={(value: string | undefined) =>
                setActiveFilters((current) => ({ ...current, [filter.key]: value }))
              }
              options={filter.options}
              style={{ minWidth: 170 }}
            />
          ))}
        </Space>

        <Space wrap>
          {toolbarExtra}
          <Typography.Text type="secondary">
            {t('common.total', { count: filteredRows.length })}
          </Typography.Text>
        </Space>
      </div>

      <Table<T>
        rowKey={rowKey}
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => t('common.total', { count: total }),
        }}
      />
    </div>
  );
}
