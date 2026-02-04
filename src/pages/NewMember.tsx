import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import AvatarPicker from '../components/AvatarPicker'

export default function NewMember() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const onFinish = (values: Record<string, unknown>) => {
    // TODO: Save to Firebase (e.g. addDoc to 'members' collection)
    console.log('New member:', values)
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

              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select or enter role' }]}
              >
                <Select
                  placeholder="Select or type role"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={[
                    { value: 'Developer', label: 'Developer' },
                    { value: 'Designer', label: 'Designer' },
                    { value: 'Manager', label: 'Manager' },
                    { value: 'Analyst', label: 'Analyst' },
                  ]}
                />
              </Form.Item>

              <Form.Item name="position" label="Position">
                <Input placeholder="e.g. Senior Software Engineer" />
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
