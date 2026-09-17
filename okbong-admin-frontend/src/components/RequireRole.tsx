import { Button, Result } from 'antd';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ADMIN_ROLES, AdminRole, clearSession, isSessionExpired, readSession } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';

interface RequireRoleProps {
  children: React.ReactNode;
  roles?: readonly AdminRole[];
}

/**
 * Route level role guard. A missing or expired session redirects to the login
 * screen; a valid session without one of the allowed roles renders a 403. The
 * expired case must be cleared first, otherwise every request 401s and the
 * console renders as empty rather than asking for a fresh login.
 */
export function RequireRole({ children, roles = ADMIN_ROLES }: RequireRoleProps) {
  const { t } = useI18n();
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'allowed' | 'denied' | 'anonymous'>(
    'checking',
  );

  useEffect(() => {
    if (isSessionExpired()) clearSession();

    const session = readSession();
    if (session === null) {
      setState('anonymous');
      return;
    }

    setState(roles.includes(session.user.role) ? 'allowed' : 'denied');
  }, [location.pathname, roles]);

  if (state === 'checking') return null;

  if (state === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

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
