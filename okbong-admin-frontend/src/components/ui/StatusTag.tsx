import { Tag } from 'antd';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { messages } from '@/lib/i18n/messages';

const COLOR_BY_STATUS: Record<string, string> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  verified: 'processing',
  running: 'processing',
  processing: 'processing',
  pending: 'warning',
  draft: 'default',
  inactive: 'default',
  banned: 'error',
  blocked: 'error',
  rejected: 'error',
  cancelled: 'error',
};

function hasTranslation(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(messages.vi, key);
}

/** Coloured status chip with a localised label and a safe fallback. */
export function StatusTag({ status }: { status: string }) {
  const { t } = useI18n();
  const key = `status.${status}`;

  return (
    <Tag color={COLOR_BY_STATUS[status] ?? 'default'} style={{ padding: '2px 8px', margin: 0 }}>
      {hasTranslation(key) ? t(key) : status}
    </Tag>
  );
}
