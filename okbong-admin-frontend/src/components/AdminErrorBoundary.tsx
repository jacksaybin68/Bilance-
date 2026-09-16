import { ReactNode, useEffect, useState } from 'react';
import { Button, Result, Space } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';

interface AdminErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminErrorBoundary({ children, fallback }: AdminErrorBoundaryProps) {
  const { t } = useI18n();
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; stack?: string } | null>(null);

  useEffect(() => {
    const logger = console;
    const originalError = logger.error;
    logger.error = function (message?: unknown, ...args: unknown[]) {
      if (message instanceof Error) {
        setErrorInfo({ message: message.message, stack: message.stack });
      }
      return originalError.apply(this, [message, ...args]);
    };
    return () => {
      logger.error = originalError;
    };
  }, []);

  if (fallback) {
    return <>{fallback}</>;
  }

  if (hasError) {
    return (
      <Result
        status="error"
        icon={<WarningOutlined style={{ color: 'var(--color-primary)' }} />}
        title={t('common.error')}
        subTitle={errorInfo?.message ?? 'Không có thông tin lỗi'}
        extra={
          <Space>
            <Button type="primary" onClick={() => window.location.reload()}>
              {t('common.retry')}
            </Button>
          </Space>
        }
      />
    );
  }

  return <>{children}</>;
}
