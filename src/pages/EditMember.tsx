import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, Tag, message, Row, Col, Modal, Spin } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { appendMemberActivity, getMemberById, updateMember, type MemberDetail } from '../data/members'
import AvatarPicker from '../components/AvatarPicker'
import { useCurrentUser } from '../context/CurrentUserContext'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { SYSTEM_ROLE } from '../constants/roles'
import type { ProjectActivity } from '../types/project'

const departmentOptions = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
]

export default function EditMember() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, currentUserMemberId, refreshMemberProfile, displayName } = useCurrentUser()
  const { jobTypes, positions } = useProjectMeta()
  const jobTypeOptions = jobTypes.map((v) => ({ value: v, label: v }))
  const positionOptions = positions.map((v) => ({ value: v, label: v }))
  const [form] = Form.useForm()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    if (!isSuperAdmin) navigate('/members', { replace: true })
  }, [isSuperAdmin, navigate])

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
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (member) {
      form.setFieldsValue({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        department: member.department,
        jobType: member.jobType ?? '',
        position: member.position,
        accountStatus: member.accountStatus,
        profileImage: member.profileImage ?? undefined,
      })
    }
  }, [member, form])

  const handleRemoveMember = () => {
    Modal.confirm({
      title: 'Remove member',
      content: `Are you sure you want to remove ${member?.firstName} ${member?.lastName}? They will lose access to the system.`,
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        // TODO: Remove from Firebase (deleteDoc from 'members' collection)
        message.success('Member removed.')
        navigate('/members')
      },
    })
  }

  const [saving, setSaving] = useState(false)
  const onFinish = async (values: Record<string, unknown>) => {
    if (!id || !member) return
    setSaving(true)
    try {
      await updateMember(member.memberId, {
        firstName: String(values.firstName ?? ''),
        lastName: String(values.lastName ?? ''),
        email: String(values.email ?? ''),
        phone: values.phone ? String(values.phone) : undefined,
        department: String(values.department ?? ''),
        jobType: values.jobType ? String(values.jobType) : undefined,
        position: values.position ? String(values.position) : undefined,
        accountStatus: (values.accountStatus as 'Active' | 'Inactive') ?? 'Active',
        avatarUrl: values.profileImage ? String(values.profileImage) : null,
      })
      const activity: ProjectActivity = {
        key: `activity-${Date.now()}`,
        type: 'profile_updated',
        description: 'Updated profile details',
        author: displayName || 'Current user',
        createdAt: new Date().toISOString(),
      }
      appendMemberActivity(member.memberId, activity).catch(() => {})
      const isEditingSelf = currentUserMemberId && member.memberId.toUpperCase() === currentUserMemberId.toUpperCase()
      if (isEditingSelf) await refreshMemberProfile()
      message.success('Profile updated successfully.')
      navigate(`/members/${id}`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!id) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/members')}>
          Back to Members
        </Button>
        <Typography.Text type="secondary">Member ID required.</Typography.Text>
      </div>
    )
  }
  if (loading) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/members')}>
          Back to Members
        </Button>
        <Spin style={{ marginTop: 16 }} />
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

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/members/${id}`)}
        >
          Back to profile
        </Button>
      </div>

      <Card title="Edit member">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Member ID: {member.memberId} (read-only)
        </Typography.Text>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
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
                <Input placeholder="Jane" />
              </Form.Item>

              <Form.Item
                name="lastName"
                label="Last name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Doe" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input placeholder="jane.doe@company.com" type="email" />
              </Form.Item>

              <Form.Item name="phone" label="Phone">
                <Input placeholder="+1 234 567 8900" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                name="department"
                label="Department"
                rules={[{ required: true, message: 'Please select or enter department' }]}
              >
                <Select
                  placeholder="Select or type department"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={departmentOptions}
                />
              </Form.Item>

              <Form.Item label="Role">
                <Tag color="default">{SYSTEM_ROLE.MEMBER}</Tag>
              </Form.Item>

              <Form.Item name="jobType" label="Job type" rules={[{ required: true, message: 'Please select job type' }]}>
                <Select placeholder="Select job type" allowClear showSearch optionFilterProp="label" options={jobTypeOptions} />
              </Form.Item>

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
              <Button onClick={() => navigate(`/members/${id}`)} disabled={saving}>
                Cancel
              </Button>
              {isSuperAdmin && (
                <Button danger icon={<DeleteOutlined />} onClick={handleRemoveMember}>
                  Remove member
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
