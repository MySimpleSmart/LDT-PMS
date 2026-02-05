import { useState } from 'react'
import { Typography, Card, Form, Input, Button, Space, message } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useCurrentUser } from '../context/CurrentUserContext'

export default function Settings() {
  const { isSuperAdmin } = useCurrentUser()
  const [passwordForm] = Form.useForm()
  const [emailForm] = Form.useForm()
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  const onPasswordFinish = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('New passwords do not match.')
      return
    }
    setPasswordLoading(true)
    try {
      // TODO: wire to auth backend (e.g. Firebase updatePassword / reauthenticate)
      await new Promise((r) => setTimeout(r, 600))
      message.success('Password change requested. Connect your backend to complete.')
      passwordForm.resetFields()
    } finally {
      setPasswordLoading(false)
    }
  }

  const onEmailFinish = async (values: { newEmail: string; confirmEmail: string }) => {
    if (values.newEmail !== values.confirmEmail) {
      message.error('Email addresses do not match.')
      return
    }
    setEmailLoading(true)
    try {
      // TODO: wire to auth backend (e.g. Firebase updateEmail / reauthenticate)
      await new Promise((r) => setTimeout(r, 600))
      message.success('Email change requested. Connect your backend to complete.')
      emailForm.resetFields()
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        Settings
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        App and account settings.
      </Typography.Text>

      <Card title={<Space><LockOutlined /> Change password</Space>} size="small" style={{ marginBottom: 24 }}>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Update your account password.
        </Typography.Text>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={onPasswordFinish}
          style={{ maxWidth: 400 }}
        >
          <Form.Item
            name="newPassword"
            label="New password"
            rules={[
              { required: true, message: 'Enter a new password' },
              { min: 6, message: 'At least 6 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="New password" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm new password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('Passwords do not match'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>
              Change password
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {isSuperAdmin && (
      <Card title={<Space><MailOutlined /> Change email</Space>} size="small">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Update the email address for your account. You may need to verify the new email.
        </Typography.Text>
        <Form
          form={emailForm}
          layout="vertical"
          onFinish={onEmailFinish}
          style={{ maxWidth: 400 }}
        >
          <Form.Item
            name="newEmail"
            label="New email"
            rules={[
              { required: true, message: 'Enter your new email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="New email address" autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="confirmEmail"
            label="Confirm new email"
            dependencies={['newEmail']}
            rules={[
              { required: true, message: 'Confirm your new email' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newEmail') === value) return Promise.resolve()
                  return Promise.reject(new Error('Emails do not match'))
                },
              }),
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Confirm new email" autoComplete="email" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={emailLoading}>
              Change email
            </Button>
          </Form.Item>
        </Form>
      </Card>
      )}
    </div>
  )
}
