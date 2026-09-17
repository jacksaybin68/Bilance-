import {
  CustomerServiceOutlined,
  MessageOutlined,
  ReloadOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Checkbox, Empty, Input, List, Space, Spin, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, type AdminChatMessageDto, type AdminChatThreadDto } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/hooks/useApi';
import { useI18n } from '@/lib/i18n';

const SIDEBAR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function avatarLabel(thread: AdminChatThreadDto, index: number): string {
  if (thread.fullName) return thread.fullName.charAt(0).toUpperCase();
  if (thread.userEmail) return thread.userEmail.charAt(0).toUpperCase();
  return SIDEBAR_LABELS[index % SIDEBAR_LABELS.length] ?? 'U';
}

export function ChatManagement() {
  const { t } = useI18n();
  const { message } = App.useApp();
  const [threads, setThreads] = useState<AdminChatThreadDto[]>([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminChatMessageDto[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const result = await chatApi.threads(onlyUnread);
        setThreads(result.items);
      } catch (caught) {
        message.error(errorMessage(caught, t('page.chat.error')));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [onlyUnread, message, t],
  );

  const loadThread = useCallback(
    async (userId: string) => {
      setThreadLoading(true);
      try {
        const data = await chatApi.threadMessages(userId);
        setMessages(data);
      } catch (caught) {
        message.error(errorMessage(caught, t('page.chat.error')));
      } finally {
        setThreadLoading(false);
      }
    },
    [message, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadThreads(controller.signal);
    return () => controller.abort();
  }, [loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openThread = (userId: string) => {
    setActiveUserId(userId);
    void loadThread(userId);
  };

  const handleReply = async () => {
    const content = draft.trim();
    if (!activeUserId || !content || sending) return;

    setSending(true);
    try {
      const saved = await chatApi.reply(activeUserId, content);
      setMessages((prev) => [...prev, saved]);
      setDraft('');
      setThreads((prev) =>
        prev.map((thread) =>
          thread.userId === activeUserId
            ? { ...thread, lastMessage: content, lastMessageAt: saved.createdAt, lastSenderRole: 'admin' as const, unread: 0 }
            : thread,
        ),
      );
    } catch (caught) {
      message.error(errorMessage(caught, t('page.chat.replyError')));
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find((thread) => thread.userId === activeUserId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t('page.chat.title')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('page.chat.markRead')}</Typography.Text>
        </div>
        <Space wrap>
          <Checkbox
            checked={onlyUnread}
            onChange={(event) => setOnlyUnread(event.target.checked)}
          >
            {t('page.chat.unreadOnly')}
          </Checkbox>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void loadThreads()}
            loading={loading}
          >
            {t('common.refresh')}
          </Button>
        </Space>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Thread list */}
        <Card
          title={
            <Space>
              <CustomerServiceOutlined />
              {t('page.chat.threads')}
            </Space>
          }
          size="small"
        >
          {threads.length === 0 && !loading ? (
            <Empty description={t('page.chat.noThreads')} />
          ) : (
            <List
              loading={loading}
              dataSource={threads}
              renderItem={(thread, index) => (
                <List.Item
                  onClick={() => openThread(thread.userId)}
                  style={{
                    cursor: 'pointer',
                    paddingInline: 8,
                    borderRadius: 8,
                    background: activeUserId === thread.userId ? 'rgba(24,144,255,0.12)' : undefined,
                  }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full font-bold text-white"
                        style={{ background: thread.unread > 0 ? '#f5222d' : '#1677ff' }}
                      >
                        {avatarLabel(thread, index)}
                      </div>
                    }
                    title={
                      <Space size={4}>
                        <span className="max-w-[140px] truncate">
                          {thread.fullName || thread.userEmail || thread.userId.slice(0, 8)}
                        </span>
                        {thread.unread > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {thread.unread}
                          </span>
                        )}
                      </Space>
                    }
                    description={
                      <span className="line-clamp-1 text-xs opactiy-80">
                        {thread.lastMessage}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Conversation */}
        <Card
          title={
            <Space>
              <MessageOutlined />
              {activeThread
                ? activeThread.fullName || activeThread.userEmail || activeThread.userId.slice(0, 8)
                : t('page.chat.conversation')}
            </Space>
          }
          size="small"
        >
          {!activeUserId ? (
            <div className="flex h-[420px] items-center justify-center">
              <Empty description={t('page.chat.select')} />
            </div>
          ) : (
            <>
              <div className="max-h-[420px] min-h-[360px] space-y-3 overflow-y-auto p-2">
                <Spin spinning={threadLoading}>
                  {messages.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      {t('page.chat.noThreads')}
                    </div>
                  ) : (
                    messages.map((item) => {
                      const fromCustomer = item.senderRole === 'user';
                      return (
                        <div
                          key={item.id}
                          className={`flex ${fromCustomer ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              fromCustomer
                                ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{item.content}</p>
                            <p
                              className={`mt-1 text-[10px] ${
                                fromCustomer
                                  ? 'text-gray-400 dark:text-gray-400'
                                  : 'text-blue-100'
                              }`}
                            >
                              {fromCustomer ? (
                                <UserOutlined />
                              ) : (
                                <CustomerServiceOutlined />
                              )}{' '}
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </Spin>
                <div ref={bottomRef} />
              </div>

              <div className="flex items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Input.TextArea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onPressEnter={(event) => {
                    if (!event.shiftKey) {
                      event.preventDefault();
                      void handleReply();
                    }
                  }}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  maxLength={2000}
                  placeholder={t('page.chat.replyPlaceholder')}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  disabled={!activeUserId || draft.trim().length === 0}
                  onClick={() => void handleReply()}
                >
                  {t('page.chat.reply')}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}