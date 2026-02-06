import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Table,
  Button,
  Tag,
  Tabs,
  Tooltip,
  Modal,
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  Card,
  Space,
  message,
  Row,
  Col,
  Segmented,
  Empty,
  Pagination,
} from 'antd'
import type { TabsProps } from 'antd'
import { PlusOutlined, CheckSquareOutlined, UnorderedListOutlined, UserOutlined, EditOutlined, CommentOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, AppstoreOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTasks } from '../context/TasksContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import { getProjectsList, getProjectById, type ProjectListRow, type ProjectDetail } from '../data/projects'
import { getTaskAssignees } from '../data/tasks'
import type { Task } from '../types/task'

// Only project lead (for that task’s project) or Admin/Super Admin can mark tasks as completed. Contributors cannot.
const taskStatusOptionsForForm = [
  { value: 'To do', label: 'To do' },
  { value: 'In progress', label: 'In progress' },
  { value: 'Pending completion', label: 'Pending completion' },
]

// Status options for filtering in the Tasks list
const taskStatusFilterOptions = [
  ...taskStatusOptionsForForm,
  { value: 'Completed', label: 'Completed' },
]

const TASK_KANBAN_STATUSES = ['To do', 'In progress', 'Pending completion', 'Completed']
function taskStatusTagColor(s: string): string {
  if (s === 'Completed') return 'green'
  if (s === 'In progress') return 'blue'
  if (s === 'Pending completion') return 'orange'
  return 'default'
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

function excerpt(text: string, max = 60) {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

export default function Tasks() {
  const navigate = useNavigate()
  const { tasks, getTaskById, updateTask, addTaskNote } = useTasks()
  const { currentAdminId, currentMember, isSuperAdmin, currentUserMemberId, displayName, isProjectLead } = useCurrentUser()
  const canConfirmRejectPending = (isSuperAdmin || currentAdminId) && !currentMember
  const [projects, setProjects] = useState<ProjectListRow[]>([])
  const [projectDetailsById, setProjectDetailsById] = useState<Record<string, ProjectDetail>>({})
  const showAddTask = isSuperAdmin || (currentAdminId && !currentMember) || isProjectLead

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await getProjectsList()
        if (!active) return
        setProjects(rows)

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
        console.error('Failed to load projects for Tasks page', err)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  /** Project Lead may only edit/complete tasks in projects they lead (and that project’s member tasks). Not other projects. Super Admin/Admin may edit any task. */
  const canEditTask = useCallback(
    (t: Task) => {
      if (isSuperAdmin) return true
      if (currentAdminId && !currentMember) return true
      if (!currentUserMemberId) return false
      const projectRow = projects.find((p) => p.projectId === t.projectId)
      const detail = projectRow ? projectDetailsById[projectRow.id] ?? null : null
      const projectLeadMemberId = detail?.members.find((m) => m.role === 'Lead')?.memberId
      return projectLeadMemberId === currentUserMemberId
    },
    [isSuperAdmin, currentAdminId, currentMember, currentUserMemberId, projects]
  )

  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [kanbanVisibleCount, setKanbanVisibleCount] = useState<Record<string, number>>({})
  const KANBAN_INITIAL_COUNT = 40
  const KANBAN_LOAD_MORE = 20
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState('details')
  const [noteInput, setNoteInput] = useState('')
  const [editForm] = Form.useForm()

  const task = selectedTaskId ? getTaskById(selectedTaskId) : undefined
  const projectOptions = projects.map((p) => ({ value: p.id, label: `${p.projectId} – ${p.projectName}` }))
  const selectedProjectId = Form.useWatch('projectId', editForm)
  const projectDetail = selectedProjectId ? projectDetailsById[selectedProjectId] ?? null : null
  const assigneeOptions = projectDetail
    ? projectDetail.members.map((m) => ({ value: m.memberId, label: `${m.name} (${m.role})` }))
    : []

  // Compare current form values against the original task values to detect real changes.
  const isFormDirty = () => {
    if (!task) return false
    const values = editForm.getFieldsValue()

    // Project (compare by row id used in the Select)
    const originalProjectRow = projects.find((p) => p.projectId === task.projectId)
    const originalProjectId = originalProjectRow?.id
    const currentProjectId = values.projectId as string | undefined
    if (currentProjectId !== originalProjectId) return true

    // Task name
    const currentName = (values.taskName as string | undefined)?.trim() || ''
    if (currentName !== (task.taskName || '')) return true

    // Status
    const currentStatus = values.status as string | undefined
    if ((currentStatus || 'To do') !== (task.status || 'To do')) return true

    // Dates (compare as YYYY-MM-DD strings or undefined)
    const currentStart = (values.startDate as Dayjs | undefined)?.format('YYYY-MM-DD') || undefined
    const currentEnd = (values.endDate as Dayjs | undefined)?.format('YYYY-MM-DD') || undefined
    const originalStart = task.startDate || undefined
    const originalEnd = task.endDate || undefined
    if (currentStart !== originalStart) return true
    if (currentEnd !== originalEnd) return true

    // Assignees (compare sorted member IDs)
    const currentIds = ((values.assigneeMemberIds as string[] | undefined) || []).slice().sort()
    const originalIds = getTaskAssignees(task).map((a) => a.memberId).sort()
    if (currentIds.length !== originalIds.length || currentIds.some((id, i) => id !== originalIds[i])) return true

    return false
  }

  useEffect(() => {
    if (editDrawerOpen && task) {
      const projectRow = projects.find((p) => p.projectId === task.projectId)
      const assignees = getTaskAssignees(task)
      editForm.setFieldsValue({
        projectId: projectRow?.id,
        taskName: task.taskName,
        status: task.status,
        startDate: task.startDate ? dayjs(task.startDate) : undefined,
        endDate: task.endDate ? dayjs(task.endDate) : undefined,
        assigneeMemberIds: assignees.map((a) => a.memberId),
      })
    }
  }, [editDrawerOpen, task, projects, editForm])

  const openEditDrawer = (taskId: string) => {
    setSelectedTaskId(taskId)
    setEditDrawerOpen(true)
    setDrawerTab('details')
    setNoteInput('')
  }

  const closeEditDrawer = () => {
    const isDirty = isFormDirty() || Boolean(noteInput.trim())
    if (!isDirty) {
      setEditDrawerOpen(false)
      setSelectedTaskId(null)
      return
    }
    Modal.confirm({
      title: 'Discard changes?',
      content: 'You have unsaved changes. If you close, your changes will be lost.',
      okText: 'Close without saving',
      okButtonProps: { danger: true },
      cancelText: 'Stay',
      onOk: () => {
        setEditDrawerOpen(false)
        setSelectedTaskId(null)
      },
    })
  }

  const onFinishEdit = (values: Record<string, unknown>) => {
    if (!task) return
    if (!canEditTask(task)) {
      message.error('You can only edit and complete tasks in projects you lead.')
      return
    }
    const projectId = values.projectId as string
    const project = projectId ? projectDetailsById[projectId] ?? null : null
    if (!project) {
      message.error('Please select a project.')
      return
    }
    const memberIds = (values.assigneeMemberIds as string[] | undefined) || []
    const assignees = memberIds
      .map((mid) => project.members.find((m) => m.memberId === mid))
      .filter(Boolean)
      .map((m) => ({ memberId: m!.memberId, name: m!.name }))
    const start = values.startDate as { format?: (s: string) => string } | undefined
    const end = values.endDate as { format?: (s: string) => string } | undefined
    const updates = {
      projectId: project.projectId,
      projectName: project.projectName,
      taskName: (values.taskName as string)?.trim() || '',
      status: (values.status as string) || 'To do',
      startDate: start?.format?.('YYYY-MM-DD'),
      endDate: end?.format?.('YYYY-MM-DD'),
      assignees: assignees.length ? assignees : undefined,
    }

    Modal.confirm({
      title: 'Save task changes?',
      content: 'This will update the task details.',
      okText: 'Save changes',
      cancelText: 'Cancel',
      onOk: () => {
        updateTask(task.id, updates)
        message.success('Task updated.')
      },
    })
  }

  const onAddNote = () => {
    if (!task || !noteInput.trim()) return
    const author = displayName || 'Current user'
    addTaskNote(task.id, { author, content: noteInput.trim(), createdAt: new Date().toISOString() })
    message.success('Note added.')
    setNoteInput('')
  }

  const currentUserDisplayName = displayName.trim()
  const myTasks = currentUserDisplayName
    ? tasks.filter((t) => getTaskAssignees(t).some((a) => a.name === currentUserDisplayName))
    : []

  const baseTasks = activeTab === 'my' ? myTasks : tasks
  const filteredTasks = useMemo(() => {
    let list = baseTasks
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(
        (t) =>
          (t.taskName && t.taskName.toLowerCase().includes(q)) ||
          (t.projectName && t.projectName.toLowerCase().includes(q)) ||
          (t.projectId && t.projectId.toLowerCase().includes(q)) ||
          getTaskAssignees(t).some((a) => a.name && a.name.toLowerCase().includes(q))
      )
    }
    if (statusFilter) {
      list = list.filter((t) => t.status === statusFilter)
    }
    if (dateRange && (dateRange[0] || dateRange[1])) {
      const [rangeStart, rangeEnd] = dateRange
      list = list.filter((t) => {
        const taskStart = t.startDate ? dayjs(t.startDate) : null
        const taskEnd = t.endDate ? dayjs(t.endDate) : null
        if (!taskStart && !taskEnd) return true
        if (rangeStart && taskEnd && taskEnd.isBefore(rangeStart)) return false
        if (rangeEnd && taskStart && taskStart.isAfter(rangeEnd)) return false
        return true
      })
    }
    return [...list].sort((a, b) => {
      const dateA = a.startDate ? dayjs(a.startDate).valueOf() : 0
      const dateB = b.startDate ? dayjs(b.startDate).valueOf() : 0
      return dateB - dateA
    })
  }, [baseTasks, searchText, statusFilter, dateRange])

  const taskKanbanColumns = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    TASK_KANBAN_STATUSES.forEach((s) => { grouped[s] = [] })
    filteredTasks.forEach((t) => {
      const key = TASK_KANBAN_STATUSES.includes(t.status) ? t.status : TASK_KANBAN_STATUSES[0]
      grouped[key].push(t)
    })
    return TASK_KANBAN_STATUSES.map((status) => ({
      status,
      tasks: grouped[status] ?? [],
    }))
  }, [filteredTasks])

  useEffect(() => {
    setCurrentPage(1)
    setKanbanVisibleCount({})
  }, [filteredTasks.length])

  const noteColumns = [
    { title: 'Author', dataIndex: 'author', key: 'author', width: 140 },
    { title: 'Content', dataIndex: 'content', key: 'content' },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 180, render: formatDate },
  ]

  const columns = [
    { title: 'Related Project', dataIndex: 'projectName', key: 'projectName', width: 200 },
    { title: 'Task Name', dataIndex: 'taskName', key: 'taskName' },
    {
      title: 'Task Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        const color =
          status === 'Completed'
            ? 'green'
            : status === 'In progress'
            ? 'blue'
            : 'default'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: 'Assignees',
      key: 'assignees',
      width: 200,
      render: (_: unknown, r: Task) => {
        const assignees = getTaskAssignees(r)
        if (!assignees.length) return '—'
        return (
          <Space size={4} wrap>
            {assignees.map((a) => (
              <Tag key={a.memberId}>{a.name}</Tag>
            ))}
          </Space>
        )
      },
    },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', width: 110, render: (d: string) => d || '—' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', width: 110, render: (d: string) => d || '—' },
    {
      title: 'Notes',
      key: 'notes',
      width: 260,
      render: (_: unknown, r: Task) => {
        const notes = r.notes ?? []
        if (!notes.length) return '—'
        const last = notes[notes.length - 1]
        const preview = excerpt(last.content, 60)
        return (
          <Space size={6} wrap={false}>
            <Tag>{notes.length}</Tag>
            <Tooltip title={last.content}>
              <Typography.Text type="secondary">
                {preview}
              </Typography.Text>
            </Tooltip>
          </Space>
        )
      },
    },
    ...[
      {
        title: 'Action',
        key: 'action',
        width: 100,
        render: (_: unknown, r: Task) =>
          canEditTask(r) ? (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(r.id)}>
              Edit
            </Button>
          ) : null,
      },
    ],
  ]

  const hasActiveFilters = Boolean(searchText || statusFilter || (dateRange && (dateRange[0] || dateRange[1])))

  const filterCard = (
    <Card size="small" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <Space wrap size="middle" align="center">
          <Input
            placeholder="Search by task name, project, or assignee..."
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
            options={taskStatusFilterOptions}
          />
          <DatePicker.RangePicker
            placeholder={['Start date', 'End date']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
            allowClear
          />
          {hasActiveFilters && (
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
  )

  const renderTaskKanban = (emptyText: string) =>
    filteredTasks.length ? (
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, minHeight: 400 }}>
        {taskKanbanColumns.map((col) => {
          const visibleCount = kanbanVisibleCount[col.status] || KANBAN_INITIAL_COUNT
          const visibleTasks = col.tasks.slice(0, visibleCount)
          const hasMore = col.tasks.length > visibleCount
          const remaining = col.tasks.length - visibleCount
          return (
            <div
              key={col.status}
              style={{
                flex: '0 0 280px',
                minWidth: 280,
                background: '#f5f5f5',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 280px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
                <Typography.Text strong>{col.status}</Typography.Text>
                <Tag>{col.tasks.length}</Tag>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visibleTasks.map((t) => {
                  const assignees = getTaskAssignees(t)
                  return (
                    <Card
                      key={t.id}
                      size="small"
                      hoverable={canEditTask(t)}
                      onClick={canEditTask(t) ? () => openEditDrawer(t.id) : undefined}
                      styles={{ body: { padding: 12 } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <Typography.Text strong style={{ display: 'block', minWidth: 0 }} ellipsis={{ tooltip: t.taskName }}>
                          {t.taskName}
                        </Typography.Text>
                        {canEditTask(t) && (
                          <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => { e.stopPropagation(); openEditDrawer(t.id) }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }} ellipsis={{ tooltip: t.projectName }}>
                        {t.projectName}
                      </Typography.Text>
                      {assignees.length > 0 && (
                        <Space size={4} wrap style={{ marginTop: 6 }}>
                          {assignees.map((a) => (
                            <Tag key={a.memberId} style={{ margin: 0 }}>{a.name}</Tag>
                          ))}
                        </Space>
                      )}
                      <Space size={8} style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                        <span>Start: {t.startDate ?? '—'}</span>
                        <span>End: {t.endDate ?? '—'}</span>
                      </Space>
                    </Card>
                  )
                })}
                {hasMore && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setKanbanVisibleCount((prev) => ({ ...prev, [col.status]: visibleCount + KANBAN_LOAD_MORE }))}
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
        <Empty description={emptyText} />
      </Card>
    )

  const allTasksEmptyText = hasActiveFilters ? 'No tasks match your filters.' : 'No tasks yet.'
  const myTasksEmptyText = currentUserDisplayName
    ? (hasActiveFilters ? 'No tasks assigned to you match your filters.' : 'No tasks assigned to you.')
    : 'Log in to see your tasks.'

  const tabItems: TabsProps['items'] = [
    {
      key: 'all',
      label: (
        <span>
          <UnorderedListOutlined /> All Tasks
        </span>
      ),
      children: (
        <>
          {filterCard}
          {viewMode === 'list' ? (
            <Table<Task>
              rowKey="id"
              dataSource={filteredTasks}
              columns={columns}
              size="small"
              pagination={{
                current: currentPage,
                pageSize,
                total: filteredTasks.length,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total) => `Total ${total} items`,
                onChange: (page, size) => {
                  setCurrentPage(page)
                  if (size) setPageSize(size)
                },
              }}
              locale={{ emptyText: allTasksEmptyText }}
            />
          ) : (
            renderTaskKanban(allTasksEmptyText)
          )}
        </>
      ),
    },
    {
      key: 'my',
      label: (
        <span>
          <UserOutlined /> My Tasks
        </span>
      ),
      children: (
        <>
          {filterCard}
          {currentUserDisplayName ? (
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Tasks assigned to you ({currentUserDisplayName}).
            </Typography.Text>
          ) : null}
          {viewMode === 'list' ? (
            <Table<Task>
              rowKey="id"
              dataSource={filteredTasks}
              columns={columns}
              size="small"
              pagination={{
                current: currentPage,
                pageSize,
                total: filteredTasks.length,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total) => `Total ${total} items`,
                onChange: (page, size) => {
                  setCurrentPage(page)
                  if (size) setPageSize(size)
                },
              }}
              locale={{ emptyText: myTasksEmptyText }}
            />
          ) : (
            renderTaskKanban(myTasksEmptyText)
          )}
        </>
      ),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            <CheckSquareOutlined /> Tasks
          </Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            View and manage tasks. All Tasks or My Tasks (assigned to you).
          </Typography.Text>
        </div>
        {showAddTask && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>
            Add task
          </Button>
        )}
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Drawer
        title={task ? `Edit: ${task.taskName}` : 'Edit task'}
        width={560}
        open={editDrawerOpen}
        onClose={closeEditDrawer}
        destroyOnClose
      >
        {task && (
          <>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {task.projectName} ({task.projectId}) · {task.status}
              {getTaskAssignees(task).length ? ` · ${getTaskAssignees(task).map((a) => a.name).join(', ')}` : ''}
            </Typography.Text>
            <Tabs
              activeKey={drawerTab}
              onChange={setDrawerTab}
              items={[
                {
                  key: 'details',
                  label: (
                    <span>
                      <EditOutlined /> Edit
                    </span>
                  ),
                  children: (
                    <Form form={editForm} layout="vertical" onFinish={onFinishEdit}>
                      <Form.Item name="projectId" label="Related Project" rules={[{ required: true, message: 'Select a project' }]}>
                        <Select placeholder="Select project" options={projectOptions} showSearch optionFilterProp="label" allowClear disabled={task?.status === 'Completed' || (task?.status === 'Pending completion' && !canConfirmRejectPending)} />
                      </Form.Item>
                      <Form.Item name="taskName" label="Task Name" rules={[{ required: true, message: 'Enter task name' }]}>
                        <Input placeholder="e.g. Setup API" disabled={task?.status === 'Completed' || (task?.status === 'Pending completion' && !canConfirmRejectPending)} />
                      </Form.Item>
                      <Form.Item name="status" label="Task Status">
                        <Select options={taskStatusOptionsForForm} disabled={task?.status === 'Completed' || (task?.status === 'Pending completion' && !canConfirmRejectPending)} />
                      </Form.Item>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="startDate" label="Start Date">
                            <DatePicker style={{ width: '100%' }} disabled={task?.status === 'Completed' || (task?.status === 'Pending completion' && !canConfirmRejectPending)} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="endDate" label="End Date">
                            <DatePicker style={{ width: '100%' }} disabled={task?.status === 'Completed' || (task?.status === 'Pending completion' && !canConfirmRejectPending)} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="assigneeMemberIds" label="Assignees (project members)">
                        <Select
                          mode="multiple"
                          placeholder={projectDetail ? 'Select one or more assignees' : 'Select a project first'}
                          options={assigneeOptions}
                          showSearch
                          optionFilterProp="label"
                          disabled={!projectDetail || task?.status === 'Completed' || (task?.status === 'Pending completion' && !canConfirmRejectPending)}
                        />
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" disabled={task?.status === 'Completed' || (task?.status === 'Pending completion' && !canConfirmRejectPending)}>
                            Save changes
                          </Button>
                          {task?.status === 'Pending completion' && canConfirmRejectPending ? (
                            <Space>
                              <Button
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={() => {
                                  if (!task) return
                                  editForm.setFieldsValue({ status: 'Completed' })
                                  onFinishEdit({ ...editForm.getFieldsValue(), status: 'Completed' })
                                  message.success('Task confirmed and marked as Completed.')
                                }}
                              >
                                Confirm
                              </Button>
                              <Button
                                danger
                                icon={<CloseCircleOutlined />}
                                onClick={() => {
                                  if (!task) return
                                  updateTask(task.id, { status: 'In progress' })
                                  message.success('Task rejected. Status set back to In progress.')
                                  setEditDrawerOpen(false)
                                }}
                              >
                                Reject
                              </Button>
                            </Space>
                          ) : (
                            <Button
                              type="default"
                              icon={<CheckCircleOutlined />}
                              style={
                                task?.status === 'Completed' || task?.status === 'Pending completion'
                                  ? { borderColor: '#d9d9d9', color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' }
                                  : { borderColor: '#52c41a', color: '#52c41a' }
                              }
                              disabled={task?.status === 'Completed' || task?.status === 'Pending completion'}
                              onClick={() => {
                                if (!task || !canEditTask(task)) {
                                  message.error('Only the project lead for this project can mark tasks as completed.')
                                  return
                                }
                                const targetStatus = canConfirmRejectPending ? 'Completed' : 'Pending completion'
                                editForm.setFieldsValue({ status: targetStatus })
                                const values = { ...editForm.getFieldsValue(), status: targetStatus }
                                onFinishEdit(values)
                                if (targetStatus === 'Pending completion') message.success('Task sent for completion. An admin will review.')
                              }}
                            >
                              {task?.status === 'Completed' ? 'Completed' : task?.status === 'Pending completion' ? 'Pending review' : 'Mark as completed'}
                            </Button>
                          )}
                        </Space>
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: 'notes',
                  label: (
                    <span>
                      <CommentOutlined /> Notes
                    </span>
                  ),
                  children: (
                    <>
                      <Card size="small" title="Add note" style={{ marginBottom: 16 }}>
                        <Space.Compact style={{ width: '100%' }} direction="vertical">
                          <Input.TextArea
                            rows={3}
                            placeholder="Write a note..."
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                          />
                          <Button type="primary" onClick={onAddNote}>Add note</Button>
                        </Space.Compact>
                      </Card>
                      <Table
                        dataSource={task.notes ?? []}
                        columns={noteColumns}
                        rowKey="key"
                        pagination={false}
                        size="small"
                        locale={{ emptyText: 'No notes yet.' }}
                      />
                    </>
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  )
}
