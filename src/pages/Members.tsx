import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Table, Tag, Button, Space, Card, Input, Select, Spin } from 'antd'
import { useCurrentUser } from '../context/CurrentUserContext'
import { EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import MemberAvatar from '../components/MemberAvatar'
import { getMembersTableList, type MembersTableRow } from '../data/members'

export default function Members() {
  const navigate = useNavigate()
  const { isSuperAdmin, isAdmin } = useCurrentUser()
  const [allMembers, setAllMembers] = useState<MembersTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const list = await getMembersTableList()
        if (active) setAllMembers(list)
      } catch (err) {
        if (active) setAllMembers([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const filteredMembers = useMemo(() => {
    let list = allMembers
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberId.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        (m.isProjectLead && 'project lead'.includes(q)) ||
        (m.jobType && m.jobType.toLowerCase().includes(q))
      )
    }
    if (roleFilter !== 'all') {
      if (roleFilter === 'Project Lead') {
        list = list.filter((m) => m.isProjectLead)
      } else {
        list = list.filter((m) => m.role === roleFilter)
      }
    }
    return list
  }, [allMembers, searchText, roleFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, roleFilter])

  const columns = [
    {
      title: 'Member',
      key: 'member',
      render: (_: unknown, r: MembersTableRow) => (
        <Space wrap>
          <Space>
            <MemberAvatar profileImage={r.profileImage} firstName={r.firstName} lastName={r.lastName} size={32} />
            <span>{r.fullName}</span>
          </Space>
          {r.isProjectLead && <Tag color="blue">Project Lead</Tag>}
        </Space>
      ),
    },
    { title: 'Member ID', dataIndex: 'memberId', key: 'memberId', width: 100 },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => role?.trim() || 'Member',
    },
    { title: 'Job type', dataIndex: 'jobType', key: 'jobType', width: 120 },
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
      render: (_: unknown, r: MembersTableRow) => (
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
        {(isSuperAdmin || isAdmin) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/members/new')}>
            Add member
          </Button>
        )}
      </div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="Search by name, ID, email, department, role, or job type..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 320 }}
          />
          <Select
            placeholder="Filter by role"
            value={roleFilter}
            onChange={setRoleFilter}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: 'All roles' },
              { value: 'Super Admin', label: 'Super Admin' },
              { value: 'Admin', label: 'Admin' },
              { value: 'Member', label: 'Member' },
              { value: 'Project Lead', label: 'Project Lead' },
            ]}
          />
        </Space>
      </Card>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : (
        <Table
          rowKey="id"
          dataSource={filteredMembers}
          columns={columns}
          size="small"
          pagination={{
            current: currentPage,
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `Total ${total} members`,
            onChange: (page, size) => {
              setCurrentPage(page)
              if (size) setPageSize(size)
            },
          }}
        />
      )}
    </div>
  )
}
