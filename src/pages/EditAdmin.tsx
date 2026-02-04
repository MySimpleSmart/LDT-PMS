import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getAdminById } from '../data/admins'
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

export default function EditAdmin() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const admin = id ? getAdminById(id) : null

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

  const onFinish = (values: Record<string, unknown>) => {
    // TODO: Update in Firebase (e.g. updateDoc in 'admins' collection)
    console.log('Update admin:', id, values)
    message.success('Profile updated successfully.')
    navigate(`/admins/${id}`)
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
                Save changes
              </Button>
              <Button onClick={() => navigate(`/admins/${id}`)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
