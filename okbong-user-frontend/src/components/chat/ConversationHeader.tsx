import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { ChatConversation, ConversationStatus } from '@/types/api';

const STATUS_CLASSES: Record<ConversationStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  closed: 'bg-gray-200 text-gray-600 dark:bg-gray-600/30 dark:text-gray-300',
};

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  const { t } = useI18n();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {t(`chat.status.${status}` as 'chat.status.open')}
    </span>
  );
}

export function ConversationHeader({ conversation }: { conversation: ChatConversation }) {
  const { t, locale } = useI18n();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
          {conversation.subject}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {t(`chat.topic.${conversation.topic}` as 'chat.topic.general')}
          {conversation.lastMessageAt
            ? ` • ${formatDateTime(conversation.lastMessageAt, locale)}`
            : ''}
        </p>
      </div>
      <ConversationStatusBadge status={conversation.status} />
    </header>
  );
}