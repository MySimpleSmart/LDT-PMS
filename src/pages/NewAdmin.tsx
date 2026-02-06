import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, Tag, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import AvatarPicker from '../components/AvatarPicker'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import { ADMIN_ROLE } from '../constants/roles'

const departmentOptions = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
]

export default function NewAdmin() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useCurrentUser()
  const { positions } = useProjectMeta()
  const positionOptions = positions.map((v) => ({ value: v, label: v }))
  const [form] = Form.useForm()

  useEffect(() => {
    if (!isSuperAdmin) navigate('/admins', { replace: true })
  }, [isSuperAdmin, navigate])

  const onFinish = (values: Record<string, unknown>) => {
    const payload = { ...values, role: ADMIN_ROLE.ADMIN }
    // TODO: Save to Firebase (e.g. addDoc to 'admins' collection)
    console.log('New admin:', payload)
    message.success('Admin added successfully.')
    navigate('/admins')
  }

  return (
    <div style={{ width: '100%' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/admins')}
        style={{ marginBottom: 16 }}
      >
        Back to Admins
      </Button>

      <Card title="Add new admin">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ accountStatus: 'Active', role: ADMIN_ROLE.ADMIN }}
        >
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Admin ID will be assigned automatically (e.g. ADA0001).
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

              <Form.Item name="phone" label="Phone">
                <Input placeholder="+1 234 567 8900" />
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

              <Form.Item label="Role">
                <Tag color="blue">{ADMIN_ROLE.ADMIN}</Tag>
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
            <Space>
              <Button type="primary" htmlType="submit">
                Add admin
              </Button>
              <Button onClick={() => navigate('/admins')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
