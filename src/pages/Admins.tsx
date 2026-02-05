import { useNavigate } from 'react-router-dom'
import { Typography, Table, Tag, Button, Space } from 'antd'
import { EyeOutlined, PlusOutlined } from '@ant-design/icons'
import MemberAvatar from '../components/MemberAvatar'
import { useCurrentUser } from '../context/CurrentUserContext'
import { getAdminsList, type ProjectLeadRow } from '../data/admins'

export default function Admins() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useCurrentUser()
  const rows = getAdminsList()

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, r: ProjectLeadRow) => (
        <Space>
          <MemberAvatar profileImage={r.profileImage} firstName={r.firstName} lastName={r.lastName} size={32} />
          <span>{r.fullName}</span>
        </Space>
      ),
    },
    { title: 'ID', dataIndex: 'memberId', key: 'memberId', width: 100 },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => <Tag color={role === 'Super Admin' ? 'gold' : 'blue'}>{role}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={status === 'Active' ? 'green' : 'default'}>{status}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: unknown, r: ProjectLeadRow) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(r.profilePath)}>
          View profile
        </Button>
      ),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>Admins</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            Super Admin (one only) and Admins. Super Admin can add/remove admins; Admin cannot edit Super Admin.
          </Typography.Text>
        </div>
        {isSuperAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admins/new')}>
            Add admin
          </Button>
        )}
      </div>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={columns}
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </div>
  )
}
