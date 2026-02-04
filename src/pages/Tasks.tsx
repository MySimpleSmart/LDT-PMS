import { useState, useEffect, useMemo } from 'react'
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
} from 'antd'
import type { TabsProps } from 'antd'
import { PlusOutlined, CheckSquareOutlined, UnorderedListOutlined, UserOutlined, EditOutlined, CommentOutlined, SearchOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTasks } from '../context/TasksContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import { getProjectsList } from '../data/projects'
import { getProjectById } from '../data/projects'
import type { Task } from '../types/task'

// Status options for editing/creating tasks (no direct Completed here; use the button)
const taskStatusOptionsForForm = [
  { value: 'To do', label: 'To do' },
  { value: 'In progress', label: 'In progress' },
]

// Status options for filtering in the Tasks list (include Completed so user can filter it)
const taskStatusFilterOptions = [
  ...taskStatusOptionsForForm,
  { value: 'Completed', label: 'Completed' },
]

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
  const { currentAdmin } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState('details')
  const [noteInput, setNoteInput] = useState('')
  const [editForm] = Form.useForm()

  const task = selectedTaskId ? getTaskById(selectedTaskId) : undefined
  const projects = getProjectsList()
  const projectOptions = projects.map((p) => ({ value: p.id, label: `${p.projectId} – ${p.projectName}` }))
  const selectedProjectId = Form.useWatch('projectId', editForm)
  const projectDetail = selectedProjectId ? getProjectById(selectedProjectId) : null
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

    // Assignee
    const currentAssignee = (values.assigneeMemberId as string | undefined) || undefined
    const originalAssignee = task.assigneeMemberId || undefined
    if (currentAssignee !== originalAssignee) return true

    return false
  }

  useEffect(() => {
    if (editDrawerOpen && task) {
      const projectRow = projects.find((p) => p.projectId === task.projectId)
      editForm.setFieldsValue({
        projectId: projectRow?.id,
        taskName: task.taskName,
        status: task.status,
        startDate: task.startDate ? dayjs(task.startDate) : undefined,
        endDate: task.endDate ? dayjs(task.endDate) : undefined,
        assigneeMemberId: task.assigneeMemberId,
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
    const projectId = values.projectId as string
    const project = projectId ? getProjectById(projectId) : null
    if (!project) {
      message.error('Please select a project.')
      return
    }
    const assigneeMemberId = values.assigneeMemberId as string | undefined
    const member = assigneeMemberId ? project.members.find((m) => m.memberId === assigneeMemberId) : undefined
    const start = values.startDate as { format?: (s: string) => string } | undefined
    const end = values.endDate as { format?: (s: string) => string } | undefined
    const updates = {
      projectId: project.projectId,
      projectName: project.projectName,
      taskName: (values.taskName as string)?.trim() || '',
      status: (values.status as string) || 'To do',
      startDate: start?.format?.('YYYY-MM-DD'),
      endDate: end?.format?.('YYYY-MM-DD'),
      assigneeMemberId: assigneeMemberId || undefined,
      assigneeName: member?.name,
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
    const author = currentAdmin ? `${currentAdmin.firstName} ${currentAdmin.lastName}` : 'Current user'
    addTaskNote(task.id, { author, content: noteInput.trim(), createdAt: new Date().toISOString() })
    message.success('Note added.')
    setNoteInput('')
  }

  const currentUserDisplayName = currentAdmin ? `${currentAdmin.firstName} ${currentAdmin.lastName}`.trim() : ''
  const myTasks = currentUserDisplayName
    ? tasks.filter((t) => t.assigneeName === currentUserDisplayName)
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
          (t.assigneeName && t.assigneeName.toLowerCase().includes(q))
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
    return list
  }, [baseTasks, searchText, statusFilter, dateRange])

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
    { title: 'Assignee', dataIndex: 'assigneeName', key: 'assignee', width: 160, render: (name: string) => name || '—' },
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
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: unknown, r: Task) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(r.id)}>
          Edit
        </Button>
      ),
    },
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
      </div>
    </Card>
  )

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
          <Table<Task>
            rowKey="id"
            dataSource={filteredTasks}
            columns={columns}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: hasActiveFilters ? 'No tasks match your filters.' : 'No tasks yet.' }}
          />
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
          <Table<Task>
            rowKey="id"
            dataSource={filteredTasks}
            columns={columns}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{
              emptyText: currentUserDisplayName
                ? (hasActiveFilters ? 'No tasks assigned to you match your filters.' : 'No tasks assigned to you.')
                : 'Log in to see your tasks.',
            }}
          />
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>
          Add task
        </Button>
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
              {task.assigneeName ? ` · ${task.assigneeName}` : ''}
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
                        <Select placeholder="Select project" options={projectOptions} showSearch optionFilterProp="label" allowClear />
                      </Form.Item>
                      <Form.Item name="taskName" label="Task Name" rules={[{ required: true, message: 'Enter task name' }]}>
                        <Input placeholder="e.g. Setup API" />
                      </Form.Item>
                      <Form.Item name="status" label="Task Status">
                        <Select options={taskStatusOptionsForForm} />
                      </Form.Item>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="startDate" label="Start Date">
                            <DatePicker style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="endDate" label="End Date">
                            <DatePicker style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="assigneeMemberId" label="Assignee (project members only)">
                        <Select
                          placeholder={projectDetail ? 'Select assignee' : 'Select a project first'}
                          options={assigneeOptions}
                          showSearch
                          optionFilterProp="label"
                          allowClear
                          disabled={!projectDetail}
                        />
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit">
                            Save changes
                          </Button>
                          <Button
                            type="default"
                            icon={<CheckCircleOutlined />}
                            style={{ borderColor: '#52c41a', color: '#52c41a' }}
                            onClick={() => {
                              if (!task) return
                              editForm.setFieldsValue({ status: 'Completed' })
                              const values = { ...editForm.getFieldsValue(), status: 'Completed' }
                              onFinishEdit(values)
                            }}
                          >
                            Mark as completed
                          </Button>
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
