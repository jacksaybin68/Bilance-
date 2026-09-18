'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { buildInputClass, cardClassName } from '@/components/ui/form';
import { getErrorMessage } from '@/lib/api/client';
import { chatApi, walletApi } from '@/lib/api/endpoints';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { toFiniteNumber } from '@/lib/parsers';
import type { ChatMessage, Wallet } from '@/types/api';

type LoadState = 'loading' | 'ready' | 'error';

export default function ChatPage() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('BDSD');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');
    try {
      const [history, wallets] = await Promise.all([
        chatApi.history(),
        walletApi.listMine().catch(() => [] as Wallet[]),
      ]);
      setMessages(history);
      if (wallets.length > 0) {
        setBalance(
          wallets.reduce((sum, wallet) => sum + toFiniteNumber(wallet.balance), 0),
        );
        setCurrency(wallets[0]?.currency ?? 'BDSD');
      }
      setState('ready');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('chat.error')));
      setState('error');
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setSendError('');
    try {
      const saved = await chatApi.send({ content });
      setMessages((prev) => [...prev, saved]);
      setDraft('');
    } catch (error) {
      setSendError(getErrorMessage(error, t('chat.sendError')));
    } finally {
      setSending(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className={`${cardClassName} flex items-center justify-center py-20`}>
        <Spinner label={t('common.loading')} />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="error" message={errorMessage} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('chat.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('chat.subtitle')}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2 text-right text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('chat.balanceLabel')}</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {balance.toLocaleString(locale)} <span className="text-xs">{currency}</span>
          </p>
        </div>
      </div>

      <div className={`${cardClassName} overflow-hidden`}>
        <div className="flex max-h-[60vh] min-h-[420px] flex-col">
          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
                  💬
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('chat.empty')}
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isMine = message.senderRole === 'user';
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isMine
                          ? 'rounded-br-md bg-emerald-600 text-white dark:bg-emerald-600'
                          : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          isMine
                            ? 'text-emerald-100/80'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {isMine ? 'Bạn' : 'Hỗ trợ viên'} ·{' '}
                        {formatDateTime(message.createdAt, locale)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-gray-200 p-3 dark:border-gray-800">
            {sendError && (
              <div className="mb-2">
                <Alert variant="error" message={sendError} />
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder={t('chat.placeholder')}
                className={`${buildInputClass(false)} flex-1 resize-none`}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || draft.trim().length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending && <Spinner label="" />}➤
                {t('chat.send')}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              {t('chat.hint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}