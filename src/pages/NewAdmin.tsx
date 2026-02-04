import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import AvatarPicker from '../components/AvatarPicker'

const departmentOptions = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
]

const roleOptions = [
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Manager', label: 'Manager' },
]

export default function NewAdmin() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const onFinish = (values: Record<string, unknown>) => {
    // TODO: Save to Firebase (e.g. addDoc to 'admins' collection)
    console.log('New admin:', values)
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
          initialValues={{ accountStatus: 'Active' }}
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

              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role" allowClear showSearch optionFilterProp="label" options={roleOptions} />
              </Form.Item>

              <Form.Item name="position" label="Position">
                <Input placeholder="e.g. System Administrator" />
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
