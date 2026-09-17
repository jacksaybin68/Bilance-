'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ConversationHeader } from '@/components/chat/ConversationHeader';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { MessageList } from '@/components/chat/MessageList';
import { mergeMessages } from '@/components/chat/utils';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { cardClassName } from '@/components/ui/form';
import { chatApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { isAuthenticated } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';
import type { ChatConversation, ChatMessage, ConversationTopic } from '@/types/api';
import { CONVERSATION_TOPICS } from '@/types/api';

type LoadState = 'loading' | 'ready' | 'error';

const POLL_INTERVAL_MS = 5000;

export default function ChatPage() {
  const { t } = useI18n();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [topic, setTopic] = useState<ConversationTopic>('general');

  // Guards the polling effect from writing state after unmount.
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  const refreshMessages = useCallback(async (conversationId: string) => {
    const page = await chatApi.messages(conversationId, { limit: 100 });
    if (conversationIdRef.current !== conversationId) return;
    setMessages((current) => mergeMessages(current, page.items));
  }, []);

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');

    try {
      const opened = await chatApi.openConversation({ topic });
      conversationIdRef.current = opened.id;
      setConversation(opened);
      setMessages([]);
      await refreshMessages(opened.id);
      await chatApi.markRead(opened.id);
      setState('ready');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('chat.loadError')));
      setState('error');
    }
  }, [refreshMessages, t, topic]);

  useEffect(() => {
    if (authenticated !== true) return;
    void load();

    return () => {
      conversationIdRef.current = null;
    };
  }, [authenticated, load]);

  // Polling mirrors the market page: no socket dependency is bundled.
  useEffect(() => {
    if (state !== 'ready' || conversation === null) return;
    if (conversation.status === 'closed') return;

    const id = conversation.id;
    const timer = window.setInterval(() => {
      void refreshMessages(id).catch(() => {
        // Transient polling failures are retried on the next tick.
      });
      void chatApi.markRead(id).catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [conversation, refreshMessages, state]);

  const handleSend = useCallback(
    async (body: string) => {
      if (conversation === null) return;
      setSendError('');

      try {
        const sent = await chatApi.send(conversation.id, { body });
        setMessages((current) => mergeMessages(current, [sent]));
      } catch (error) {
        setSendError(getErrorMessage(error, t('chat.error')));
        throw error;
      }
    },
    [conversation, t],
  );

  if (authenticated === false) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <Alert variant="info" message={t('chat.loginRequired')} />
        <Link
          href="/auth"
          className="inline-flex w-fit items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          {t('chat.login')}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('chat.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('chat.subtitle')}</p>
      </div>

      {state === 'loading' ? <Spinner label={t('chat.starting')} /> : null}

      {state === 'error' ? (
        <div className="space-y-3">
          <Alert variant="error" message={errorMessage} />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t('chat.retry')}
          </button>
        </div>
      ) : null}

      {state === 'ready' && conversation !== null ? (
        <>
          {conversation.status === 'open' ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="chat-topic" className="text-sm text-gray-600 dark:text-gray-300">
                {t('chat.topic')}
              </label>
              <select
                id="chat-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value as ConversationTopic)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                {CONVERSATION_TOPICS.map((value) => (
                  <option key={value} value={value}>
                    {t(`chat.topic.${value}` as 'chat.topic.general')}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <section className={`${cardClassName} flex h-[70vh] flex-col p-0`}>
            <ConversationHeader conversation={conversation} />

            {messages.length === 0 ? (
              <p className="flex-1 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('chat.empty')}
              </p>
            ) : (
              <MessageList messages={messages} />
            )}

            <MessageComposer onSend={handleSend} disabled={conversation.status === 'closed'} />
          </section>

          {sendError.length > 0 ? <Alert variant="error" message={sendError} /> : null}
        </>
      ) : null}
    </main>
  );
}