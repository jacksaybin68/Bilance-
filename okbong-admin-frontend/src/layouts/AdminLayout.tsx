import {
  DashboardOutlined,
  FileTextOutlined,
  StopOutlined,
  BankOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
  BookOutlined,
  SettingOutlined,
  AlertOutlined,
  ScheduleOutlined,
  TeamOutlined,
  LogoutOutlined,
  BulbOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { Button, Breadcrumb, Layout, Menu, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, readSession } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { useThemeMode } from '@/lib/theme';

const { Sider, Content, Header } = Layout;

interface NavEntry {
  path: string;
  labelKey: MessageKey;
  icon: React.ReactNode;
}

const NAV_ENTRIES: NavEntry[] = [
  { path: '/', labelKey: 'nav.dashboard', icon: <DashboardOutlined /> },
  { path: '/users', labelKey: 'nav.users', icon: <TeamOutlined /> },
  { path: '/banned', labelKey: 'nav.banned', icon: <StopOutlined /> },
  { path: '/wallets', labelKey: 'nav.wallets', icon: <BankOutlined /> },
  { path: '/cards', labelKey: 'nav.cards', icon: <CreditCardOutlined /> },
  { path: '/bills', labelKey: 'nav.bills', icon: <FileTextOutlined /> },
  { path: '/payments', labelKey: 'nav.payments', icon: <ClockCircleOutlined /> },
  { path: '/plans', labelKey: 'nav.plans', icon: <BookOutlined /> },
  { path: '/settings', labelKey: 'nav.settings', icon: <SettingOutlined /> },
  { path: '/activity', labelKey: 'nav.activity', icon: <AlertOutlined /> },
  { path: '/cron', labelKey: 'nav.cron', icon: <ScheduleOutlined /> },
];

export function AdminLayout() {
  const { t, locale, setLocale } = useI18n();
  const { mode, toggle } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const session = useMemo(() => readSession(), [location.pathname]);

  const menuItems: MenuProps['items'] = NAV_ENTRIES.map((entry) => ({
    key: entry.path,
    icon: entry.icon,
    label: t(entry.labelKey),
  }));

  const activeEntry = NAV_ENTRIES.find((entry) => entry.path === location.pathname);

  const breadcrumbItems = [
    { title: t('nav.dashboard') },
    ...(activeEntry && activeEntry.path !== '/' ? [{ title: t(activeEntry.labelKey) }] : []),
  ];

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={64}
        width={240}
        theme={mode === 'dark' ? 'dark' : 'light'}
      >
        <div className="flex h-16 items-center gap-2 px-4">
          <span className="text-base font-bold text-primary">{collapsed ? 'OK' : t('app.admin')}</span>
        </div>
        <Menu
          mode="inline"
          theme={mode === 'dark' ? 'dark' : 'light'}
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header className="flex h-16 items-center justify-between gap-3 px-4">
          <Breadcrumb items={breadcrumbItems} />

          <Space wrap>
            {session ? (
              <Space size={4}>
                <Typography.Text type="secondary" className="hidden sm:inline">
                  {session.user.email}
                </Typography.Text>
                <Tag color="blue">{session.user.role}</Tag>
              </Space>
            ) : null}

            <Button
              icon={<TranslationOutlined />}
              onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
              aria-label={t('nav.language.toggle')}
            >
              {locale === 'vi' ? 'VI' : 'EN'}
            </Button>

            <Button
              icon={<BulbOutlined />}
              onClick={toggle}
              aria-label={t('nav.theme.toggle')}
            />

            <Button icon={<LogoutOutlined />} danger onClick={handleLogout}>
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </Button>
          </Space>
        </Header>

        <Content className="p-4 sm:p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
