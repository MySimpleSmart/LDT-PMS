import { Typography, Row, Col, Card, Space } from 'antd'
import {
  ProjectOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  RiseOutlined,
} from '@ant-design/icons'

export default function Dashboard() {
  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        Dashboard
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Overview of your projects and activity.
      </Typography.Text>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" hoverable>
            <Space>
              <div style={{ padding: 8, background: '#e6f4ff', borderRadius: 8 }}>
                <ProjectOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              </div>
              <div>
                <Typography.Text type="secondary">Projects</Typography.Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>0</div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" hoverable>
            <Space>
              <div style={{ padding: 8, background: '#f6ffed', borderRadius: 8 }}>
                <CheckSquareOutlined style={{ fontSize: 20, color: '#52c41a' }} />
              </div>
              <div>
                <Typography.Text type="secondary">Tasks</Typography.Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>0</div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" hoverable>
            <Space>
              <div style={{ padding: 8, background: '#fff7e6', borderRadius: 8 }}>
                <TeamOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
              </div>
              <div>
                <Typography.Text type="secondary">Team</Typography.Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>—</div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" hoverable>
            <Space>
              <div style={{ padding: 8, background: '#f9f0ff', borderRadius: 8 }}>
                <RiseOutlined style={{ fontSize: 20, color: '#722ed1' }} />
              </div>
              <div>
                <Typography.Text type="secondary">Active</Typography.Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>—</div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="Recent activity" size="small">
            <Typography.Text type="secondary">No recent activity yet. Create a project to get started.</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Quick actions" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text type="secondary">New project, new task, and more — coming soon.</Typography.Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
