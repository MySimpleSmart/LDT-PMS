import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Table, Tag, Button, Space, Card, Input } from 'antd'
import { EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import MemberAvatar from '../components/MemberAvatar'
import { getMembersTableList } from '../data/members'

export default function Members() {
  const navigate = useNavigate()
  const allMembers = getMembersTableList()
  const [searchText, setSearchText] = useState('')

  const filteredMembers = useMemo(() => {
    if (!searchText.trim()) return allMembers
    const q = searchText.trim().toLowerCase()
    return allMembers.filter((m) =>
      m.fullName.toLowerCase().includes(q) ||
      m.memberId.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    )
  }, [allMembers, searchText])

  const columns = [
    {
      title: 'Member',
      key: 'member',
      render: (_: unknown, r: (typeof members)[0]) => (
        <Space>
          <MemberAvatar profileImage={r.profileImage} firstName={r.firstName} lastName={r.lastName} size={32} />
          <span>{r.fullName}</span>
        </Space>
      ),
    },
    { title: 'Member ID', dataIndex: 'memberId', key: 'memberId', width: 100 },
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
      render: (_: unknown, r: (typeof members)[0]) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/members/${r.id}`)}>
          View profile
        </Button>
      ),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>Members</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            Manage team members and roles.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/members/new')}>
          Add member
        </Button>
      </div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by name, ID, email, department, or role..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 320 }}
        />
      </Card>
      <Table
        rowKey="id"
        dataSource={filteredMembers}
        columns={columns}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100] }}
      />
    </div>
  )
}
