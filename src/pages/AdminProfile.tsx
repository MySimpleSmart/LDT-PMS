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

import { updatePassword, updateEmail } from 'firebase/auth'
import { getAdminById } from '../data/admins'
import { formatAustralianPhone } from '../utils/phone'
import type { AdminDetail } from '../data/admins'
import { useCurrentUser } from '../context/CurrentUserContext'
import { useAuth } from '../context/AuthContext'
import { ADMIN_ROLE } from '../constants/roles'
import MemberAvatar from '../components/MemberAvatar'
import ActivityLogTimeline from '../components/ActivityLogTimeline'

function sortActivityByNewest<T extends { createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()))
}

export default function AdminProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, currentAdminId, currentUserMemberId } = useCurrentUser()
  const { currentUser } = useAuth()
  const [admin, setAdmin] = useState<AdminDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setAdmin(null)
      setLoading(false)
      return
    }
    let active = true
    getAdminById(id).then((a) => {
      if (active) setAdmin(a)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const isOwnProfile = Boolean(id && currentUserMemberId && id === currentUserMemberId)
  const targetIsSuperAdmin = admin?.role === ADMIN_ROLE.SUPER_ADMIN
  const canEditProfile = isSuperAdmin || (!targetIsSuperAdmin && currentAdminId)
  const canSeeActivityAndSettings = isSuperAdmin || isOwnProfile
  const fullName = admin ? `${admin.firstName} ${admin.lastName}` : ''
  const [adminPasswordForm] = Form.useForm()
  const [adminEmailForm] = Form.useForm()
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false)
  const [adminEmailLoading, setAdminEmailLoading] = useState(false)

  const activityItems = admin
    ? sortActivityByNewest(admin.activityLog || []).map((a) => ({
        key: a.key,
        label: a.description || a.type,
        sublabel: `${a.author ? `${a.author} · ` : ''}${new Date(a.createdAt || '').toLocaleString()}`,
      }))
    : []

  if (loading) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admins')}>
          Back to Admins
        </Button>
        <Typography.Text type="secondary">Loading…</Typography.Text>
      </div>
    )
  }
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
                <Descriptions.Item label={<Space size={6}><PhoneOutlined />Phone</Space>}>
                {admin.phone ? formatAustralianPhone(admin.phone) || admin.phone : '—'}
              </Descriptions.Item>
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
                <ActivityLogTimeline
                  items={activityItems}
                  description="Recent actions and events for this admin."
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
            children: (isSuperAdmin || isOwnProfile) ? (
              <>
                <Card size="small" title={<Space><LockOutlined /> Change password</Space>} style={{ marginBottom: (isSuperAdmin || isOwnProfile) ? 16 : 0 }}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    {isOwnProfile ? 'Update your password.' : `Update password for this admin (${fullName}). Requires server-side Admin SDK.`}
                  </Typography.Text>
                  <Form
                    form={adminPasswordForm}
                    layout="vertical"
                    onFinish={async (values: { newPassword: string; confirmPassword: string }) => {
                      if (values.newPassword !== values.confirmPassword) {
                        message.error('New passwords do not match.')
                        return
                      }
                      if (isOwnProfile && !currentUser) {
                        message.error('You must be signed in to change your password.')
                        return
                      }
                      if (isOwnProfile && currentUser) {
                        setAdminPasswordLoading(true)
                        try {
                          await updatePassword(currentUser, values.newPassword)
                          message.success('Password updated successfully.')
                          adminPasswordForm.resetFields()
                        } catch (err: unknown) {
                          const msg = err && typeof err === 'object' && 'code' in err
                            ? (err as { code: string }).code === 'auth/requires-recent-login'
                              ? 'Please sign out and sign in again, then try changing your password.'
                              : err && typeof err === 'object' && 'message' in err
                                ? String((err as { message: string }).message)
                                : 'Failed to update password'
                            : 'Failed to update password'
                          message.error(msg)
                        } finally {
                          setAdminPasswordLoading(false)
                        }
                        return
                      }
                      message.info('Changing another admin\'s password requires server-side Admin SDK integration.')
                      adminPasswordForm.resetFields()
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
                {(isSuperAdmin || isOwnProfile) && (
                <Card size="small" title={<Space><MailOutlined /> Change email</Space>}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    {isOwnProfile ? 'Update your email address.' : `Update email for this admin (${fullName}). Requires server-side Admin SDK.`}
                  </Typography.Text>
                  <Form
                    form={adminEmailForm}
                    layout="vertical"
                    onFinish={async (values: { newEmail: string; confirmEmail: string }) => {
                      if (values.newEmail !== values.confirmEmail) {
                        message.error('Email addresses do not match.')
                        return
                      }
                      if (isOwnProfile && !currentUser) {
                        message.error('You must be signed in to change your email.')
                        return
                      }
                      if (isOwnProfile && currentUser) {
                        setAdminEmailLoading(true)
                        try {
                          await updateEmail(currentUser, values.newEmail)
                          message.success('Email updated successfully. Please verify the new address.')
                          adminEmailForm.resetFields()
                        } catch (err: unknown) {
                          const msg = err && typeof err === 'object' && 'code' in err
                            ? (err as { code: string }).code === 'auth/requires-recent-login'
                              ? 'Please sign out and sign in again, then try changing your email.'
                              : err && typeof err === 'object' && 'message' in err
                                ? String((err as { message: string }).message)
                                : 'Failed to update email'
                            : 'Failed to update email'
                          message.error(msg)
                        } finally {
                          setAdminEmailLoading(false)
                        }
                        return
                      }
                      message.info('Changing another admin\'s email requires server-side Admin SDK integration.')
                      adminEmailForm.resetFields()
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
