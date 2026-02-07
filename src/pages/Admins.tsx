import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Table, Tag, Button, Space, Spin, Modal, Select, message } from 'antd'
import { EyeOutlined, PlusOutlined } from '@ant-design/icons'
import MemberAvatar from '../components/MemberAvatar'
import { useCurrentUser } from '../context/CurrentUserContext'
import { getAdminsList, type ProjectLeadRow } from '../data/admins'
import { getMembersTableList, updateMember } from '../data/members'

export default function Admins() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useCurrentUser()
  const [rows, setRows] = useState<ProjectLeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [memberOptions, setMemberOptions] = useState<{ value: string; label: string }[]>([])
  const [addModalLoading, setAddModalLoading] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadAdmins = () => {
    getAdminsList().then(setRows)
  }

  useEffect(() => {
    let active = true
    getAdminsList().then((list) => {
      if (active) setRows(list)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const openAddModal = () => {
    setAddModalOpen(true)
    setSelectedMemberId(null)
    getMembersTableList().then((list) => {
      const nonAdmins = list.filter((m) => m.role !== 'Admin' && m.role !== 'Super Admin')
      setMemberOptions(nonAdmins.map((m) => ({ value: m.id, label: `${m.fullName} (${m.memberId})` })))
    })
  }

  const handleAddAdmin = async () => {
    if (!selectedMemberId) {
      message.warning('Please select a member.')
      return
    }
    setAddModalLoading(true)
    try {
      await updateMember(selectedMemberId, { role: 'admin' })
      message.success('Member promoted to admin.')
      loadAdmins()
      setAddModalOpen(false)
      setSelectedMemberId(null)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to add admin.')
    } finally {
      setAddModalLoading(false)
    }
  }

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
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Add admin
          </Button>
        )}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : (
        <>
          <Table
            rowKey="id"
            dataSource={rows}
            columns={columns}
            size="small"
            pagination={{
              current: currentPage,
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `Total ${total} admins`,
              onChange: (page, size) => {
                setCurrentPage(page)
                if (size) setPageSize(size)
              },
            }}
          />
          <Modal
            title="Add admin"
            open={addModalOpen}
            onOk={handleAddAdmin}
            onCancel={() => setAddModalOpen(false)}
            confirmLoading={addModalLoading}
            okText="Add as admin"
          >
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Choose an existing member to promote to admin. Only members who are not already admins are listed.
            </Typography.Text>
            <Select
              placeholder="Select a member"
              style={{ width: '100%' }}
              value={selectedMemberId}
              onChange={setSelectedMemberId}
              options={memberOptions}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Modal>
        </>
      )}
    </div>
  )
}
