import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Descriptions,
  Button,
  Table,
  Space,
  Tabs,
  Timeline,
  Form,
  Input,
  message,
} from 'antd'
import type { TabsProps } from 'antd'
import { ArrowLeftOutlined, MailOutlined, PhoneOutlined, SettingOutlined, ProjectOutlined, CheckSquareOutlined, IdcardOutlined, EditOutlined, HistoryOutlined, LockOutlined } from '@ant-design/icons'

import { getAdminById, isSuperAdminId } from '../data/admins'
import { useCurrentUser } from '../context/CurrentUserContext'
import { ADMIN_ROLE } from '../constants/roles'
import MemberAvatar from '../components/MemberAvatar'

type ActivityItem = { id: string; action: string; date: string }

function getAdminActivityPlaceholder(adminId: string): ActivityItem[] {
  return [
    { id: '1', action: 'Logged in', date: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', action: 'Edited project Alpha', date: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', action: 'Created note "Sprint planning"', date: new Date(Date.now() - 172800000).toISOString() },
    { id: '4', action: 'Profile updated', date: new Date(Date.now() - 259200000).toISOString() },
  ]
}

function ActivityLogList({ activities }: { activities: ActivityItem[] }) {
  if (!activities.length) {
    return <Typography.Text type="secondary">No activity recorded yet.</Typography.Text>
  }
  return (
    <Timeline
      items={activities.map((a) => ({
        key: a.id,
        children: (
          <>
            <Typography.Text>{a.action}</Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {new Date(a.date).toLocaleString()}
            </Typography.Text>
          </>
        ),
      }))}
    />
  )
}

export default function AdminProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, currentAdminId } = useCurrentUser()
  const admin = id ? getAdminById(id) : null
  const isOwnProfile = Boolean(id && currentAdminId && (id === currentAdminId || id === String(currentAdminId)))
  const targetIsSuperAdmin = isSuperAdminId(id ?? '')
  const canEditProfile = isSuperAdmin || (!targetIsSuperAdmin && currentAdminId) // Super Admin can edit any; Admin can edit Admin (not Super Admin)
  const canSeeActivityAndSettings = isSuperAdmin || isOwnProfile
  const fullName = admin ? `${admin.firstName} ${admin.lastName}` : ''
  const [adminPasswordForm] = Form.useForm()
  const [adminEmailForm] = Form.useForm()
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false)
  const [adminEmailLoading, setAdminEmailLoading] = useState(false)
  if (!admin) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admins')}>
          Back to Admins
        </Button>
        <Typography.Text type="secondary">Admin not found.</Typography.Text>
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
                <Descriptions.Item label={<Space size={6}><MailOutlined />Email</Space>}>{admin.email}</Descriptions.Item>
                <Descriptions.Item label={<Space size={6}><PhoneOutlined />Phone</Space>}>{admin.phone}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card title="Department / Role / Position" size="small" style={{ flex: 1, width: '100%' }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Department">{admin.department}</Descriptions.Item>
                <Descriptions.Item label="Role">
                  <Tag color={admin.role === ADMIN_ROLE.SUPER_ADMIN ? 'gold' : 'blue'}>{admin.role}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Position">{admin.position}</Descriptions.Item>
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
          dataSource={admin.relatedProjects}
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
          dataSource={admin.relatedTasks}
          columns={taskColumns}
          pagination={false}
          size="small"
        />
      ),
    },
    ...(canSeeActivityAndSettings
      ? [
          {
            key: 'activity',
            label: (
              <span>
                <HistoryOutlined /> Activity Log
              </span>
            ),
            children: (
              <Card size="small" title="Recent activity">
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  Recent actions and events for this admin. Connect to your backend to show real data.
                </Typography.Text>
                <ActivityLogList activities={getAdminActivityPlaceholder(admin.adminId)} />
              </Card>
            ),
          },
          {
            key: 'settings',
            label: (
              <span>
                <SettingOutlined /> Settings
              </span>
            ),
            children: (isSuperAdmin || isOwnProfile) ? (
              <>
                <Card size="small" title={<Space><LockOutlined /> Change password</Space>} style={{ marginBottom: isSuperAdmin ? 16 : 0 }}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    {isOwnProfile ? 'Update your password.' : `Update password for this admin (${fullName}). Connect your backend to apply changes.`}
                  </Typography.Text>
                  <Form
                    form={adminPasswordForm}
                    layout="vertical"
                    onFinish={(values: { newPassword: string; confirmPassword: string }) => {
                      if (values.newPassword !== values.confirmPassword) {
                        message.error('New passwords do not match.')
                        return
                      }
                      setAdminPasswordLoading(true)
                      Promise.resolve().then(() => {
                        message.success('Password change requested for this admin. Connect your backend to complete.')
                        adminPasswordForm.resetFields()
                      }).finally(() => setAdminPasswordLoading(false))
                    }}
                    style={{ maxWidth: 400 }}
                  >
                    <Form.Item name="newPassword" label="New password" rules={[{ required: true, message: 'Enter a new password' }, { min: 6, message: 'At least 6 characters' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="New password" autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item
                      name="confirmPassword"
                      label="Confirm new password"
                      dependencies={['newPassword']}
                      rules={[{ required: true, message: 'Confirm new password' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) return Promise.resolve(); return Promise.reject(new Error('Passwords do not match')) } })]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={adminPasswordLoading}>Change password</Button>
                    </Form.Item>
                  </Form>
                </Card>
                {isSuperAdmin && (
                <Card size="small" title={<Space><MailOutlined /> Change email</Space>}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Update email address for this admin ({fullName}). Connect your backend to apply changes.
                  </Typography.Text>
                  <Form
                    form={adminEmailForm}
                    layout="vertical"
                    onFinish={(values: { newEmail: string; confirmEmail: string }) => {
                      if (values.newEmail !== values.confirmEmail) {
                        message.error('Email addresses do not match.')
                        return
                      }
                      setAdminEmailLoading(true)
                      Promise.resolve().then(() => {
                        message.success('Email change requested for this admin. Connect your backend to complete.')
                        adminEmailForm.resetFields()
                      }).finally(() => setAdminEmailLoading(false))
                    }}
                    style={{ maxWidth: 400 }}
                  >
                    <Form.Item name="newEmail" label="New email" rules={[{ required: true, message: 'Enter new email' }, { type: 'email', message: 'Enter a valid email' }]}>
                      <Input prefix={<MailOutlined />} placeholder="New email address" autoComplete="email" />
                    </Form.Item>
                    <Form.Item
                      name="confirmEmail"
                      label="Confirm new email"
                      dependencies={['newEmail']}
                      rules={[{ required: true, message: 'Confirm new email' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newEmail') === value) return Promise.resolve(); return Promise.reject(new Error('Emails do not match')) } })]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="Confirm new email" autoComplete="email" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={adminEmailLoading}>Change email</Button>
                    </Form.Item>
                  </Form>
                </Card>
                )}
              </>
            ) : (
              <Card size="small">
                <Typography.Text type="secondary">Notification, privacy, and account settings — coming soon.</Typography.Text>
              </Card>
            ),
          },
        ]
      : []),
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admins')}
        >
          Back to Admins
        </Button>
        {canEditProfile && (
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/admins/${id}/edit`)}>
            Edit profile
          </Button>
        )}
      </div>

      <Card>
        <Row gutter={24} align="top">
          <Col flex="none">
            <MemberAvatar
              profileImage={admin.profileImage}
              firstName={admin.firstName}
              lastName={admin.lastName}
              size={120}
            />
          </Col>
          <Col flex="auto">
            <Space align="center" style={{ marginBottom: 4 }}>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {fullName}
              </Typography.Title>
              <Tag color={admin.accountStatus === 'Active' ? 'green' : 'default'}>
                {admin.accountStatus}
              </Tag>
            </Space>
            <Typography.Text type="secondary" strong style={{ fontVariantNumeric: 'tabular-nums', display: 'block' }}>
              Admin ID: {admin.adminId}
            </Typography.Text>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="overview" items={tabItems} style={{ marginTop: 16 }} />
    </div>
  )
}
