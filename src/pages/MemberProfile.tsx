import { useState, useEffect } from 'react'
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
  Form,
  Input,
  message,
} from 'antd'
import type { TabsProps } from 'antd'
import { ArrowLeftOutlined, MailOutlined, PhoneOutlined, SettingOutlined, ProjectOutlined, CheckSquareOutlined, IdcardOutlined, EditOutlined, HistoryOutlined, LockOutlined } from '@ant-design/icons'

import { getMemberById } from '../data/members'
import { useCurrentUser } from '../context/CurrentUserContext'
import MemberAvatar from '../components/MemberAvatar'
import ActivityLogTimeline from '../components/ActivityLogTimeline'

function sortActivityByNewest<T extends { createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()))
}

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, currentUserMemberId, isProjectLead } = useCurrentUser()
  const [member, setMember] = useState<Awaited<ReturnType<typeof getMemberById>>>(null)
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    if (!id) {
      setMember(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    getMemberById(id).then((m) => {
      if (active) {
        setMember(m)
        setLoading(false)
      }
    }).catch(() => {
      if (active) {
        setMember(null)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [id])

  const isOwnProfile = Boolean(member && currentUserMemberId && member.memberId.toUpperCase() === currentUserMemberId.toUpperCase())
  const showSettingsForLead = isProjectLead && isOwnProfile
  const fullName = member ? `${member.firstName} ${member.lastName}` : ''
  const [passwordForm] = Form.useForm()
  const [emailForm] = Form.useForm()
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  const activityItems = member
    ? sortActivityByNewest(member.activityLog || []).map((a) => ({
        key: a.key,
        label: a.description || a.type,
        sublabel: `${a.author ? `${a.author} · ` : ''}${new Date(a.createdAt || '').toLocaleString()}`,
      }))
    : []

  if (loading) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/members')}>
          Back to Members
        </Button>
        <Typography.Text type="secondary">Loading…</Typography.Text>
      </div>
    )
  }
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
                {member.jobType != null && member.jobType !== '' && (
                  <Descriptions.Item label="Job type">{member.jobType}</Descriptions.Item>
                )}
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
    ...((isSuperAdmin || isOwnProfile)
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
                <ActivityLogTimeline
                  items={activityItems}
                  description="Recent actions and events for this member."
                  emptyMessage="No activity recorded yet."
                />
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
            children: (
        <>
          <Card size="small" title={<Space><LockOutlined /> Change password</Space>} style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Update password for this member. Connect your backend to apply changes.
            </Typography.Text>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={(values: { newPassword: string; confirmPassword: string }) => {
                if (values.newPassword !== values.confirmPassword) {
                  message.error('New passwords do not match.')
                  return
                }
                setPasswordLoading(true)
                Promise.resolve().then(() => {
                  message.success('Password change requested. Connect your backend to complete.')
                  passwordForm.resetFields()
                }).finally(() => setPasswordLoading(false))
              }}
              style={{ maxWidth: 400 }}
            >
              <Form.Item
                name="newPassword"
                label="New password"
                rules={[{ required: true, message: 'Enter a new password' }, { min: 6, message: 'At least 6 characters' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="New password" autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirm new password"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                      return Promise.reject(new Error('Passwords do not match'))
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" autoComplete="new-password" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={passwordLoading}>Change password</Button>
              </Form.Item>
            </Form>
          </Card>
          <Card size="small" title={<Space><MailOutlined /> Change email</Space>}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Update email address for this member. Connect your backend to apply changes.
            </Typography.Text>
            <Form
              form={emailForm}
              layout="vertical"
              onFinish={(values: { newEmail: string; confirmEmail: string }) => {
                if (values.newEmail !== values.confirmEmail) {
                  message.error('Email addresses do not match.')
                  return
                }
                setEmailLoading(true)
                Promise.resolve().then(() => {
                  message.success('Email change requested. Connect your backend to complete.')
                  emailForm.resetFields()
                }).finally(() => setEmailLoading(false))
              }}
              style={{ maxWidth: 400 }}
            >
              <Form.Item
                name="newEmail"
                label="New email"
                rules={[{ required: true, message: 'Enter new email' }, { type: 'email', message: 'Enter a valid email' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="New email address" autoComplete="email" />
              </Form.Item>
              <Form.Item
                name="confirmEmail"
                label="Confirm new email"
                dependencies={['newEmail']}
                rules={[
                  { required: true, message: 'Confirm new email' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newEmail') === value) return Promise.resolve()
                      return Promise.reject(new Error('Emails do not match'))
                    },
                  }),
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Confirm new email" autoComplete="email" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={emailLoading}>Change email</Button>
              </Form.Item>
            </Form>
          </Card>
        </>
      ),
    },
        ]
      : []),
    ...(showSettingsForLead && !isSuperAdmin
      ? [
          {
            key: 'activity',
            label: (
              <span>
                <HistoryOutlined /> Activity Log
              </span>
            ),
            children: (
              <Card size="small" title="Your activity">
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  Recent actions and events for your account. Connect to your backend to show real data.
                </Typography.Text>
                <ActivityLogList entityName={fullName} activities={getMemberActivityPlaceholder(member.memberId)} />
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
            children: (
              <Card size="small" title={<Space><LockOutlined /> Change password</Space>}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  Update your account password.
                </Typography.Text>
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={(values: { newPassword: string; confirmPassword: string }) => {
                    if (values.newPassword !== values.confirmPassword) {
                      message.error('New passwords do not match.')
                      return
                    }
                    setPasswordLoading(true)
                    Promise.resolve().then(() => {
                      message.success('Password change requested. Connect your backend to complete.')
                      passwordForm.resetFields()
                    }).finally(() => setPasswordLoading(false))
                  }}
                  style={{ maxWidth: 400 }}
                >
                  <Form.Item
                    name="newPassword"
                    label="New password"
                    rules={[{ required: true, message: 'Enter a new password' }, { min: 6, message: 'At least 6 characters' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="New password" autoComplete="new-password" />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirm new password"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: 'Confirm your new password' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                          return Promise.reject(new Error('Passwords do not match'))
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" autoComplete="new-password" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={passwordLoading}>Change password</Button>
                  </Form.Item>
                </Form>
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
          onClick={() => navigate('/members')}
        >
          Back to Members
        </Button>
        {isSuperAdmin && (
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/members/${id}/edit`)}>
            Edit profile
          </Button>
        )}
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
