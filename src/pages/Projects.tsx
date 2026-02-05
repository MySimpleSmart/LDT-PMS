import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Table, Tag, Button, Input, Select, DatePicker, Space, Card, Progress, Segmented, Row, Col, Empty, Tabs, Pagination } from 'antd'
import { EyeOutlined, PlusOutlined, SearchOutlined, UnorderedListOutlined, AppstoreOutlined, TeamOutlined, CheckSquareOutlined, FileOutlined, CommentOutlined, UserOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { getProjectById, getProjectsList, getRelatedProjectsForMember } from '../data/projects'
import { useCurrentUser } from '../context/CurrentUserContext'

const priorityColors: Record<string, string> = {
  Low: 'default',
  Medium: 'blue',
  High: 'orange',
  Urgent: 'red',
}

const PRIORITY_ORDER: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 }
function priorityRank(p: string): number {
  return PRIORITY_ORDER[p] ?? 0
}

const sortOptions = [
  { value: 'startDate', label: 'Start date (newest first)' },
  { value: 'priority', label: 'Priority (high first)' },
]

const statusOptions = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Pending completion', label: 'Pending completion' },
  { value: 'Completed', label: 'Completed' },
]

type ProjectRow = ReturnType<typeof getProjectsList>[number]

export default function Projects() {
  const navigate = useNavigate()
  const { currentAdminId, isSuperAdmin, currentUserMemberId } = useCurrentUser()
  const allProjects = useMemo(() => getProjectsList(), [])

  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [sortBy, setSortBy] = useState<'startDate' | 'priority'>('startDate')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const myProjectIds = useMemo(
    () => (currentUserMemberId ? getRelatedProjectsForMember(currentUserMemberId).map((r) => r.key) : []),
    [currentUserMemberId]
  )
  const baseProjects = useMemo(
    () => (activeTab === 'my' ? allProjects.filter((p) => myProjectIds.includes(p.projectId)) : allProjects),
    [activeTab, allProjects, myProjectIds]
  )

  const filteredProjects = useMemo(() => {
    let list = baseProjects
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.projectId.toLowerCase().includes(q) ||
          p.projectName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (dateRange && (dateRange[0] || dateRange[1])) {
      const [start, end] = dateRange
      list = list.filter((p) => {
        const projectStart = p.startDate ? dayjs(p.startDate) : null
        const projectEnd = p.endDate ? dayjs(p.endDate) : null
        if (start && projectEnd && projectEnd.isBefore(start)) return false
        if (end && projectStart && projectStart.isAfter(end)) return false
        return true
      })
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'priority') {
        const rankA = priorityRank(a.priority)
        const rankB = priorityRank(b.priority)
        return rankB - rankA
      }
      const dateA = a.startDate ? dayjs(a.startDate).valueOf() : 0
      const dateB = b.startDate ? dayjs(b.startDate).valueOf() : 0
      return dateB - dateA
    })
  }, [baseProjects, searchText, statusFilter, dateRange, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredProjects.length])

  const columns = [
    { title: 'Project ID', dataIndex: 'projectId', key: 'projectId', width: 100 },
    { title: 'Project Name', dataIndex: 'projectName', key: 'projectName' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    {
      title: 'Members',
      key: 'membersCount',
      width: 100,
      render: (_: unknown, r: ProjectRow) => {
        const detail = getProjectById(r.id)
        const count = detail?.members?.length ?? 0
        return (
          <Space size={4} align="center">
            <TeamOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
            <span>{count}</span>
          </Space>
        )
      },
    },
    {
      title: 'Project Lead',
      key: 'projectLead',
      width: 140,
      render: (_: unknown, r: ProjectRow) => {
        const detail = getProjectById(r.id)
        const members = detail?.members ?? []
        const lead = members.find((m) => m.role === 'Lead') ?? members[0]
        return lead?.name ?? '—'
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (p: string) => <Tag color={priorityColors[p] || 'default'}>{p}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={status === 'Completed' ? 'green' : status === 'Pending completion' ? 'orange' : 'default'}>{status}</Tag>
      ),
    },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', width: 110, render: (d: string) => d || '—' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', width: 110, render: (d: string) => d || '—' },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      width: 160,
      render: (n: number) => (
        <Space size={8} align="center">
          <Progress percent={n} size="small" showInfo={false} style={{ width: 90, marginBottom: 0 }} />
          <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{n}%</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: unknown, r: ProjectRow) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/projects/${r.id}`)}>
          View
        </Button>
      ),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>Projects</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            {activeTab === 'my'
              ? 'Projects where you are lead or member. Switch to All Projects to see everything.'
              : 'Manage your projects here. All Projects or My Projects (where you are involved).'}
          </Typography.Text>
        </div>
        {isSuperAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>
            Add project
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'all',
            label: (
              <span>
                <UnorderedListOutlined /> All Projects
              </span>
            ),
            children: (
              <>
                <Card size="small" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <Space wrap size="middle" align="center">
                      <Input
                        placeholder="Search by name, ID, or category..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                        style={{ width: 280 }}
                      />
                      <Select
                        placeholder="Status"
                        allowClear
                        style={{ width: 140 }}
                        value={statusFilter ?? undefined}
                        onChange={(v) => setStatusFilter(v ?? null)}
                        options={statusOptions}
                      />
                      <DatePicker.RangePicker
                        placeholder={['Start date', 'End date']}
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                        allowClear
                      />
                      <Select
                        placeholder="Sort by"
                        style={{ width: 200 }}
                        value={sortBy}
                        onChange={(v) => setSortBy(v as 'startDate' | 'priority')}
                        options={sortOptions}
                      />
                      {(searchText || statusFilter || (dateRange && (dateRange[0] || dateRange[1]))) && (
                        <Button
                          onClick={() => {
                            setSearchText('')
                            setStatusFilter(null)
                            setDateRange(null)
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </Space>
                    <Segmented
                      value={viewMode}
                      onChange={(v) => setViewMode(v as 'list' | 'grid')}
                      options={[
                        { value: 'list', label: <span><UnorderedListOutlined /> List</span> },
                        { value: 'grid', label: <span><AppstoreOutlined /> Grid</span> },
                      ]}
                    />
                  </div>
                </Card>
                {viewMode === 'list' ? (
                  <Table<ProjectRow>
                    rowKey="id"
                    dataSource={filteredProjects}
                    columns={columns}
                    size="small"
                    pagination={{
                      current: currentPage,
                      pageSize,
                      total: filteredProjects.length,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50'],
                      showTotal: (total) => `Total ${total} items`,
                      onChange: (page, size) => {
                        setCurrentPage(page)
                        if (size) setPageSize(size)
                      },
                    }}
                  />
                ) : filteredProjects.length ? (
                  <>
                  <Row gutter={[16, 16]}>
                    {filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p) => (
                      <Col key={p.id} xs={24} sm={12} lg={8} xl={6}>
                        <Card
                          hoverable
                          onClick={() => navigate(`/projects/${p.id}`)}
                          styles={{ body: { padding: 16 } }}
                        >
                          <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            {(() => {
                              const d = getProjectById(p.id)
                              const membersCount = d?.members.length ?? 0
                              const tasksCount = d?.tasks.length ?? 0
                              const notesCount = d?.notes.length ?? 0
                              const filesCount = d?.files.length ?? 0
                              return (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ minWidth: 0 }}>
                                      <Typography.Text strong style={{ display: 'block' }} ellipsis={{ tooltip: p.projectName }}>
                                        {p.projectName}
                                      </Typography.Text>
                                      <Typography.Text type="secondary">{p.projectId}</Typography.Text>
                                    </div>
                                    <Button
                                      type="link"
                                      icon={<EyeOutlined />}
                                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`) }}
                                    >
                                      View
                                    </Button>
                                  </div>
                    <Space wrap size={6}>
                      <Tag color={priorityColors[p.priority] || 'default'}>{p.priority}</Tag>
                      <Tag color={p.status === 'Completed' ? 'green' : p.status === 'Pending completion' ? 'orange' : 'default'}>{p.status}</Tag>
                      <Tag>{p.category}</Tag>
                    </Space>
                                  <Space wrap size={10} style={{ color: 'rgba(0,0,0,0.65)' }}>
                                    <Typography.Text type="secondary"><TeamOutlined /> {membersCount}</Typography.Text>
                                    <Typography.Text type="secondary"><CheckSquareOutlined /> {tasksCount}</Typography.Text>
                                    <Typography.Text type="secondary"><FileOutlined /> {filesCount}</Typography.Text>
                                    <Typography.Text type="secondary"><CommentOutlined /> {notesCount}</Typography.Text>
                                  </Space>
                                  <div>
                                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Progress</Typography.Text>
                                    <Space size={8} align="center">
                                      <Progress percent={p.progress} size="small" showInfo={false} style={{ width: 120, marginBottom: 0 }} />
                                      <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{p.progress}%</Typography.Text>
                                    </Space>
                                  </div>
                                  <Space size={12} style={{ color: 'rgba(0,0,0,0.65)' }} wrap>
                                    <Typography.Text type="secondary">Start: {p.startDate}</Typography.Text>
                                    <Typography.Text type="secondary">End: {p.endDate}</Typography.Text>
                                  </Space>
                                </>
                              )
                            })()}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredProjects.length}
                    showSizeChanger
                    pageSizeOptions={['10', '20', '50']}
                    showTotal={(total) => `Total ${total} items`}
                    onChange={(page, size) => {
                      setCurrentPage(page)
                      if (size) setPageSize(size)
                    }}
                    style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}
                  />
                  </>
                ) : (
                  <Card>
                    <Empty
                      description={
                        activeTab === 'my'
                          ? (currentUserMemberId ? 'No projects where you are lead or member match your filters.' : 'Log in as an admin who is a project member to see My Projects.')
                          : 'No projects match your filters.'
                      }
                    />
                  </Card>
                )}
              </>
            ),
          },
          {
            key: 'my',
            label: (
              <span>
                <UserOutlined /> My Projects
              </span>
            ),
            children: (
              <>
                <Card size="small" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <Space wrap size="middle" align="center">
                      <Input
                        placeholder="Search by name, ID, or category..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                        style={{ width: 280 }}
                      />
                      <Select
                        placeholder="Status"
                        allowClear
                        style={{ width: 140 }}
                        value={statusFilter ?? undefined}
                        onChange={(v) => setStatusFilter(v ?? null)}
                        options={statusOptions}
                      />
                      <DatePicker.RangePicker
                        placeholder={['Start date', 'End date']}
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                        allowClear
                      />
                      <Select
                        placeholder="Sort by"
                        style={{ width: 200 }}
                        value={sortBy}
                        onChange={(v) => setSortBy(v as 'startDate' | 'priority')}
                        options={sortOptions}
                      />
                      {(searchText || statusFilter || (dateRange && (dateRange[0] || dateRange[1]))) && (
                        <Button
                          onClick={() => {
                            setSearchText('')
                            setStatusFilter(null)
                            setDateRange(null)
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </Space>
                    <Segmented
                      value={viewMode}
                      onChange={(v) => setViewMode(v as 'list' | 'grid')}
                      options={[
                        { value: 'list', label: <span><UnorderedListOutlined /> List</span> },
                        { value: 'grid', label: <span><AppstoreOutlined /> Grid</span> },
                      ]}
                    />
                  </div>
                </Card>
                {viewMode === 'list' ? (
                  <Table<ProjectRow>
                    rowKey="id"
                    dataSource={filteredProjects}
                    columns={columns}
                    size="small"
                    pagination={{
                      current: currentPage,
                      pageSize,
                      total: filteredProjects.length,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50'],
                      showTotal: (total) => `Total ${total} items`,
                      onChange: (page, size) => {
                        setCurrentPage(page)
                        if (size) setPageSize(size)
                      },
                    }}
                    locale={{ emptyText: currentUserMemberId ? 'No projects where you are lead or member.' : 'Log in as an admin who is a project member to see My Projects.' }}
                  />
                ) : filteredProjects.length ? (
                  <>
                  <Row gutter={[16, 16]}>
                    {filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p) => (
                      <Col key={p.id} xs={24} sm={12} lg={8} xl={6}>
                        <Card
                          hoverable
                          onClick={() => navigate(`/projects/${p.id}`)}
                          styles={{ body: { padding: 16 } }}
                        >
                          <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            {(() => {
                              const d = getProjectById(p.id)
                              const membersCount = d?.members.length ?? 0
                              const tasksCount = d?.tasks.length ?? 0
                              const notesCount = d?.notes.length ?? 0
                              const filesCount = d?.files.length ?? 0
                              return (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ minWidth: 0 }}>
                                      <Typography.Text strong style={{ display: 'block' }} ellipsis={{ tooltip: p.projectName }}>
                                        {p.projectName}
                                      </Typography.Text>
                                      <Typography.Text type="secondary">{p.projectId}</Typography.Text>
                                    </div>
                                    <Button
                                      type="link"
                                      icon={<EyeOutlined />}
                                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`) }}
                                    >
                                      View
                                    </Button>
                                  </div>
                                  <Space wrap size={6}>
                                    <Tag color={priorityColors[p.priority] || 'default'}>{p.priority}</Tag>
                                    <Tag color={p.status === 'Completed' ? 'green' : p.status === 'Pending completion' ? 'orange' : 'default'}>{p.status}</Tag>
                                    <Tag>{p.category}</Tag>
                                  </Space>
                                  <Space wrap size={10} style={{ color: 'rgba(0,0,0,0.65)' }}>
                                    <Typography.Text type="secondary"><TeamOutlined /> {membersCount}</Typography.Text>
                                    <Typography.Text type="secondary"><CheckSquareOutlined /> {tasksCount}</Typography.Text>
                                    <Typography.Text type="secondary"><FileOutlined /> {filesCount}</Typography.Text>
                                    <Typography.Text type="secondary"><CommentOutlined /> {notesCount}</Typography.Text>
                                  </Space>
                                  <div>
                                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Progress</Typography.Text>
                                    <Space size={8} align="center">
                                      <Progress percent={p.progress} size="small" showInfo={false} style={{ width: 120, marginBottom: 0 }} />
                                      <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{p.progress}%</Typography.Text>
                                    </Space>
                                  </div>
                                  <Space size={12} style={{ color: 'rgba(0,0,0,0.65)' }} wrap>
                                    <Typography.Text type="secondary">Start: {p.startDate}</Typography.Text>
                                    <Typography.Text type="secondary">End: {p.endDate}</Typography.Text>
                                  </Space>
                                </>
                              )
                            })()}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredProjects.length}
                    showSizeChanger
                    pageSizeOptions={['10', '20', '50']}
                    showTotal={(total) => `Total ${total} items`}
                    onChange={(page, size) => {
                      setCurrentPage(page)
                      if (size) setPageSize(size)
                    }}
                    style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}
                  />
                  </>
                ) : (
                  <Card>
                    <Empty
                      description={
                        currentUserMemberId ? 'No projects where you are lead or member match your filters.' : 'Log in as an admin who is a project member to see My Projects.'
                      }
                    />
                  </Card>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  )
}
