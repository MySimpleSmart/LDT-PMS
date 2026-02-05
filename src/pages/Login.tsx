import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const { user, loading, signIn, error, clearError } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  useEffect(() => {
    clearError()
  }, [clearError])

  const onFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true)
    try {
      await signIn(values.email, values.password)
      navigate('/', { replace: true })
    } catch {
      // Error is shown via context error state
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
        }}
      >
        <Spin size="large" />
        <Text type="secondary">Loading…</Text>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <img src="/echo_logo.svg" alt="ECHO" style={{ height: 48, width: 'auto', display: 'block' }} />
            <Title level={3} style={{ margin: 0 }}>ECHO</Title>
          </div>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        {!isFirebaseConfigured() && (
          <Alert
            type="info"
            message="Demo mode"
            description="Super Admin: admin / 123 — Project Lead (Noah Wilson, member): projectlead / 123 — Admin, no dashboard: alex / 123. Configure Firebase for real login."
            style={{ marginBottom: 16 }}
          />
        )}

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={clearError}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          name="login"
          size="large"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please enter your email or admin' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email or admin" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" autoComplete="current-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
