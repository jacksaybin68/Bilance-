import { Button, Result } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ADMIN_ROLES, AdminRole, readSession } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';

interface RequireRoleProps {
  children: React.ReactNode;
  roles?: readonly AdminRole[];
}

/**
 * Route level role guard: renders a 403 result when the stored session is
 * missing or does not hold one of the allowed roles.
 */
export function RequireRole({ children, roles = ADMIN_ROLES }: RequireRoleProps) {
  const { t } = useI18n();
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    const session = readSession();
    setState(session !== null && roles.includes(session.user.role) ? 'allowed' : 'denied');
  }, [location.pathname, roles]);

  if (state === 'checking') return null;

  if (state === 'denied') {
    return (
      <Result
        status="403"
        title={t('common.forbidden.title')}
        subTitle={t('common.forbidden.body')}
        extra={
          <Link to="/login">
            <Button type="primary">{t('nav.dashboard')}</Button>
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
