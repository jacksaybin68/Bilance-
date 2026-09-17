import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiClient } from '@/lib/api/client';
import { ADMIN_ROLES, AdminRole, isAdminRole, saveSession } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';

interface LoginFormValues {
  email: string;
  password: string;
}

/** Admin sign in. The role is taken from the server profile, never the form. */
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

      // The role must come from the server: trusting a form value would let any
      // account promote itself to admin.
      const profile = await apiClient.get<{ id: string; email: string; fullName?: string; role: AdminRole }>(
        '/auth/profile',
        { token: response.accessToken },
      );

      if (!isAdminRole(profile.role) || !ADMIN_ROLES.includes(profile.role)) {
        setError(t('auth.error.notAdmin'));
        setSubmitting(false);
        return;
      }

      saveSession({
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          role: profile.role,
        },
        accessToken: response.accessToken,
        issuedAt: new Date().toISOString(),
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? (caught.messages[0] ?? t('common.error')) : t('common.error'),
      );
      setSubmitting(false);
      return;
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
        <Typography.Paragraph type="secondary">{t('auth.login.subtitle')}</Typography.Paragraph>

        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

        <Form<LoginFormValues>
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="email"
            label={t('table.email')}
            rules={[
              { required: true, message: t('common.error') },
              { type: 'email', message: t('common.error') },
            ]}
          >
            <Input prefix={<MailOutlined />} autoComplete="email" placeholder={t('auth.login.email.placeholder')} />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('auth.login.password')}
            rules={[{ required: true, min: 6, message: t('common.error') }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            {t('auth.login.submit')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
