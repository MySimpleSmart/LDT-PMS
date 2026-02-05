import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, Tag, message, Row, Col, Modal } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { getMemberById } from '../data/members'
import AvatarPicker from '../components/AvatarPicker'
import { useCurrentUser } from '../context/CurrentUserContext'
import { SYSTEM_ROLE } from '../constants/roles'
import { ADMIN_POSITION_OPTIONS } from '../data/admins'

const departmentOptions = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
]

const jobTypeOptions = [
  { value: 'Developer', label: 'Developer' },
  { value: 'Designer', label: 'Designer' },
  { value: 'QA', label: 'QA' },
  { value: 'PM', label: 'PM' },
  { value: 'Coordinator', label: 'Coordinator' },
  { value: 'Marketer', label: 'Marketer' },
  { value: 'DevOps', label: 'DevOps' },
  { value: 'Researcher', label: 'Researcher' },
  { value: 'Analyst', label: 'Analyst' },
]

export default function EditMember() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin } = useCurrentUser()
  const [form] = Form.useForm()
  const member = id ? getMemberById(id) : null

  useEffect(() => {
    if (!isSuperAdmin) navigate('/members', { replace: true })
  }, [isSuperAdmin, navigate])

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

  const onFinish = (values: Record<string, unknown>) => {
    const payload = { ...values, role: SYSTEM_ROLE.MEMBER }
    // TODO: Update in Firebase (e.g. updateDoc in 'members' collection)
    console.log('Update member:', id, payload)
    message.success('Profile updated successfully.')
    navigate(`/members/${id}`)
  }

  if (!id || !member) {
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
                <Select placeholder="Select position" allowClear showSearch optionFilterProp="label" options={ADMIN_POSITION_OPTIONS} />
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
              <Button type="primary" htmlType="submit">
                Save changes
              </Button>
              <Button onClick={() => navigate(`/members/${id}`)}>
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
