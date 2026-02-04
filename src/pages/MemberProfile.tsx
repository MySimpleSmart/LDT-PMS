import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography,
  Card,
  Row,
  Col,
  Avatar,
  Tag,
  Descriptions,
  Button,
  Table,
  Space,
  Tabs,
} from 'antd'
import type { TabsProps } from 'antd'
import { ArrowLeftOutlined, MailOutlined, PhoneOutlined, SettingOutlined, ProjectOutlined, CheckSquareOutlined, IdcardOutlined, EditOutlined } from '@ant-design/icons'

import { getMemberById } from '../data/members'
import MemberAvatar from '../components/MemberAvatar'

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const member = id ? getMemberById(id) : null
  const fullName = member ? `${member.firstName} ${member.lastName}` : ''

  if (!member) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/members')}>
          Back to Members
        </Button>
        <Typography.Text type="secondary">Member not found.</Typography.Text>
      </div>
    )
  }

  const projectColumns = [
    { title: 'Project', dataIndex: 'name', key: 'name' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
  ]
  const taskColumns = [
    { title: 'Task', dataIndex: 'title', key: 'title' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Project', dataIndex: 'project', key: 'project' },
  ]

  const tabItems: TabsProps['items'] = [
    {
      key: 'overview',
      label: (
        <span>
          <IdcardOutlined /> Overview
        </span>
      ),
      children: (
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card title="Basic & Contact Details" size="small" style={{ flex: 1, width: '100%' }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label={<Space size={6}><MailOutlined />Email</Space>}>{member.email}</Descriptions.Item>
                <Descriptions.Item label={<Space size={6}><PhoneOutlined />Phone</Space>}>{member.phone}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card title="Department / Role / Position" size="small" style={{ flex: 1, width: '100%' }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Department">{member.department}</Descriptions.Item>
                <Descriptions.Item label="Role">{member.role}</Descriptions.Item>
                <Descriptions.Item label="Position">{member.position}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'projects',
      label: (
        <span>
          <ProjectOutlined /> Related Projects
        </span>
      ),
      children: (
        <Table
          dataSource={member.relatedProjects}
          columns={projectColumns}
          pagination={false}
          size="small"
        />
      ),
    },
    {
      key: 'tasks',
      label: (
        <span>
          <CheckSquareOutlined /> Related Tasks
        </span>
      ),
      children: (
        <Table
          dataSource={member.relatedTasks}
          columns={taskColumns}
          pagination={false}
          size="small"
        />
      ),
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined /> Settings
        </span>
      ),
      children: (
        <Card size="small">
          <Typography.Text type="secondary">Notification, privacy, and account settings — coming soon.</Typography.Text>
        </Card>
      ),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/members')}
        >
          Back to Members
        </Button>
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/members/${id}/edit`)}>
          Edit profile
        </Button>
      </div>

      <Card>
        <Row gutter={24} align="top">
          <Col flex="none">
            <MemberAvatar
              profileImage={member.profileImage}
              firstName={member.firstName}
              lastName={member.lastName}
              size={120}
            />
          </Col>
          <Col flex="auto">
            <Space align="center" style={{ marginBottom: 4 }}>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {fullName}
              </Typography.Title>
              <Tag color={member.accountStatus === 'Active' ? 'green' : 'default'}>
                {member.accountStatus}
              </Tag>
            </Space>
            <Typography.Text type="secondary" strong style={{ fontVariantNumeric: 'tabular-nums', display: 'block' }}>
              Member ID: {member.memberId}
            </Typography.Text>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="overview" items={tabItems} style={{ marginTop: 16 }} />
    </div>
  )
}
