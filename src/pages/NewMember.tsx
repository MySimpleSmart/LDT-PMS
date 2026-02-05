import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, Tag, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import AvatarPicker from '../components/AvatarPicker'
import { useCurrentUser } from '../context/CurrentUserContext'
import { SYSTEM_ROLE } from '../constants/roles'
import { ADMIN_POSITION_OPTIONS } from '../data/admins'

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

export default function NewMember() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useCurrentUser()
  const [form] = Form.useForm()

  useEffect(() => {
    if (!isSuperAdmin) navigate('/members', { replace: true })
  }, [isSuperAdmin, navigate])

  const onFinish = (values: Record<string, unknown>) => {
    const payload = { ...values, role: SYSTEM_ROLE.MEMBER }
    // TODO: Save to Firebase (e.g. addDoc to 'members' collection)
    console.log('New member:', payload)
    message.success('Member added successfully.')
    navigate('/members')
  }

  return (
    <div style={{ width: '100%' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/members')}
        style={{ marginBottom: 16 }}
      >
        Back to Members
      </Button>

      <Card title="Add new member">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ accountStatus: 'Active' }}
        >
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Member ID will be assigned automatically (e.g. LDA0001).
          </Typography.Text>

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
                  options={[
                    { value: 'Engineering', label: 'Engineering' },
                    { value: 'Product', label: 'Product' },
                    { value: 'Design', label: 'Design' },
                    { value: 'Marketing', label: 'Marketing' },
                    { value: 'Operations', label: 'Operations' },
                  ]}
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
            <Space>
              <Button type="primary" htmlType="submit">
                Add member
              </Button>
              <Button onClick={() => navigate('/members')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
