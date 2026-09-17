import { useEffect, useRef } from 'react';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { ChatMessage } from '@/types/api';
import { groupMessages, positionInGroup, type MessageGroupPosition } from './utils';

const BUBBLE_BY_POSITION: Record<MessageGroupPosition, string> = {
  only: 'rounded-2xl',
  first: 'rounded-2xl rounded-br-md',
  middle: 'rounded-2xl rounded-tr-md rounded-br-md',
  last: 'rounded-2xl rounded-tr-md',
};

function senderLabelKey(role: ChatMessage['senderRole']) {
  if (role === 'admin') return 'chat.support' as const;
  if (role === 'system') return 'chat.system' as const;
  return 'chat.you' as const;
}

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const { t, locale } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);
  const groups = groupMessages(messages);

  // Keep the newest message in view as the thread grows or polls refresh.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div
      className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      role="log"
      aria-live="polite"
      aria-label={t('chat.title')}
    >
      {groups.map((group) => {
        const isOwn = group.senderRole === 'user';

        return (
          <div key={group.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
              <span className="px-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {t(senderLabelKey(group.senderRole))}
              </span>

              {group.messages.map((message, index) => (
                <div key={message.id} className="flex flex-col">
                  <div
                    className={[
                      'px-3.5 py-2 text-sm shadow-sm',
                      BUBBLE_BY_POSITION[positionInGroup(index, group.messages.length)],
                      isOwn
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
                    ].join(' ')}
                  >
                    {message.body}
                    {message.attachment ? (
                      <a
                        href={message.attachment}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-xs underline"
                      >
                        {message.attachment}
                      </a>
                    ) : null}
                  </div>
                  <span className="mt-0.5 px-1 text-[11px] text-gray-400 dark:text-gray-500">
                    {formatDateTime(message.createdAt, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}