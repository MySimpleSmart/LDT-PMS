import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, Tag, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import AvatarPicker from '../components/AvatarPicker'
import { useCurrentUser } from '../context/CurrentUserContext'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { SYSTEM_ROLE } from '../constants/roles'
import { createMemberWithAuth } from '../data/members'
import { isValidAustralianPhone, AU_PHONE_PLACEHOLDER, AU_PHONE_VALIDATION_MESSAGE } from '../utils/phone'

export default function NewMember() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()
  const { jobTypes, positions } = useProjectMeta()
  const jobTypeOptions = jobTypes.map((v) => ({ value: v, label: v }))
  const positionOptions = positions.map((v) => ({ value: v, label: v }))
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isAdmin) navigate('/members', { replace: true })
  }, [isAdmin, navigate])

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      const result = await createMemberWithAuth({
        firstName: String(values.firstName ?? ''),
        lastName: String(values.lastName ?? ''),
        email: String(values.email ?? ''),
        phone: values.phone ? String(values.phone) : undefined,
        department: String(values.department ?? ''),
        jobType: values.jobType ? String(values.jobType) : undefined,
        position: values.position ? String(values.position) : undefined,
        accountStatus: 'Inactive',
        avatarUrl: values.profileImage ? String(values.profileImage) : null,
        role: 'member',
      })
      if (result.viaCloudFunction) {
        message.success('Member added. A password reset email has been sent.')
      } else {
        const hint = result.fallbackError
          ? `Cloud Function failed: ${result.fallbackError}. `
          : ''
        message.warning(
          `${hint}Member added to Firestore only. Deploy the Cloud Function (functions/deploy) and redeploy to enable Auth + email.`
        )
      }
      navigate(`/members/${result.memberId}`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to add member.')
    } finally {
      setSubmitting(false)
    }
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
          initialValues={{}}
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
                <Select placeholder="Select position" allowClear showSearch optionFilterProp="label" options={positionOptions} />
              </Form.Item>

              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                New members start as Inactive until they set their password via the email link.
              </Typography.Text>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Add member
              </Button>
              <Button onClick={() => navigate('/members')} disabled={submitting}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
