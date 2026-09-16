import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Select, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiClient } from '@/lib/api/client';
import { AdminRole, saveSession, signInLocal } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';

interface LoginFormValues {
  email: string;
  password: string;
  role: AdminRole;
}

/** Admin sign in. Falls back to a local session when the API is unreachable. */
export function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async (values: LoginFormValues) => {
    setError('');
    setSubmitting(true);

    try {
      const response = await apiClient.post<{ accessToken: string }>('/auth/login', {
        email: values.email.trim(),
        password: values.password,
      });

      saveSession({
        user: { id: 'api-admin', email: values.email.trim(), role: values.role },
        accessToken: response.accessToken,
        issuedAt: new Date().toISOString(),
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.isNetworkError) {
        signInLocal(values.email.trim(), values.role);
      } else {
        setError(
          caught instanceof ApiError ? (caught.messages[0] ?? t('common.error')) : t('common.error'),
        );
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          {t('app.admin')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">{t('nav.dashboard')}</Typography.Paragraph>

        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

        <Form<LoginFormValues>
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ role: 'admin' }}
        >
          <Form.Item
            name="email"
            label={t('table.email')}
            rules={[
              { required: true, message: t('common.error') },
              { type: 'email', message: t('common.error') },
            ]}
          >
            <Input prefix={<MailOutlined />} autoComplete="email" placeholder="admin@okbong.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('table.value')}
            rules={[{ required: true, min: 6, message: t('common.error') }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>

          <Form.Item name="role" label={t('filter.role')}>
            <Select
              options={[
                { value: 'admin', label: t('role.admin') },
                { value: 'super_admin', label: t('role.super_admin') },
                { value: 'moderator', label: t('role.moderator') },
              ]}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            {t('nav.dashboard')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
