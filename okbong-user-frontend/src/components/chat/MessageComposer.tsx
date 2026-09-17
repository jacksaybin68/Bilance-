import { useState, type FormEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { inputClassName } from '@/components/ui/form';

export interface MessageComposerProps {
  onSend: (body: string) => Promise<void> | void;
  disabled?: boolean;
  disabledNotice?: string;
}

const MAX_LENGTH = 2000;

export function MessageComposer({ onSend, disabled = false, disabledNotice }: MessageComposerProps) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const trimmed = value.trim();
  const canSend = !disabled && !sending && trimmed.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setValue('');
    } finally {
      setSending(false);
    }
  }

  if (disabled) {
    return (
      <p className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {disabledNotice ?? t('chat.closedNotice')}
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700"
    >
      <label className="sr-only" htmlFor="chat-composer">
        {t('chat.placeholder')}
      </label>
      <textarea
        id="chat-composer"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends; Shift+Enter inserts a newline.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
          }
        }}
        rows={2}
        maxLength={MAX_LENGTH}
        placeholder={t('chat.placeholder')}
        className={`${inputClassName} resize-none`}
      />
      <button
        type="submit"
        disabled={!canSend}
        className="shrink-0 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? t('chat.sending') : t('chat.send')}
      </button>
    </form>
  );
}