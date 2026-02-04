import { Typography } from 'antd'

export default function Files() {
  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>Files</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block' }}>
        Your files — add content here.
      </Typography.Text>
    </div>
  )
}
