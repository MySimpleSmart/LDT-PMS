import { useNavigate } from 'react-router-dom'
import { Typography, Table, Tag, Button, Space } from 'antd'
import { EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { formatAdminId } from '../types/admin'
import MemberAvatar from '../components/MemberAvatar'

const placeholderAdmins = [
  { id: '1', adminId: formatAdminId(1), fullName: 'Sam Admin', firstName: 'Sam', lastName: 'Admin', profileImage: null as string | null, email: 'sam.admin@company.com', department: 'Engineering', role: 'Super Admin', status: 'Active' as const },
  { id: '2', adminId: formatAdminId(2), fullName: 'Alex River', firstName: 'Alex', lastName: 'River', profileImage: null as string | null, email: 'alex.river@company.com', department: 'Operations', role: 'Admin', status: 'Inactive' as const },
]

export default function Admins() {
  const navigate = useNavigate()

  const columns = [
    {
      title: 'Admin',
      key: 'admin',
      render: (_: unknown, r: (typeof placeholderAdmins)[0]) => (
        <Space>
          <MemberAvatar profileImage={r.profileImage} firstName={r.firstName} lastName={r.lastName} size={32} />
          <span>{r.fullName}</span>
        </Space>
      ),
    },
    { title: 'Admin ID', dataIndex: 'adminId', key: 'adminId', width: 100 },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
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
      render: (_: unknown, r: (typeof placeholderAdmins)[0]) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/admins/${r.id}`)}>
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
            Manage administrators and roles.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admins/new')}>
          Add admin
        </Button>
      </div>
      <Table
        rowKey="id"
        dataSource={placeholderAdmins}
        columns={columns}
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </div>
  )
}
