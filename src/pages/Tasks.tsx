import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import { PlusOutlined, CheckSquareOutlined, UnorderedListOutlined, UserOutlined, EditOutlined, CommentOutlined, SearchOutlined, CheckCircleOutlined, AppstoreOutlined, RollbackOutlined, DeleteOutlined } from '@ant-design/icons'
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
]

// Status options for filtering in the Tasks list
const taskStatusFilterOptions = [
  ...taskStatusOptionsForForm,
  { value: 'Completed', label: 'Completed' },
]

const TASK_KANBAN_STATUSES = ['To do', 'In progress', 'Completed']
const TASK_KANBAN_ORDER_KEY = 'echo_task_kanban_order'

/** Reorder tasks by a list of ids (ids first in that order, then any task not in the list). */
function reorderTasksBy(tasks: Task[], orderIds: string[]): Task[] {
  if (!orderIds.length) return tasks
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const ordered: Task[] = []
  for (const id of orderIds) {
    if (byId.has(id)) ordered.push(byId.get(id)!)
  }
  for (const t of tasks) {
    if (!orderIds.includes(t.id)) ordered.push(t)
  }
  return ordered
}

/** Allowed Kanban drag: from status → list of statuses you can drop into. e.g. Completed can only go to In progress (reopen), not To do. */
const ALLOWED_TASK_STATUS_FROM_TO: Record<string, string[]> = {
  'To do': ['In progress', 'Completed'],
  'In progress': ['To do', 'Completed'],
  'Completed': ['In progress'], // reopen only to In progress, not back to To do
}

function canMoveTaskToStatus(currentStatus: string, newStatus: string): boolean {
  if (currentStatus === newStatus) return false
  const allowed = ALLOWED_TASK_STATUS_FROM_TO[currentStatus]
  return Array.isArray(allowed) && allowed.includes(newStatus)
}

function taskStatusTagColor(s: string): string {
  if (s === 'Completed') return 'green'
  if (s === 'In progress') return 'blue'
  return 'default'
}

/** Task can set start/end only when the parent project has at least one of start or end date. */
function projectAllowsTaskDates(project: ProjectDetail | null): boolean {
  if (!project) return false
  const start = project.startDate?.trim() ?? ''
  const end = project.endDate?.trim() ?? ''
  return start !== '' || end !== ''
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

export default function Tasks() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tasks, getTaskById, updateTask, removeTask, addTaskNote } = useTasks()
  const { currentAdminId, currentMember, isSuperAdmin, currentUserMemberId, displayName, isProjectLead } = useCurrentUser()
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

  const openTaskIdFromState = (location.state as { openTaskId?: string } | null)?.openTaskId
  useEffect(() => {
    if (!openTaskIdFromState) return
    setSelectedTaskId(openTaskIdFromState)
    setEditDrawerOpen(true)
    setDrawerTab('details')
    navigate(location.pathname, { replace: true, state: {} })
  }, [openTaskIdFromState, navigate, location.pathname])

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
  const [taskDropTarget, setTaskDropTarget] = useState<string | null>(null)
  const [taskColumnOrder, setTaskColumnOrder] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(TASK_KANBAN_ORDER_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(TASK_KANBAN_ORDER_KEY, JSON.stringify(taskColumnOrder))
    } catch {}
  }, [taskColumnOrder])
  const KANBAN_INITIAL_COUNT = 40
  const KANBAN_LOAD_MORE = 20
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState('details')
  const [noteInput, setNoteInput] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)
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
      const detail = projectRow ? projectDetailsById[projectRow.id] ?? null : null
      const allowDates = projectAllowsTaskDates(detail)
      editForm.setFieldsValue({
        projectId: projectRow?.id,
        taskName: task.taskName,
        status: task.status,
        startDate: allowDates && task.startDate ? dayjs(task.startDate) : undefined,
        endDate: allowDates && task.endDate ? dayjs(task.endDate) : undefined,
        assigneeMemberIds: getTaskAssignees(task).map((a) => a.memberId),
      })
    }
  }, [editDrawerOpen, task, projects, projectDetailsById, editForm])

  useEffect(() => {
    if (editDrawerOpen && selectedProjectId) {
      const detail = projectDetailsById[selectedProjectId] ?? null
      if (!projectAllowsTaskDates(detail)) {
        editForm.setFieldsValue({ startDate: undefined, endDate: undefined })
      }
    }
  }, [editDrawerOpen, selectedProjectId, projectDetailsById, editForm])

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
    let startDate: string | undefined = start?.format?.('YYYY-MM-DD')
    let endDate: string | undefined = end?.format?.('YYYY-MM-DD')

    if (!projectAllowsTaskDates(project)) {
      startDate = undefined
      endDate = undefined
    } else {
      const projectStart = project.startDate?.trim() ? dayjs(project.startDate) : null
      const projectEnd = project.endDate?.trim() ? dayjs(project.endDate) : null
      if (startDate && projectStart && dayjs(startDate).isBefore(projectStart, 'day')) {
        message.error(`Task start date cannot be earlier than the project start date (${project.startDate}).`)
        return
      }
      if (endDate && projectEnd && dayjs(endDate).isAfter(projectEnd, 'day')) {
        message.error(`Task end date cannot be later than the project end date (${project.endDate}).`)
        return
      }
      if (startDate && endDate && dayjs(endDate).isBefore(dayjs(startDate), 'day')) {
        message.error('Task end date cannot be earlier than start date.')
        return
      }
    }

    let status = (values.status as string) || 'To do'
    if (status !== 'Completed' && startDate && endDate) {
      status = 'In progress'
    }

    const updates = {
      projectId: project.projectId,
      projectName: project.projectName,
      taskName: (values.taskName as string)?.trim() || '',
      status,
      startDate,
      endDate,
      assignees: assignees.length ? assignees : undefined,
    }

    Modal.confirm({
      title: 'Save task changes?',
      content: 'This will update the task details.',
      okText: 'Save changes',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await updateTask(task.id, updates)
          message.success('Task saved.')
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to save task.')
        }
      },
    })
  }

  const onAddNote = async () => {
    if (!task || !noteInput.trim()) return
    setNoteSubmitting(true)
    try {
      const author = displayName || 'Current user'
      await addTaskNote(task.id, { author, content: noteInput.trim(), createdAt: new Date().toISOString() })
      message.success('Note saved.')
      setNoteInput('')
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save note.')
    } finally {
      setNoteSubmitting(false)
    }
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
      const status = t.status === 'Pending completion' ? 'In progress' : t.status
      const key = TASK_KANBAN_STATUSES.includes(status) ? status : TASK_KANBAN_STATUSES[0]
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

  const handleMarkComplete = useCallback(
    (r: Task) => {
      if (r.status === 'Completed') return
      if (!canEditTask(r)) {
        message.error('Only the project lead for this project can mark tasks as completed.')
        return
      }
      Modal.confirm({
        title: 'Mark task as completed?',
        content: 'This will set the task status to Completed.',
        okText: 'Mark as completed',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await updateTask(r.id, { status: 'Completed', completedAt: new Date().toISOString() })
            message.success('Task marked as completed.')
          } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to update task.')
          }
        },
      })
    },
    [canEditTask, updateTask]
  )

  const handleRedo = useCallback(
    (r: Task) => {
      if (r.status !== 'Completed') return
      if (!canEditTask(r)) return
      Modal.confirm({
        title: 'Reopen task?',
        content: 'This will set the task status back to In progress.',
        okText: 'Reopen',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await updateTask(r.id, { status: 'In progress' })
            message.success('Task reopened.')
          } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to update task.')
          }
        },
      })
    },
    [canEditTask, updateTask]
  )

  const handleTaskDragStart = useCallback((e: React.DragEvent, taskId: string, sourceStatus: string) => {
    e.dataTransfer.setData('application/x-echo-task-id', taskId)
    e.dataTransfer.setData('application/x-echo-task-status', sourceStatus)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleTaskDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setTaskDropTarget(status)
  }, [])

  const handleTaskDragLeave = useCallback(() => {
    setTaskDropTarget(null)
  }, [])

  const handleTaskDrop = useCallback(
    async (e: React.DragEvent, newStatus: string) => {
      e.preventDefault()
      setTaskDropTarget(null)
      const taskId = e.dataTransfer.getData('application/x-echo-task-id')
      if (!taskId) return
      const task = tasks.find((t) => t.id === taskId)
      if (!task || task.status === newStatus) return
      if (!canEditTask(task)) {
        message.error('You cannot change this task’s status.')
        return
      }
      const fromStatus = task.status === 'Pending completion' ? 'In progress' : task.status
      if (!canMoveTaskToStatus(fromStatus, newStatus)) {
        message.warning(`Cannot move a task from "${fromStatus}" to "${newStatus}".`)
        return
      }
      try {
        const updates: Partial<Omit<Task, 'id' | 'notes'>> = { status: newStatus }
        if (newStatus === 'Completed' && fromStatus !== 'Completed') {
          updates.completedAt = new Date().toISOString()
        }
        await updateTask(taskId, updates)
        setTaskColumnOrder((prev) => {
          const next = { ...prev }
          const current = next[fromStatus]?.filter((id) => id !== taskId) ?? []
          next[fromStatus] = current
          const inNew = next[newStatus] ?? []
          if (!inNew.includes(taskId)) next[newStatus] = [...inNew, taskId]
          return next
        })
        message.success(`Task status set to ${newStatus}.`)
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to update task status.')
      }
    },
    [tasks, canEditTask, updateTask]
  )

  const handleTaskDropOnCard = useCallback(
    async (e: React.DragEvent, targetTaskId: string, targetStatus: string) => {
      e.preventDefault()
      e.stopPropagation()
      setTaskDropTarget(null)
      const taskId = e.dataTransfer.getData('application/x-echo-task-id')
      const sourceStatus = e.dataTransfer.getData('application/x-echo-task-status')
      if (!taskId || taskId === targetTaskId) return
      const task = tasks.find((t) => t.id === taskId)
      if (!task || !canEditTask(task)) return
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const dropInLowerHalf = e.clientY >= rect.top + rect.height / 2
      if (sourceStatus === targetStatus) {
        const col = taskKanbanColumns.find((c) => c.status === targetStatus)
        const order = taskColumnOrder[targetStatus] ?? col?.tasks.map((t) => t.id) ?? []
        const without = order.filter((id) => id !== taskId)
        const targetIndex = without.indexOf(targetTaskId)
        const insertIndex = targetIndex === -1 ? without.length : (dropInLowerHalf ? targetIndex + 1 : targetIndex)
        const newOrder = [...without.slice(0, insertIndex), taskId, ...without.slice(insertIndex)]
        setTaskColumnOrder((prev) => ({ ...prev, [targetStatus]: newOrder }))
        return
      }
      const fromStatus = task.status === 'Pending completion' ? 'In progress' : task.status
      if (!canMoveTaskToStatus(fromStatus, targetStatus)) {
        message.warning(`Cannot move a task from "${fromStatus}" to "${targetStatus}".`)
        return
      }
      try {
        const updates: Partial<Omit<Task, 'id' | 'notes'>> = { status: targetStatus }
        if (targetStatus === 'Completed' && fromStatus !== 'Completed') {
          updates.completedAt = new Date().toISOString()
        }
        await updateTask(taskId, updates)
        setTaskColumnOrder((prev) => {
          const next = { ...prev }
          const fromList = next[sourceStatus]?.filter((id) => id !== taskId) ?? []
          next[sourceStatus] = fromList
          const toList = next[targetStatus] ?? []
          const targetIdx = toList.indexOf(targetTaskId)
          const insertAt = targetIdx === -1 ? toList.length : (dropInLowerHalf ? targetIdx + 1 : targetIdx)
          const newToList = [...toList.slice(0, insertAt), taskId, ...toList.slice(insertAt)]
          next[targetStatus] = newToList
          return next
        })
        message.success(`Task status set to ${targetStatus}.`)
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to update task status.')
      }
    },
    [tasks, canEditTask, updateTask, taskColumnOrder, taskKanbanColumns]
  )

  const handleRemoveTask = useCallback(
    (r: Task) => {
      if (!canEditTask(r)) return
      Modal.confirm({
        title: 'Remove task?',
        content: `This will permanently remove "${r.taskName}" from the project. This cannot be undone.`,
        okText: 'Remove',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await removeTask(r.id)
            message.success('Task removed.')
            if (selectedTaskId === r.id) {
              setEditDrawerOpen(false)
              setSelectedTaskId(null)
            }
          } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to remove task.')
          }
        },
      })
    },
    [canEditTask, removeTask, selectedTaskId]
  )

  const columns = [
    {
      title: '',
      key: 'complete',
      width: 48,
      align: 'center' as const,
      render: (_: unknown, r: Task) => {
        if (r.status === 'Completed') {
          return canEditTask(r) ? (
            <Tooltip title="Reopen task">
              <RollbackOutlined
                style={{ color: '#1890ff', fontSize: 20, cursor: 'pointer' }}
                onClick={() => handleRedo(r)}
              />
            </Tooltip>
          ) : (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} title="Completed" />
          )
        }
        if (canEditTask(r)) {
          return (
            <Tooltip title="Mark as completed">
              <CheckCircleOutlined
                style={{ color: 'rgba(0,0,0,0.25)', fontSize: 20, cursor: 'pointer' }}
                onClick={() => handleMarkComplete(r)}
              />
            </Tooltip>
          )
        }
        return null
      },
    },
    { title: 'Related Project', dataIndex: 'projectName', key: 'projectName', width: 200 },
    { title: 'Task Name', dataIndex: 'taskName', key: 'taskName' },
    {
      title: 'Task Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        const displayStatus = status === 'Pending completion' ? 'In progress' : status
        const color =
          displayStatus === 'Completed'
            ? 'green'
            : displayStatus === 'In progress'
            ? 'blue'
            : 'default'
        return <Tag color={color}>{displayStatus}</Tag>
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
    { title: 'Started Date', dataIndex: 'startDate', key: 'startDate', width: 110, render: (d: string) => d || '—' },
    {
      title: 'Timeline',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 150,
      render: (_: string, t: Task) => {
        if (!t.endDate?.trim()) return 'No end date'
        const end = dayjs(t.endDate).startOf('day')
        if (t.status === 'Completed') {
          const completed = dayjs(t.completedAt || new Date().toISOString()).startOf('day')
          const daysAtCompletion = end.diff(completed, 'day')
          if (daysAtCompletion > 0) {
            return `${daysAtCompletion} day${daysAtCompletion !== 1 ? 's' : ''} before completed`
          }
          if (daysAtCompletion === 0) {
            return 'Completed on due date'
          }
          const overdueAtCompletion = Math.abs(daysAtCompletion)
          return `${overdueAtCompletion} day${overdueAtCompletion !== 1 ? 's' : ''} after due date`
        }
        const daysToStart = daysUntilStart(t.startDate)
        if (daysToStart !== null && daysToStart > 0) {
          const label = daysToStart === 1 ? 'Starts tomorrow' : `Starts in ${daysToStart} days`
          return <span style={{ color: '#1890ff', fontWeight: 500 }}>{label}</span>
        }
        const days = daysUntilEnd(t.endDate)
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
        width: 140,
        render: (_: unknown, r: Task) =>
          canEditTask(r) ? (
            <Space size="small">
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(r.id)}>
                Edit
              </Button>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveTask(r)}>
                Remove
              </Button>
            </Space>
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
          const sortedTasks = reorderTasksBy(col.tasks, taskColumnOrder[col.status] ?? [])
          const visibleCount = kanbanVisibleCount[col.status] || KANBAN_INITIAL_COUNT
          const visibleTasks = sortedTasks.slice(0, visibleCount)
          const hasMore = sortedTasks.length > visibleCount
          const remaining = sortedTasks.length - visibleCount
          return (
            <div
              key={col.status}
              onDragOver={(e) => handleTaskDragOver(e, col.status)}
              onDragLeave={handleTaskDragLeave}
              onDrop={(e) => handleTaskDrop(e, col.status)}
              style={{
                flex: '0 0 280px',
                minWidth: 280,
                background: taskDropTarget === col.status ? '#e6f7ff' : '#f5f5f5',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 280px)',
                border: taskDropTarget === col.status ? '2px dashed #1890ff' : undefined,
                transition: 'background 0.2s, border 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
                <Typography.Text strong>{col.status}</Typography.Text>
                <Tag>{col.tasks.length}</Tag>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visibleTasks.map((t) => {
                  const assignees = getTaskAssignees(t)
                  const editable = canEditTask(t)
                  return (
                    <Card
                      key={t.id}
                      size="small"
                      hoverable={editable}
                      draggable={editable}
                      onDragStart={editable ? (e) => handleTaskDragStart(e, t.id, col.status) : undefined}
                      onDragOver={editable ? (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move' } : undefined}
                      onDrop={editable ? (e) => handleTaskDropOnCard(e, t.id, col.status) : undefined}
                      onClick={editable ? () => openEditDrawer(t.id) : undefined}
                      styles={{ body: { padding: 12 }, root: editable ? { cursor: 'grab' } : undefined }}
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
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                        {(() => {
                          if (!t.endDate?.trim()) return 'No end date'
                          const end = dayjs(t.endDate).startOf('day')
                          if (t.status === 'Completed') {
                            const completed = dayjs(t.completedAt || new Date().toISOString()).startOf('day')
                            const daysAtCompletion = end.diff(completed, 'day')
                            if (daysAtCompletion > 0) {
                              return `${daysAtCompletion} day${daysAtCompletion !== 1 ? 's' : ''} before completed`
                            }
                            if (daysAtCompletion === 0) {
                              return 'Completed on due date'
                            }
                            const overdue = Math.abs(daysAtCompletion)
                            return `${overdue} day${overdue !== 1 ? 's' : ''} after due date`
                          }
                          // If start date is in the future, show "Starts in X days" instead of "X days left"
                          const daysToStart = daysUntilStart(t.startDate)
                          if (daysToStart !== null && daysToStart > 0) {
                            const label = daysToStart === 1 ? 'Starts tomorrow' : `Starts in ${daysToStart} days`
                            return <span style={{ color: '#1890ff', fontWeight: 500 }}>{label}</span>
                          }
                          const days = daysUntilEnd(t.endDate)
                          if (days === null) return 'No end date'
                          if (days < 0) {
                            const overdue = Math.abs(days)
                            const label = `${overdue} day${overdue !== 1 ? 's' : ''} overdue`
                            return <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{label}</span>
                          }
                          return `${days} day${days !== 1 ? 's' : ''} left`
                        })()}
                      </Typography.Text>
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
              scroll={{ x: 'max-content' }}
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
              scroll={{ x: 'max-content' }}
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
                        <Select placeholder="Select project" options={projectOptions} showSearch optionFilterProp="label" allowClear disabled={task?.status === 'Completed'} />
                      </Form.Item>
                      <Form.Item name="taskName" label="Task Name" rules={[{ required: true, message: 'Enter task name' }]}>
                        <Input placeholder="e.g. Setup API" disabled={task?.status === 'Completed'} />
                      </Form.Item>
                      <Form.Item name="status" label="Task Status">
                        <Select options={taskStatusOptionsForForm} disabled={task?.status === 'Completed'} />
                      </Form.Item>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="startDate"
                            label="Start Date"
                            help={projectDetail && !projectAllowsTaskDates(projectDetail) ? 'Parent project has no start/end date; task dates are not allowed.' : undefined}
                          >
                            <DatePicker
                              style={{ width: '100%' }}
                              disabled={task?.status === 'Completed' || !projectAllowsTaskDates(projectDetail)}
                              disabledDate={(d) => {
                                if (!d || !projectDetail) return false
                                const projectStart = projectDetail.startDate?.trim() ? dayjs(projectDetail.startDate) : null
                                const projectEnd = projectDetail.endDate?.trim() ? dayjs(projectDetail.endDate) : null
                                if (projectStart && d.isBefore(projectStart, 'day')) return true
                                if (projectEnd && d.isAfter(projectEnd, 'day')) return true
                                return false
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="endDate" label="End Date">
                            <DatePicker
                              style={{ width: '100%' }}
                              disabled={task?.status === 'Completed' || !projectAllowsTaskDates(projectDetail)}
                              disabledDate={(d) => {
                                if (!d || !projectDetail) return false
                                const projectStart = projectDetail.startDate?.trim() ? dayjs(projectDetail.startDate) : null
                                const projectEnd = projectDetail.endDate?.trim() ? dayjs(projectDetail.endDate) : null
                                if (projectStart && d.isBefore(projectStart, 'day')) return true
                                if (projectEnd && d.isAfter(projectEnd, 'day')) return true
                                return false
                              }}
                            />
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
                          disabled={!projectDetail || task?.status === 'Completed'}
                        />
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" disabled={task?.status === 'Completed'}>
                            Save changes
                          </Button>
                          <Button
                            type="default"
                            icon={<CheckCircleOutlined />}
                            style={
                              task?.status === 'Completed'
                                ? { borderColor: '#d9d9d9', color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' }
                                : { borderColor: '#52c41a', color: '#52c41a' }
                            }
                            disabled={task?.status === 'Completed'}
                            onClick={() => {
                              if (!task || !canEditTask(task)) {
                                message.error('Only the project lead for this project can mark tasks as completed.')
                                return
                              }
                              editForm.setFieldsValue({ status: 'Completed' })
                              onFinishEdit({ ...editForm.getFieldsValue(), status: 'Completed' })
                              message.success('Task marked as completed.')
                            }}
                          >
                            {task?.status === 'Completed' ? 'Completed' : 'Mark as completed'}
                          </Button>
                          <Button
                            type="default"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => task && handleRemoveTask(task)}
                          >
                            Remove task
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
                          <Button type="primary" onClick={onAddNote} loading={noteSubmitting} disabled={noteSubmitting}>Add note</Button>
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
