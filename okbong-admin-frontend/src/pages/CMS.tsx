import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTag } from '@/components/ui/StatusTag';
import { useI18n } from '@/lib/i18n';
import { DEMO_POSTS, type PostRow } from './demoData';

const CATEGORY_LABELS: Record<PostRow['category'], string> = {
  news: 'Tin tức',
  announcement: 'Thông báo',
  promotion: 'Khuyến mãi',
};

const CATEGORY_COLORS: Record<PostRow['category'], string> = {
  news: 'blue',
  announcement: 'purple',
  promotion: 'gold',
};

interface PostFormValues {
  title: string;
  category: PostRow['category'];
  status: PostRow['status'];
  content: string;
}

export function CMS() {
  const { t } = useI18n();
  const { modal, message } = App.useApp();
  const [rows, setRows] = useState<PostRow[]>(DEMO_POSTS);
  const [editing, setEditing] = useState<PostRow | null>(null);
  const [preview, setPreview] = useState<PostRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form] = Form.useForm<PostFormValues>();

  const openNew = () => {
    setIsNew(true);
    setEditing({
      id: `post-${Date.now()}`,
      title: '',
      category: 'news',
      status: 'draft',
      author: 'admin',
      publishedAt: null,
      createdAt: new Date().toISOString(),
      content: '',
    });
    form.resetFields();
  };

  const openEdit = (record: PostRow) => {
    setIsNew(false);
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      category: record.category,
      status: record.status,
      content: record.content,
    });
  };

  const handleSave = (values: PostFormValues) => {
    if (!editing) return;
    const updated: PostRow = {
      ...editing,
      ...values,
      publishedAt: values.status === 'published' ? (editing.publishedAt ?? new Date().toISOString()) : editing.publishedAt,
    };

    if (isNew) {
      setRows((current) => [updated, ...current]);
    } else {
      setRows((current) => current.map((row) => (row.id === editing.id ? updated : row)));
    }
    void message.success(t('common.save'));
    setEditing(null);
  };

  const handleDelete = (record: PostRow) => {
    modal.confirm({
      title: t('common.delete'),
      content: record.title,
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => setRows((current) => current.filter((row) => row.id !== record.id)),
    });
  };

  const columns: TableProps<PostRow>['columns'] = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      render: (value: PostRow['category']) => (
        <Tag color={CATEGORY_COLORS[value]}>{CATEGORY_LABELS[value]}</Tag>
      ),
    },
    {
      title: t('table.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusTag status={value} />,
    },
    { title: 'Tác giả', dataIndex: 'author', key: 'author' },
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
        CMS – Quản lý bài viết &amp; thông báo
      </Typography.Title>

      <DataTable<PostRow>
        columns={columns}
        rows={rows}
        rowKey="id"
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
              { value: 'published', label: 'Đã đăng' },
              { value: 'archived', label: 'Đã lưu trữ' },
            ],
          },
        ]}
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            {t('common.add')}
          </Button>
        }
      />

      {/* Form tạo / sửa bài viết */}
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
                  { value: 'published', label: 'Đã đăng' },
                  { value: 'archived', label: 'Đã lưu trữ' },
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

      {/* Modal xem trước bài viết */}
      <Modal
        open={preview !== null}
        title={preview?.title}
        onCancel={() => setPreview(null)}
        footer={<Button onClick={() => setPreview(null)}>{t('common.close')}</Button>}
        width={700}
      >
        {preview && (
          <div className="space-y-3">
            <Space>
              <Tag color={CATEGORY_COLORS[preview.category]}>{CATEGORY_LABELS[preview.category]}</Tag>
              <StatusTag status={preview.status} />
              <Typography.Text type="secondary">Tác giả: {preview.author}</Typography.Text>
              {preview.publishedAt && (
                <Typography.Text type="secondary">
                  Đăng lúc: {new Date(preview.publishedAt).toLocaleString()}
                </Typography.Text>
              )}
            </Space>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {preview.content}
            </Typography.Paragraph>
          </div>
        )}
      </Modal>
    </div>
  );
}
