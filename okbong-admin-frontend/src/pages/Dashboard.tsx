import { FileTextOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { Card, Col, List, Row, Statistic, Typography } from 'antd';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';

interface MetricCard {
  key: string;
  titleKey: MessageKey;
  value: number | string;
  icon: React.ReactNode;
}

const ACTIVITY: { key: MessageKey; minutes: number }[] = [
  { key: 'page.dashboard.newUser', minutes: 2 },
  { key: 'page.dashboard.deposit', minutes: 15 },
  { key: 'page.dashboard.billCreated', minutes: 30 },
];

const GROWTH_SERIES = [12, 18, 15, 24, 30, 28, 36, 42, 38, 46, 52, 58];

export function DashboardPage() {
  const { t } = useI18n();

  const metrics: MetricCard[] = [
    { key: 'users', titleKey: 'metric.totalUsers', value: 1245, icon: <TeamOutlined /> },
    { key: 'bills', titleKey: 'metric.totalBills', value: 3421, icon: <FileTextOutlined /> },
    { key: 'balance', titleKey: 'metric.totalBalance', value: '45,890.50 BDSD', icon: <WalletOutlined /> },
  ];

  const max = Math.max(...GROWTH_SERIES);

  return (
    <div className="space-y-6">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t('page.dashboard.title')}
      </Typography.Title>

      <Row gutter={[16, 16]}>
        {metrics.map((metric) => (
          <Col key={metric.key} xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title={t(metric.titleKey)}
                value={metric.value}
                prefix={metric.icon}
                valueStyle={{ color: '#2563eb' }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t('page.dashboard.recentActivity')}>
            <List
              dataSource={ACTIVITY}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={t(item.key)}
                    description={t('page.dashboard.minutesAgo', { count: item.minutes })}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={t('page.dashboard.statistics')}>
            <Typography.Text type="secondary">{t('page.dashboard.userGrowth')}</Typography.Text>
            <div className="mt-3 h-48">
              <svg
                role="img"
                aria-label={t('page.dashboard.userGrowth')}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="h-full w-full text-primary"
              >
                {GROWTH_SERIES.map((value, index) => {
                  const width = 100 / GROWTH_SERIES.length;
                  const height = (value / max) * 100;
                  return (
                    <rect
                      key={`${index}-${value}`}
                      x={index * width + width * 0.15}
                      y={100 - height}
                      width={width * 0.7}
                      height={height}
                      fill="currentColor"
                      rx={1}
                    />
                  );
                })}
              </svg>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
