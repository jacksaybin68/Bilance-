import { ReloadOutlined, SendOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { App, Badge, Button, Card, Col, Empty, Input, List, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { ApiError } from '@/lib/api/client';
import { readSession } from '@/lib/auth/session';
import {
  chatAdminApi,
  type AdminChatMessageDto,
  type AdminConversationDto,
  type ChatSummary,
  type ConversationStatus,
  type ConversationTopic,
} from '@/lib/api/endpoints';

const STATUS_OPTIONS: ConversationStatus[] = ['open', 'pending', 'closed'];

const TOPIC_LABEL_KEY: Record<ConversationTopic, string> = {
  general: 'chatAdmin.topic.general',
  deposit: 'chatAdmin.topic.deposit',
  withdraw: 'chatAdmin.topic.withdraw',
  order: 'chatAdmin.topic.order',
  kyc: 'chatAdmin.topic.kyc',
  technical: 'chatAdmin.topic.technical',
};

const POLL_INTERVAL_MS = 5000;

/** Manages support conversations, replies, assignments, and status updates. */
export function ChatManagement() {
  const { t, locale } = useI18n();
  const { message } = App.useApp();
  const currentUserId = readSession()?.user.id ?? null;

  const [conversations, setConversations] = useState<AdminConversationDto[]>([]);
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminChatMessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const loadConversations = useCallback(
    async (status?: ConversationStatus) => {
      setLoading(true);
      try {
        const [page, summaryResult] = await Promise.all([
          chatAdminApi.conversations({ status, limit: 100 }),
          chatAdminApi.summary(),
        ]);
        setConversations(page.items);
        setSummary(summaryResult);
      } catch (error) {
        void message.error(error instanceof ApiError ? error.message : t('chatAdmin.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [message, t],
  );

  useEffect(() => {
    void loadConversations(statusFilter);
  }, [loadConversations, statusFilter]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setMessagesLoading(true);
      try {
        const page = await chatAdminApi.messages(conversationId, { limit: 200 });
        setMessages(page.items);
      } catch (error) {
        void message.error(error instanceof ApiError ? error.message : t('chatAdmin.loadError'));
      } finally {
        setMessagesLoading(false);
      }
    },
    [message, t],
  );

  const selectConversation = useCallback(
    async (conversation: AdminConversationDto) => {
      setSelectedId(conversation.id);
      setReply('');
      await loadMessages(conversation.id);

      // Opening a thread clears the admin's unread counter.
      if (conversation.unreadForAdmin > 0) {
        try {
          await chatAdminApi.markRead(conversation.id);
          setConversations((current) =>
            current.map((item) =>
              item.id === conversation.id ? { ...item, unreadForAdmin: 0 } : item,
            ),
          );
        } catch {
          // A failed read receipt is cosmetic; leave the badge untouched.
        }
      }
    },
    [loadMessages],
  );

  // Poll the open thread so new user messages appear without a socket.
  useEffect(() => {
    if (selectedId === null) return;

    const timer = window.setInterval(() => {
      void loadMessages(selectedId).catch(() => undefined);
      void loadConversations(statusFilter).catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [loadConversations, loadMessages, selectedId, statusFilter]);

  const handleReply = async () => {
    if (selected === null) return;
    const body = reply.trim();
    if (body.length === 0) return;

    setSending(true);
    try {
      const sent = await chatAdminApi.reply(selected.id, body);
      setMessages((current) => [...current, sent]);
      setReply('');
      void loadConversations(statusFilter);
    } catch (error) {
      void message.error(error instanceof ApiError ? error.message : t('chatAdmin.replyError'));
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: ConversationStatus) => {
    if (selected === null) return;

    try {
      const updated = await chatAdminApi.setStatus(selected.id, status);
      setConversations((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      void message.success(t('chatAdmin.statusUpdated'));
    } catch (error) {
      void message.error(error instanceof ApiError ? error.message : t('chatAdmin.replyError'));
    }
  };

  const assignToMe = async () => {
    if (selected === null || currentUserId === null) return;

    try {
      const updated = await chatAdminApi.assign(selected.id, currentUserId);
      setConversations((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      void message.success(t('chatAdmin.assignedToYou'));
    } catch (error) {
      void message.error(error instanceof ApiError ? error.message : t('chatAdmin.replyError'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t('chatAdmin.title')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('chatAdmin.subtitle')}</Typography.Text>
        </div>
        <Space>
          <Select
            allowClear
            placeholder={t('table.status')}
            style={{ minWidth: 160 }}
            value={statusFilter}
            onChange={(value: ConversationStatus | undefined) => setStatusFilter(value)}
            options={STATUS_OPTIONS.map((value) => ({
              value,
              label: t(`chatAdmin.status.${value}` as 'chatAdmin.status.open'),
            }))}
          />
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadConversations(statusFilter)}
          >
            {t('common.refresh')}
          </Button>
        </Space>
      </div>

      {summary ? (
        <Row gutter={[12, 12]}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title={t('chatAdmin.summary.open')} value={summary.open} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title={t('chatAdmin.summary.pending')}
                value={summary.pending}
                valueStyle={{ color: '#d97706' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title={t('chatAdmin.summary.closed')} value={summary.closed} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title={t('chatAdmin.summary.unread')}
                value={summary.unreadMessages}
                valueStyle={{ color: '#dc2626' }}
              />
            </Card>
          </Col>
        </Row>
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card size="small" title={t('chatAdmin.conversations')} styles={{ body: { padding: 0 } }}>
            {conversations.length === 0 && !loading ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('chatAdmin.noConversations')}
                style={{ padding: 24 }}
              />
            ) : (
              <List
                loading={loading}
                dataSource={conversations}
                style={{ maxHeight: '65vh', overflowY: 'auto' }}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => void selectConversation(item)}
                    style={{
                      cursor: 'pointer',
                      padding: '12px 16px',
                      background: item.id === selectedId ? 'rgba(22,119,255,0.08)' : undefined,
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={6} wrap>
                          <span>{item.subject}</span>
                          <StatusTag status={item.status} />
                          {item.unreadForAdmin > 0 ? (
                            <Badge count={item.unreadForAdmin} size="small" />
                          ) : null}
                        </Space>
                      }
                      description={
                        <div className="space-y-1 text-xs">
                          <div>{item.userEmail ?? item.userId}</div>
                          <div>
                            <Tag>{t(TOPIC_LABEL_KEY[item.topic] as 'chatAdmin.topic.general')}</Tag>
                            {item.lastMessageAt ? formatDateTime(item.lastMessageAt, locale) : null}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={15}>
          <Card
            size="small"
            title={selected ? selected.subject : t('chatAdmin.conversations')}
            extra={
              selected ? (
                <Space wrap>
                  <Select
                    value={selected.status}
                    style={{ minWidth: 130 }}
                    onChange={(value: ConversationStatus) => void changeStatus(value)}
                    options={STATUS_OPTIONS.map((value) => ({
                      value,
                      label: t(`chatAdmin.status.${value}` as 'chatAdmin.status.open'),
                    }))}
                  />
                  <Button
                    size="small"
                    icon={<UserSwitchOutlined />}
                    disabled={currentUserId === null || selected.assignedTo === currentUserId}
                    onClick={() => void assignToMe()}
                  >
                    {t('chatAdmin.assignToMe')}
                  </Button>
                </Space>
              ) : null
            }
          >
            {selected === null ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('chatAdmin.selectPrompt')}
                style={{ padding: 40 }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>
                    {t('chatAdmin.user')}: <strong>{selected.userEmail ?? selected.userId}</strong>
                  </span>
                  <span>
                    {t('chatAdmin.topic')}:{' '}
                    {t(TOPIC_LABEL_KEY[selected.topic] as 'chatAdmin.topic.general')}
                  </span>
                  <span>
                    {t('chatAdmin.assigned')}:{' '}
                    {selected.assignedTo === null || selected.assignedTo === undefined
                      ? t('chatAdmin.unassigned')
                      : selected.assignedTo === currentUserId
                        ? t('chatAdmin.you')
                        : selected.assignedTo}
                  </span>
                </div>

                <div
                  className="space-y-3 overflow-y-auto rounded-md border border-gray-200 p-3 dark:border-gray-700"
                  style={{ maxHeight: '45vh', minHeight: 220 }}
                >
                  {messages.length === 0 && !messagesLoading ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t('chatAdmin.empty')}
                    />
                  ) : (
                    messages.map((item) => {
                      const isAdmin = item.senderRole === 'admin';
                      return (
                        <div
                          key={item.id}
                          className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="max-w-[80%]">
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm ${
                                isAdmin
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                              }`}
                            >
                              {item.body}
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-400">
                              {formatDateTime(item.createdAt, locale)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <Space.Compact style={{ width: '100%' }}>
                  <Input.TextArea
                    rows={2}
                    value={reply}
                    placeholder={t('chatAdmin.replyPlaceholder')}
                    onChange={(event) => setReply(event.target.value)}
                    onPressEnter={(event) => {
                      if (!event.shiftKey) {
                        event.preventDefault();
                        void handleReply();
                      }
                    }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={sending}
                    disabled={reply.trim().length === 0}
                    onClick={() => void handleReply()}
                  >
                    {sending ? t('chatAdmin.replying') : t('chatAdmin.reply')}
                  </Button>
                </Space.Compact>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
