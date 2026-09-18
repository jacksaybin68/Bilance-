import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { App, Button, Form, Input, Modal, Select, Space, Tag, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { errorMessage, useApi } from '@/lib/hooks/useApi';
import { contentApi, type AdminPostDto } from '@/lib/api/endpoints';

type PostCategory = AdminPostDto['category'];
type PostStatus = AdminPostDto['status'];

const CATEGORY_LABELS: Record<PostCategory, string> = {
  news: 'Tin tức',
  announcement: 'Thông báo',
  promotion: 'Khuyến mãi',
};

const CATEGORY_COLORS: Record<PostCategory, string> = {
  news: 'blue',
  announcement: 'purple',
  promotion: 'gold',
};

interface PostFormValues {
  title: string;
  category: PostCategory;
  status: PostStatus;
  content: string;
}

/** Content management backed by `/admin/content` (news / announcements / promos). */
export function CMS() {
  const { t } = useI18n();
  const { modal, message } = App.useApp();
  const [editing, setEditing] = useState<AdminPostDto | null>(null);
  const [preview, setPreview] = useState<AdminPostDto | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form] = Form.useForm<PostFormValues>();

  const load = useCallback((signal: AbortSignal) => contentApi.list({ limit: 100 }), []);
  const { data, loading, error, reload } = useApi(load);
  const rows = data?.items ?? [];

  const openNew = () => {
    setIsNew(true);
    setEditing({
      id: '',
      title: '',
      category: 'news',
      status: 'draft',
      content: '',
      author: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
    });
    form.resetFields();
    form.setFieldsValue({ category: 'news', status: 'draft', title: '', content: '' });
  };

  const openEdit = (record: AdminPostDto) => {
    setIsNew(false);
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      category: record.category,
      status: record.status,
      content: record.content,
    });
  };

  const handleSave = async (values: PostFormValues) => {
    if (!editing) return;
    try {
      if (isNew) await contentApi.create(values);
      else await contentApi.update(editing.id, values);
      message.success(t('common.save'));
      setEditing(null);
      reload();
    } catch (caught) {
      message.error(errorMessage(caught, t('common.error')));
    }
  };

  const handleDelete = (record: AdminPostDto) => {
    modal.confirm({
      title: t('common.delete'),
      content: record.title,
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await contentApi.remove(record.id);
          message.success(t('common.delete'));
          reload();
        } catch (caught) {
          message.error(errorMessage(caught, t('common.error')));
        }
      },
    });
  };

  const columns: TableProps<AdminPostDto>['columns'] = [
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      render: (value: PostCategory) => (
        <Tag color={CATEGORY_COLORS[value]}>{CATEGORY_LABELS[value]}</Tag>
      ),
    },
    {
      title: t('table.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusTag status={value} />,
    },
    { title: 'Tác giả', dataIndex: 'author', key: 'author', render: (value: string | null) => value ?? '—' },
    {
      title: 'Ngày đăng',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      render: (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_value, record) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setPreview(record)}>
            {t('common.view')}
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.cms.title')} – Bài viết &amp; thông báo
      </Typography.Title>

      {error ? <Typography.Text type="danger">{t('common.error')}</Typography.Text> : null}

      <DataTable<AdminPostDto>
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        searchKeys={['title', 'author']}
        filters={[
          {
            key: 'category',
            label: 'Danh mục',
            options: [
              { value: 'news', label: 'Tin tức' },
              { value: 'announcement', label: 'Thông báo' },
              { value: 'promotion', label: 'Khuyến mãi' },
            ],
          },
          {
            key: 'status',
            label: t('filter.status'),
            options: [
              { value: 'draft', label: t('status.draft') },
              { value: 'published', label: t('status.published') },
              { value: 'archived', label: t('status.archived') },
            ],
          },
        ]}
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            {t('common.add')}
          </Button>
        }
      />

      <Modal
        open={editing !== null}
        title={isNew ? 'Thêm bài viết mới' : 'Chỉnh sửa bài viết'}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={700}
        destroyOnHidden
      >
        <Form<PostFormValues> form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tiêu đề bài viết..." />
          </Form.Item>

          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="category" label="Danh mục" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select
                options={[
                  { value: 'news', label: 'Tin tức' },
                  { value: 'announcement', label: 'Thông báo' },
                  { value: 'promotion', label: 'Khuyến mãi' },
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label={t('table.status')} rules={[{ required: true }]} style={{ flex: 1, marginLeft: 16 }}>
              <Select
                options={[
                  { value: 'draft', label: t('status.draft') },
                  { value: 'published', label: t('status.published') },
                  { value: 'archived', label: t('status.archived') },
                ]}
              />
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
          >
            <Input.TextArea rows={8} placeholder="Nhập nội dung bài viết..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={preview !== null}
        title={preview?.title}
        onCancel={() => setPreview(null)}
        footer={<Button onClick={() => setPreview(null)}>{t('common.close')}</Button>}
        width={700}
      >
        {preview ? (
          <div className="space-y-3">
            <Space>
              <Tag color={CATEGORY_COLORS[preview.category]}>{CATEGORY_LABELS[preview.category]}</Tag>
              <StatusTag status={preview.status} />
              <Typography.Text type="secondary">Tác giả: {preview.author ?? '—'}</Typography.Text>
            </Space>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {preview.content}
            </Typography.Paragraph>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}