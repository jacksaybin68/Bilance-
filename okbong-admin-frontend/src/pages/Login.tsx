import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { saveSession } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';

interface LoginFormValues {
  email: string;
  password: string;
}

interface TwoFactorState {
  sessionId: string;
  pendingSetup: boolean;
}

/**
 * Admin sign in. The password is verified by the backend and the role is read
 * back from `/auth/profile`; the form never chooses its own role.
 */
export function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorState | null>(null);
  const [otp, setOtp] = useState('');

  const completeSignIn = async (accessToken: string) => {
    const profile = await authApi.profile(accessToken);
    saveSession({
      user: { id: profile.id, email: profile.email, role: profile.role },
      accessToken,
      issuedAt: new Date().toISOString(),
    });
    navigate('/');
  };

  const handleFinish = async (values: LoginFormValues) => {
    setError('');
    setSubmitting(true);

    const email = values.email.trim().toLowerCase();

    try {
      const response = await apiClient.post<Record<string, unknown>>('/auth/login', {
        email,
        password: values.password,
      });

      if (response.requires2FA === true) {
        setTwoFactor({ sessionId: String(response.sessionId ?? ''), pendingSetup: response.pendingSetup === true });
        setSubmitting(false);
        return;
      }

      await completeSignIn(String(response.accessToken ?? ''));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? (caught.messages[0] ?? t('common.error')) : t('common.error'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!twoFactor) return;
    setError('');
    setSubmitting(true);

    try {
      const response = await apiClient.post<{ accessToken: string }>('/auth/2fa/verify', {
        sessionId: twoFactor.sessionId,
        token: otp.trim(),
      });
      await completeSignIn(response.accessToken);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? (caught.messages[0] ?? t('common.error')) : t('common.error'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (twoFactor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            {t('app.admin')}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            {twoFactor.pendingSetup ? t('login.twoFactorSetup') : t('login.twoFactor')}
          </Typography.Paragraph>

          {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

          <Form layout="vertical" onFinish={handleVerify}>
            <Form.Item label={t('table.value')}>
              <Input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                maxLength={6}
                autoFocus
                placeholder="123456"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              {t('login.verify')}
            </Button>
          </Form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          {t('app.admin')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">{t('nav.dashboard')}</Typography.Paragraph>

        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

        <Form<LoginFormValues> layout="vertical" onFinish={handleFinish}>
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
            label={t('table.password')}
            rules={[{ required: true, min: 6, message: t('common.error') }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            {t('nav.dashboard')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
