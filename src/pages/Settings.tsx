import { Typography } from 'antd'

export default function Settings() {
  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>Settings</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block' }}>
        App and account settings.
      </Typography.Text>
    </div>
  )
}
