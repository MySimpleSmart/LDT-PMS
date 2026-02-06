import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Table, Tag, Button, Input, Select, DatePicker, Space, Card, Progress, Segmented, Row, Col, Empty, Tabs, Pagination, Checkbox, message } from 'antd'
import { EyeOutlined, PlusOutlined, SearchOutlined, UnorderedListOutlined, AppstoreOutlined, TeamOutlined, CheckSquareOutlined, FileOutlined, CommentOutlined, UserOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { getProjectById, getProjectsList, getRelatedProjectsForMember, isProjectOverdue, updateProjectById, type ProjectListRow, type ProjectDetail } from '../data/projects'
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

/** Days from today to endDate; negative = overdue. Returns null if no end date. */
function daysUntilEnd(endDate: string | undefined): number | null {
  if (!endDate?.trim()) return null
  const end = dayjs(endDate).startOf('day')
  const today = dayjs().startOf('day')
  return end.diff(today, 'day')
}

/** Days from today to startDate; positive = start is in the future. Returns null if no start date. */
function daysUntilStart(startDate: string | undefined): number | null {
  if (!startDate?.trim()) return null
  const start = dayjs(startDate).startOf('day')
  const today = dayjs().startOf('day')
  return start.diff(today, 'day')
}

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr?.trim()) return '—'
  return dayjs(dateStr).format('MMM D, YYYY')
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
/** Status filter options include Overdue (computed from end date). */
const statusFilterOptions = [
  { value: 'Overdue', label: 'Overdue' },
  ...statusOptions,
]

/** Allowed Kanban drag transitions: from status → list of statuses you can drop into. Prevents e.g. In Progress → Not Started, or moving Completed. */
const ALLOWED_PROJECT_STATUS_FROM_TO: Record<string, string[]> = {
  'Not Started': ['In Progress', 'On Hold'],
  'In Progress': ['On Hold', 'Pending completion', 'Completed'],
  'On Hold': ['Not Started', 'In Progress', 'Pending completion', 'Completed'],
  'Pending completion': ['In Progress', 'Completed'],
  'Completed': [], // cannot move a completed project to another column
}

function canMoveProjectToStatus(currentStatus: string, newStatus: string): boolean {
  if (currentStatus === newStatus) return false
  const allowed = ALLOWED_PROJECT_STATUS_FROM_TO[currentStatus]
  return Array.isArray(allowed) && allowed.includes(newStatus)
}

const PROJECT_KANBAN_ORDER_KEY = 'echo_project_kanban_order'

function reorderProjectsBy(projects: ProjectRow[], orderIds: string[]): ProjectRow[] {
  if (!orderIds.length) return projects
  const byId = new Map(projects.map((p) => [p.id, p]))
  const ordered: ProjectRow[] = []
  for (const id of orderIds) {
    if (byId.has(id)) ordered.push(byId.get(id)!)
  }
  for (const p of projects) {
    if (!orderIds.includes(p.id)) ordered.push(p)
  }
  return ordered
}

type ProjectRow = ProjectListRow

export default function Projects() {
  const navigate = useNavigate()
  const { isSuperAdmin, currentUserMemberId } = useCurrentUser()
  const [allProjects, setAllProjects] = useState<ProjectRow[]>([])
  const [projectDetailsById, setProjectDetailsById] = useState<Record<string, ProjectDetail>>({})

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await getProjectsList()
        if (!active) return
        setAllProjects(rows)

        const details: Record<string, ProjectDetail> = {}
        for (const row of rows) {
          try {
            const detail = await getProjectById(row.id)
            if (detail) details[row.id] = detail
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to load project detail', row.id, err)
          }
        }
        if (active) setProjectDetailsById(details)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load projects list', err)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [sortBy, setSortBy] = useState<'startDate' | 'priority'>('startDate')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [kanbanVisibleCount, setKanbanVisibleCount] = useState<Record<string, number>>({})
  const KANBAN_INITIAL_COUNT = 40
  const KANBAN_LOAD_MORE = 20
  const [myProjectIds, setMyProjectIds] = useState<string[]>([])
  const [projectDropTarget, setProjectDropTarget] = useState<string | null>(null)
  const [projectColumnOrder, setProjectColumnOrder] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(PROJECT_KANBAN_ORDER_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(PROJECT_KANBAN_ORDER_KEY, JSON.stringify(projectColumnOrder))
    } catch {}
  }, [projectColumnOrder])

  const handleProjectDragStart = (e: React.DragEvent, projectId: string, sourceStatus: string) => {
    e.dataTransfer.setData('application/x-echo-project-id', projectId)
    e.dataTransfer.setData('application/x-echo-project-status', sourceStatus)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleProjectDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setProjectDropTarget(status)
  }

  const handleProjectDragLeave = () => {
    setProjectDropTarget(null)
  }

  const handleProjectDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setProjectDropTarget(null)
    const projectId = e.dataTransfer.getData('application/x-echo-project-id')
    if (!projectId) return
    const project = allProjects.find((p) => p.id === projectId)
    if (!project || project.status === newStatus) return
    if (!canMoveProjectToStatus(project.status, newStatus)) {
      message.warning(`Cannot move a project from "${project.status}" to "${newStatus}".`)
      return
    }
    // Only the project lead can set status to Pending completion; Super Admin/Admin see it and confirm from the project page.
    if (newStatus === 'Pending completion') {
      const detail = projectDetailsById[projectId]
      const leadMemberId = detail?.members?.find((m: { role: string }) => m.role === 'Lead')?.memberId
      if (leadMemberId !== currentUserMemberId) {
        message.warning('Only the project lead can request completion (Pending completion). Use the project page to confirm or reject pending projects.')
        return
      }
    }
    const sourceStatus = project.status
    try {
      await updateProjectById(projectId, { status: newStatus })
      const rows = await getProjectsList()
      setAllProjects(rows)
      const detail = await getProjectById(projectId)
      if (detail) setProjectDetailsById((prev) => ({ ...prev, [projectId]: detail }))
      setProjectColumnOrder((prev) => {
        const next = { ...prev }
        const fromList = next[sourceStatus]?.filter((id) => id !== projectId) ?? []
        next[sourceStatus] = fromList
        const inNew = next[newStatus] ?? []
        if (!inNew.includes(projectId)) next[newStatus] = [...inNew, projectId]
        return next
      })
      message.success(`Project status set to ${newStatus}.`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update project status.')
    }
  }

  const handleProjectDropOnCard = async (e: React.DragEvent, targetProjectId: string, targetStatus: string) => {
    e.preventDefault()
    e.stopPropagation()
    setProjectDropTarget(null)
    const projectId = e.dataTransfer.getData('application/x-echo-project-id')
    const sourceStatus = e.dataTransfer.getData('application/x-echo-project-status')
    if (!projectId || projectId === targetProjectId) return
    const project = allProjects.find((p) => p.id === projectId)
    if (!project) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const dropInLowerHalf = e.clientY >= rect.top + rect.height / 2
    if (sourceStatus === targetStatus) {
      const col = projectKanbanColumns.find((c) => c.status === targetStatus)
      const order = projectColumnOrder[targetStatus] ?? col?.projects.map((p) => p.id) ?? []
      const without = order.filter((id) => id !== projectId)
      const targetIndex = without.indexOf(targetProjectId)
      const insertIndex = targetIndex === -1 ? without.length : (dropInLowerHalf ? targetIndex + 1 : targetIndex)
      const newOrder = [...without.slice(0, insertIndex), projectId, ...without.slice(insertIndex)]
      setProjectColumnOrder((prev) => ({ ...prev, [targetStatus]: newOrder }))
      return
    }
    if (!canMoveProjectToStatus(project.status, targetStatus)) {
      message.warning(`Cannot move a project from "${project.status}" to "${targetStatus}".`)
      return
    }
    // Only the project lead can set status to Pending completion; Super Admin/Admin see it and confirm from the project page.
    if (targetStatus === 'Pending completion') {
      const detail = projectDetailsById[projectId]
      const leadMemberId = detail?.members?.find((m: { role: string }) => m.role === 'Lead')?.memberId
      if (leadMemberId !== currentUserMemberId) {
        message.warning('Only the project lead can request completion (Pending completion). Use the project page to confirm or reject pending projects.')
        return
      }
    }
    try {
      await updateProjectById(projectId, { status: targetStatus })
      const rows = await getProjectsList()
      setAllProjects(rows)
      const detail = await getProjectById(projectId)
      if (detail) setProjectDetailsById((prev) => ({ ...prev, [projectId]: detail }))
      setProjectColumnOrder((prev) => {
        const next = { ...prev }
        const fromList = next[sourceStatus]?.filter((id) => id !== projectId) ?? []
        next[sourceStatus] = fromList
        const toList = next[targetStatus] ?? []
        const targetIdx = toList.indexOf(targetProjectId)
        const insertAt = targetIdx === -1 ? toList.length : (dropInLowerHalf ? targetIdx + 1 : targetIdx)
        next[targetStatus] = [...toList.slice(0, insertAt), projectId, ...toList.slice(insertAt)]
        return next
      })
      message.success(`Project status set to ${targetStatus}.`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update project status.')
    }
  }

  useEffect(() => {
    let active = true
    if (!currentUserMemberId) {
      setMyProjectIds([])
      return
    }
    ;(async () => {
      try {
        // Ensure projects cache is loaded
        await getProjectsList()
        if (!active) return
        const related = getRelatedProjectsForMember(currentUserMemberId)
        if (active) setMyProjectIds(related.map((r) => r.key))
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load related projects for member', err)
      }
    })()
    return () => {
      active = false
    }
  }, [currentUserMemberId])
  const [showArchived, setShowArchived] = useState(false)
  const baseProjects = useMemo(() => {
    let list = activeTab === 'my' ? allProjects.filter((p) => myProjectIds.includes(p.projectId)) : allProjects
    if (!showArchived) list = list.filter((p) => !p.isArchived)
    return list
  }, [activeTab, allProjects, myProjectIds, showArchived])

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
      if (statusFilter === 'Overdue') {
        list = list.filter((p) => isProjectOverdue(p))
      } else {
        list = list.filter((p) => p.status === statusFilter)
      }
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

  const projectKanbanColumns = useMemo(() => {
    const order = statusOptions.map((o) => o.value)
    const grouped: Record<string, ProjectRow[]> = {}
    order.forEach((s) => { grouped[s] = [] })
    filteredProjects.forEach((p) => {
      const key = order.includes(p.status) ? p.status : order[0]
      grouped[key].push(p)
    })
    return order.map((status) => ({
      status,
      label: statusOptions.find((o) => o.value === status)?.label ?? status,
      projects: grouped[status] ?? [],
    }))
  }, [filteredProjects])

  useEffect(() => {
    setCurrentPage(1)
    setKanbanVisibleCount({})
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
        const detail = projectDetailsById[r.id]
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
        const detail = projectDetailsById[r.id]
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
      width: 140,
      render: (status: string, r: ProjectRow) => (
        <Space size={4} wrap>
          <Tag color={status === 'Completed' ? 'green' : status === 'Pending completion' ? 'orange' : 'default'}>{status}</Tag>
          {r.isArchived && <Tag>Archived</Tag>}
          {isProjectOverdue(r) && <Tag color="red">Overdue</Tag>}
        </Space>
      ),
    },
    { title: 'Started Date', dataIndex: 'startDate', key: 'startDate', width: 110, render: (d: string) => d || '—' },
    {
      title: 'Timeline',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 150,
      render: (_: string, r: ProjectRow) => {
        if (!r.endDate?.trim()) return 'No end date'
        const daysToStart = daysUntilStart(r.startDate)
        if (daysToStart !== null && daysToStart > 0) {
          const label = daysToStart === 1 ? 'Starts tomorrow' : `Starts in ${daysToStart} days`
          return <span style={{ color: '#1890ff', fontWeight: 500 }}>{label}</span>
        }
        const days = daysUntilEnd(r.endDate)
        if (days === null) return 'No end date'
        if (days < 0) {
          const overdue = Math.abs(days)
          const label = `${overdue} day${overdue !== 1 ? 's' : ''} overdue`
          return <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{label}</span>
        }
        return `${days} day${days !== 1 ? 's' : ''} left`
      },
    },
    {
      title: 'Tasks',
      key: 'tasks',
      width: 90,
      render: (_: unknown, r: ProjectRow) => (
        <Typography.Text type="secondary">{r.completedTasksCount} / {r.tasksCount}</Typography.Text>
      ),
    },
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
                        options={statusFilterOptions}
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
                      {isSuperAdmin && (
                        <Checkbox checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)}>
                          Show archived
                        </Checkbox>
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
                    scroll={{ x: 'max-content' }}
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
                  <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, minHeight: 400 }}>
                    {projectKanbanColumns.map((col) => {
                      const sortedProjects = reorderProjectsBy(col.projects, projectColumnOrder[col.status] ?? [])
                      const visibleCount = kanbanVisibleCount[`all-${col.status}`] || KANBAN_INITIAL_COUNT
                      const visibleProjects = sortedProjects.slice(0, visibleCount)
                      const hasMore = sortedProjects.length > visibleCount
                      const remaining = sortedProjects.length - visibleCount
                      return (
                        <div
                          key={col.status}
                          onDragOver={(e) => handleProjectDragOver(e, col.status)}
                          onDragLeave={handleProjectDragLeave}
                          onDrop={(e) => handleProjectDrop(e, col.status)}
                          style={{
                            flex: '0 0 280px',
                            minWidth: 280,
                            background: projectDropTarget === col.status ? '#e6f7ff' : '#f5f5f5',
                            borderRadius: 8,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: 'calc(100vh - 280px)',
                            border: projectDropTarget === col.status ? '2px dashed #1890ff' : undefined,
                            transition: 'background 0.2s, border 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
                            <Typography.Text strong>{col.label}</Typography.Text>
                            <Tag>{col.projects.length}</Tag>
                          </div>
                          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {visibleProjects.map((p) => {
                              const d = projectDetailsById[p.id]
                              const membersCount = d?.members.length ?? 0
                              const tasksCount = d?.tasks.length ?? 0
                              return (
                                <Card
                                  key={p.id}
                                  size="small"
                                  hoverable
                                  draggable
                                  onDragStart={(e) => handleProjectDragStart(e, p.id, col.status)}
                                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move' }}
                                  onDrop={(e) => handleProjectDropOnCard(e, p.id, col.status)}
                                  onClick={() => navigate(`/projects/${p.id}`)}
                                  styles={{ body: { padding: 12 }, root: { cursor: 'grab' } }}
                                >
                                  <Typography.Text strong style={{ display: 'block' }} ellipsis={{ tooltip: p.projectName }}>
                                    {p.projectName}
                                  </Typography.Text>
                                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.projectId}</Typography.Text>
                                  <Space size={6} style={{ marginTop: 8 }} wrap>
                                    <Tag color={priorityColors[p.priority] || 'default'} style={{ margin: 0 }}>{p.priority}</Tag>
                                    <Tag color={p.status === 'Completed' ? 'green' : p.status === 'Pending completion' ? 'orange' : 'default'} style={{ margin: 0 }}>{p.category}</Tag>
                                    {isProjectOverdue(p) && <Tag color="red" style={{ margin: 0 }}>Overdue</Tag>}
                                  </Space>
                                  <Space size={8} style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                                    <span><TeamOutlined /> {membersCount}</span>
                                    <span><CheckSquareOutlined /> {tasksCount}</span>
                                  </Space>
                                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                                    {(() => {
                                      if (!p.endDate?.trim()) return 'No end date'
                                      // If start date is in the future, show "Starts in X days" instead of "X days left"
                                      const daysToStart = daysUntilStart(p.startDate)
                                      if (daysToStart !== null && daysToStart > 0) {
                                        const label = daysToStart === 1 ? 'Starts tomorrow' : `Starts in ${daysToStart} days`
                                        return <span style={{ color: '#1890ff', fontWeight: 500 }}>{label}</span>
                                      }
                                      const days = daysUntilEnd(p.endDate)
                                      if (days === null) return 'No end date'
                                      if (days < 0) {
                                        const overdue = Math.abs(days)
                                        const label = `${overdue} day${overdue !== 1 ? 's' : ''} overdue`
                                        return <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{label}</span>
                                      }
                                      return `${days} day${days !== 1 ? 's' : ''} left`
                                    })()}
                                  </Typography.Text>
                                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                    Created {formatShortDate(d?.createdAt)}
                                  </Typography.Text>
                                  <Progress percent={p.progress} size="small" showInfo={false} style={{ marginTop: 6, marginBottom: 0 }} />
                                </Card>
                              )
                            })}
                            {hasMore && (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => setKanbanVisibleCount((prev) => ({ ...prev, [`all-${col.status}`]: visibleCount + KANBAN_LOAD_MORE }))}
                                style={{ marginTop: 4 }}
                              >
                                Show more ({remaining} remaining)
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
                        options={statusFilterOptions}
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
                      {isSuperAdmin && (
                        <Checkbox checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)}>
                          Show archived
                        </Checkbox>
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
                    scroll={{ x: 'max-content' }}
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
                  <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, minHeight: 400 }}>
                    {projectKanbanColumns.map((col) => {
                      const sortedProjects = reorderProjectsBy(col.projects, projectColumnOrder[col.status] ?? [])
                      const visibleCount = kanbanVisibleCount[`my-${col.status}`] || KANBAN_INITIAL_COUNT
                      const visibleProjects = sortedProjects.slice(0, visibleCount)
                      const hasMore = sortedProjects.length > visibleCount
                      const remaining = sortedProjects.length - visibleCount
                      return (
                        <div
                          key={col.status}
                          onDragOver={(e) => handleProjectDragOver(e, col.status)}
                          onDragLeave={handleProjectDragLeave}
                          onDrop={(e) => handleProjectDrop(e, col.status)}
                          style={{
                            flex: '0 0 280px',
                            minWidth: 280,
                            background: projectDropTarget === col.status ? '#e6f7ff' : '#f5f5f5',
                            borderRadius: 8,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: 'calc(100vh - 280px)',
                            border: projectDropTarget === col.status ? '2px dashed #1890ff' : undefined,
                            transition: 'background 0.2s, border 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
                            <Typography.Text strong>{col.label}</Typography.Text>
                            <Tag>{col.projects.length}</Tag>
                          </div>
                          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {visibleProjects.map((p) => {
                              const d = projectDetailsById[p.id]
                              const membersCount = d?.members.length ?? 0
                              const tasksCount = d?.tasks.length ?? 0
                              return (
                                <Card
                                  key={p.id}
                                  size="small"
                                  hoverable
                                  draggable
                                  onDragStart={(e) => handleProjectDragStart(e, p.id, col.status)}
                                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move' }}
                                  onDrop={(e) => handleProjectDropOnCard(e, p.id, col.status)}
                                  onClick={() => navigate(`/projects/${p.id}`)}
                                  styles={{ body: { padding: 12 }, root: { cursor: 'grab' } }}
                                >
                                  <Typography.Text strong style={{ display: 'block' }} ellipsis={{ tooltip: p.projectName }}>
                                    {p.projectName}
                                  </Typography.Text>
                                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.projectId}</Typography.Text>
                                  <Space size={6} style={{ marginTop: 8 }} wrap>
                                    <Tag color={priorityColors[p.priority] || 'default'} style={{ margin: 0 }}>{p.priority}</Tag>
                                    <Tag color={p.status === 'Completed' ? 'green' : p.status === 'Pending completion' ? 'orange' : 'default'} style={{ margin: 0 }}>{p.category}</Tag>
                                    {isProjectOverdue(p) && <Tag color="red" style={{ margin: 0 }}>Overdue</Tag>}
                                  </Space>
                                  <Space size={8} style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                                    <span><TeamOutlined /> {membersCount}</span>
                                    <span><CheckSquareOutlined /> {tasksCount}</span>
                                  </Space>
                                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                                    {(() => {
                                      if (!p.endDate?.trim()) return 'No end date'
                                      const daysToStart = daysUntilStart(p.startDate)
                                      if (daysToStart !== null && daysToStart > 0) {
                                        const label = daysToStart === 1 ? 'Starts tomorrow' : `Starts in ${daysToStart} days`
                                        return <span style={{ color: '#1890ff', fontWeight: 500 }}>{label}</span>
                                      }
                                      const days = daysUntilEnd(p.endDate)
                                      if (days === null) return 'No end date'
                                      if (days < 0) {
                                        const overdue = Math.abs(days)
                                        const label = `${overdue} day${overdue !== 1 ? 's' : ''} overdue`
                                        return <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{label}</span>
                                      }
                                      return `${days} day${days !== 1 ? 's' : ''} left`
                                    })()}
                                  </Typography.Text>
                                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                    Created {formatShortDate(d?.createdAt)}
                                  </Typography.Text>
                                  <Progress percent={p.progress} size="small" showInfo={false} style={{ marginTop: 6, marginBottom: 0 }} />
                                </Card>
                              )
                            })}
                            {hasMore && (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => setKanbanVisibleCount((prev) => ({ ...prev, [`my-${col.status}`]: visibleCount + KANBAN_LOAD_MORE }))}
                                style={{ marginTop: 4 }}
                              >
                                Show more ({remaining} remaining)
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
