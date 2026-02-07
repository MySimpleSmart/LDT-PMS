import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, Tag, message, Row, Col, Modal, Spin } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { getAdminById } from '../data/admins'
import type { AdminDetail } from '../data/admins'
import { updateMember } from '../data/members'
import { isValidAustralianPhone, AU_PHONE_PLACEHOLDER, AU_PHONE_VALIDATION_MESSAGE } from '../utils/phone'
import { useCurrentUser } from '../context/CurrentUserContext'
import { ADMIN_ROLE } from '../constants/roles'
import AvatarPicker from '../components/AvatarPicker'
import { useProjectMeta } from '../context/ProjectMetaContext'

const departmentOptions = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
]

export default function EditAdmin() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, currentAdminId } = useCurrentUser()
  const [form] = Form.useForm()
  const [admin, setAdmin] = useState<AdminDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { positions } = useProjectMeta()
  const positionOptions = positions.map((v) => ({ value: v, label: v }))

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

  const isEditingSuperAdmin = admin?.role === ADMIN_ROLE.SUPER_ADMIN
  const canEdit = isSuperAdmin
    ? true
    : !isEditingSuperAdmin && currentAdminId
  const canRemoveAdmin = isSuperAdmin && !isEditingSuperAdmin

  const handleRemoveAdmin = () => {
    if (!id) return
    Modal.confirm({
      title: 'Remove admin',
      content: `Are you sure you want to remove ${admin?.firstName} ${admin?.lastName}? They will lose admin access and become a Member.`,
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await updateMember(id, { role: 'member' })
          message.success('Admin removed. They are now a Member.')
          navigate('/admins')
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to remove admin.')
        }
      },
    })
  }

  useEffect(() => {
    if (!loading && admin !== null && !canEdit) navigate('/admins', { replace: true })
  }, [admin, canEdit, loading, navigate])

  useEffect(() => {
    if (admin) {
      form.setFieldsValue({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        department: admin.department,
        role: admin.role,
        position: admin.position,
        accountStatus: admin.accountStatus,
        profileImage: admin.profileImage ?? undefined,
      })
    }
  }, [admin, form])

  const onFinish = async (values: Record<string, unknown>) => {
    if (!id || !admin) return
    const roleDisplay = (isEditingSuperAdmin && isSuperAdmin) ? (values.role as string) : admin.role
    const roleFirestore = roleDisplay === 'Super Admin' ? 'super_admin' : 'admin'
    const accountStatus = (values.accountStatus ?? form.getFieldValue('accountStatus') ?? admin.accountStatus) as 'Active' | 'Inactive'
    setSaving(true)
    try {
      await updateMember(id, {
        firstName: String(values.firstName ?? ''),
        lastName: String(values.lastName ?? ''),
        email: String(values.email ?? ''),
        phone: values.phone ? String(values.phone) : undefined,
        department: String(values.department ?? ''),
        position: values.position ? String(values.position) : undefined,
        accountStatus: accountStatus === 'Active' || accountStatus === 'Inactive' ? accountStatus : 'Active',
        avatarUrl: values.profileImage ? String(values.profileImage) : null,
        role: roleFirestore,
      })
      message.success('Profile updated successfully.')
      navigate(`/admins/${id}`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admins')}>
          Back to Admins
        </Button>
        <Typography.Text type="secondary">Loading…</Typography.Text>
        <Spin style={{ marginTop: 16 }} />
      </div>
    )
  }
  if (!id || !admin) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admins')}>
          Back to Admins
        </Button>
        <Typography.Text type="secondary">Admin not found.</Typography.Text>
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/admins/${id}`)}
        >
          Back to profile
        </Button>
      </div>

      <Card title="Edit admin">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Admin ID: {admin.adminId} (read-only)
        </Typography.Text>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="profileImage" label="Profile image">
            <AvatarPicker />
          </Form.Item>

          <Row gutter={24}>
            <Col xs={24} lg={12}>
              <Form.Item
                name="firstName"
                label="First name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="Sam" />
              </Form.Item>

              <Form.Item
                name="lastName"
                label="Last name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Admin" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input placeholder="sam.admin@company.com" type="email" />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Phone"
                rules={[
                  {
                    validator: (_, value) =>
                      !value || isValidAustralianPhone(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error(AU_PHONE_VALIDATION_MESSAGE)),
                  },
                ]}
              >
                <Input placeholder={AU_PHONE_PLACEHOLDER} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                name="department"
                label="Department"
                rules={[{ required: true, message: 'Please select department' }]}
              >
                <Select placeholder="Select department" allowClear showSearch optionFilterProp="label" options={departmentOptions} />
              </Form.Item>

              {isEditingSuperAdmin && isSuperAdmin ? (
                <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: ADMIN_ROLE.SUPER_ADMIN, label: 'Super Admin' },
                      { value: ADMIN_ROLE.ADMIN, label: 'Admin' },
                    ]}
                  />
                </Form.Item>
              ) : (
                <Form.Item label="Role">
                  <Tag color={admin.role === ADMIN_ROLE.SUPER_ADMIN ? 'gold' : 'blue'}>{admin.role}</Tag>
                </Form.Item>
              )}

              <Form.Item name="position" label="Position">
                <Select placeholder="Select position" allowClear showSearch optionFilterProp="label" options={positionOptions} />
              </Form.Item>

              <Form.Item name="accountStatus" label="Account status">
                <Select
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space wrap>
              <Button type="primary" htmlType="submit" loading={saving}>
                Save changes
              </Button>
              <Button onClick={() => navigate(`/admins/${id}`)}>
                Cancel
              </Button>
              {canRemoveAdmin && (
                <Button danger icon={<DeleteOutlined />} onClick={handleRemoveAdmin}>
                  Remove admin
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
