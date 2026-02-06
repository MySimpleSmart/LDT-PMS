import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Table,
  Tabs,
  Progress,
  Space,
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Modal,
  Upload,
  Tooltip,
  Divider,
} from 'antd'
import type { TabsProps } from 'antd'
import { ArrowLeftOutlined, EditOutlined, TeamOutlined, CommentOutlined, FileOutlined, CalendarOutlined, UserOutlined, CheckSquareOutlined, PlusOutlined, UserAddOutlined, DeleteOutlined, UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, AppstoreOutlined, InboxOutlined, CrownOutlined, AuditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import { getProjectById, updateProjectById, deleteProject, isProjectOverdue, type ProjectDetail } from '../data/projects'
import { getMembersList } from '../data/members'
import { getTaskAssignees } from '../data/tasks'
import { useCurrentUser } from '../context/CurrentUserContext'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import type { ProjectFile, ProjectMember, ProjectTask } from '../types/project'
import { useTasks } from '../context/TasksContext'

const priorityColors: Record<string, string> = {
  Low: 'default',
  Medium: 'blue',
  High: 'orange',
  Urgent: 'red',
}
const statusTagColor = (status: string) =>
  status === 'Completed' ? 'green' : status === 'Pending completion' ? 'orange' : 'default'

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString()
  } catch {
    return d
  }
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return undefined
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

const priorityOptions = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
]
const statusOptionsBase = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Pending completion', label: 'Pending completion' },
]
const statusOptionsWithCompleted = [...statusOptionsBase, { value: 'Completed', label: 'Completed' }]

const projectRoleOptions = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Contributor', label: 'Contributor' },
  { value: 'Moderator', label: 'Moderator' },
]
/** When adding a new member, only Contributor or Moderator (project has one lead; set lead from Members table). */
const addMemberRoleOptions = [
  { value: 'Contributor', label: 'Contributor' },
  { value: 'Moderator', label: 'Moderator' },
]

export default function ProjectProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentAdminId, currentMember, isSuperAdmin, currentUserMemberId, displayName } = useCurrentUser()
  const canConfirmRejectPending = (isSuperAdmin || currentAdminId) && !currentMember
  const { categories, tags } = useProjectMeta()
  const { tasks: globalTasks, updateTask } = useTasks()
  const { setDirty: setGlobalDirty, confirmNavigation } = useUnsavedChanges()

  // IMPORTANT: keep project reference stable while editing
  const [projectVersion, setProjectVersion] = useState(0)
  const [project, setProject] = useState<ProjectDetail | null>(null)

  useEffect(() => {
    let active = true
    if (!id) {
      setProject(null)
      return
    }
    ;(async () => {
      try {
        const detail = await getProjectById(id)
        if (active) setProject(detail)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load project for ProjectProfile', err)
        if (active) setProject(null)
      }
    })()
    return () => {
      active = false
    }
  }, [id, projectVersion])

  // Project Lead may only edit/complete/upload projects they lead; Super Admin/Admin may do any project
  const isLeadOfThisProject = useMemo(() => {
    if (!project) return false
    if (isSuperAdmin) return true
    if (!currentUserMemberId) return false
    const leadMember = project.members.find((m) => m.role === 'Lead')
    return leadMember?.memberId === currentUserMemberId
  }, [project, isSuperAdmin, currentUserMemberId])
  const canManageProjectFiles = canConfirmRejectPending || isLeadOfThisProject

  const [localNotes, setLocalNotes] = useState<{ key: string; author: string; content: string; createdAt: string }[]>([])
  const [localMembers, setLocalMembers] = useState<ProjectMember[]>([])
  const [removedMemberIds, setRemovedMemberIds] = useState<string[]>([])
  const [localTasks, setLocalTasks] = useState<ProjectTask[]>([])
  const [localFiles, setLocalFiles] = useState<ProjectFile[]>([])
  const [removedFileKeys, setRemovedFileKeys] = useState<string[]>([])
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editDrawerDirty, setEditDrawerDirty] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [newComment, setNewComment] = useState('')
  /** When a new Lead is added, previous Lead is demoted to Contributor (each project has only one Lead) */
  const [leadRoleOverrides, setLeadRoleOverrides] = useState<Record<string, string>>({})
  const [editForm] = Form.useForm()
  const [addMemberForm] = Form.useForm()
  const [addTaskForm] = Form.useForm()
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [allMembers, setAllMembers] = useState<{ memberId: string; name: string }[]>([])

  useEffect(() => {
    getMembersList().then(setAllMembers).catch(() => setAllMembers([]))
  }, [])

  const categoryOptions = categories.map((c) => ({ value: c, label: c }))
  const tagOptions = tags.map((t) => ({ value: t, label: t }))

  useEffect(() => {
    // Ensure global dirty is cleared when leaving this page
    setGlobalDirty(false)
    return () => setGlobalDirty(false)
  }, [setGlobalDirty])

  useEffect(() => {
    if (editDrawerOpen && project) {
      const tagArray = project.projectTag ? project.projectTag.split(',').map((s) => s.trim()).filter(Boolean) : []
      editForm.setFieldsValue({
        projectName: project.projectName,
        projectCategory: project.projectCategory,
        projectTag: tagArray,
        priority: project.priority,
        startDate: project.startDate ? dayjs(project.startDate) : undefined,
        endDate: project.endDate ? dayjs(project.endDate) : undefined,
        status: project.status,
      })
      // Reset dirty after loading initial values
      setEditDrawerDirty(false)
      setGlobalDirty(false)
    }
  }, [editDrawerOpen, projectVersion, id, editForm])

  useEffect(() => {
    if (activeTab === 'notes') {
      const t = setTimeout(() => commentTextareaRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [activeTab])

  const onAddComment = (content: string) => {
    if (!content.trim()) return
    const author = displayName || 'Current user'
    setLocalNotes((prev) => [
      ...prev,
      { key: `local-${Date.now()}`, author, content: content.trim(), createdAt: new Date().toISOString() },
    ])
    message.success('Comment added.')
  }

  const onEditFinish = (values: Record<string, unknown>, fromOverview = false) => {
    const start = values.startDate as { format?: (s: string) => string } | undefined
    const end = values.endDate as { format?: (s: string) => string } | undefined
    const tagStr = Array.isArray(values.projectTag) ? (values.projectTag as string[]).join(', ') : ''
    Modal.confirm({
      title: 'Save project changes?',
      content: 'This will update the project details.',
      okText: 'Save changes',
      cancelText: 'Cancel',
      onOk: async () => {
        if (!isLeadOfThisProject) {
          message.error('You can only edit and complete projects you lead.')
          return
        }
        const updates = {
          projectName: String(values.projectName ?? ''),
          projectCategory: String(values.projectCategory ?? ''),
          projectTag: tagStr,
          priority: values.priority as 'Low' | 'Medium' | 'High' | 'Urgent',
          status: values.status as 'Not Started' | 'In Progress' | 'On Hold' | 'Pending completion' | 'Completed',
          startDate: start?.format?.('YYYY-MM-DD') ?? '',
          endDate: end?.format?.('YYYY-MM-DD') ?? '',
        }
        if (id && project) {
          // Only Super Admin can set Completed; Project Lead sets Pending completion (admin reviews and completes)
          if (updates.status === 'Completed') {
            // Update base project tasks (those coming from data/projects.ts)
            const completedBaseTasks = project.tasks.map((t) => ({
              ...t,
              status: 'Completed',
            }))
            await updateProjectById(id, { ...updates, tasks: completedBaseTasks })

            // Update any local (session-only) tasks in this profile view
            setLocalTasks((prev) => prev.map((t) => ({ ...t, status: 'Completed' })))

            // Also update global Tasks list for tasks belonging to this project
            globalTasks
              .filter((t) => t.projectId === project.projectId)
              .forEach((t) => updateTask(t.id, { status: 'Completed' }))
          } else {
            await updateProjectById(id, updates)
          }
        } else if (id) {
          await updateProjectById(id, updates)
        }
        console.log('Update project:', id, updates)
        if (updates.status === 'Pending completion') {
          message.success('Project marked for completion. An admin will review and complete it.')
        } else {
          message.success('Project updated successfully.')
        }
        setEditDrawerOpen(false)
        setEditDrawerDirty(false)
        setGlobalDirty(false)
        setProjectVersion((v) => v + 1)
      },
    })
  }

  const markProjectCompleted = () => {
    // Only project lead or Super Admin can mark as completed; contributors cannot
    if (!isSuperAdmin && !isLeadOfThisProject) {
      message.error('Only the project lead can mark this project as completed.')
      return
    }
    // Project Lead can only request completion (Pending completion); only Super Admin can set Completed
    const targetStatus = isSuperAdmin ? 'Completed' : 'Pending completion'
    editForm.setFieldsValue({ status: targetStatus })
    const values = { ...editForm.getFieldsValue(), status: targetStatus }
    onEditFinish(values)
  }

  const confirmPendingProject = async () => {
    if (!id || !project) return
    const completedBaseTasks = project.tasks.map((t) => ({ ...t, status: 'Completed' }))
    await updateProjectById(id, { status: 'Completed', tasks: completedBaseTasks })
    setLocalTasks((prev) => prev.map((t) => ({ ...t, status: 'Completed' })))
    globalTasks.filter((t) => t.projectId === project.projectId).forEach((t) => updateTask(t.id, { status: 'Completed' }))
    message.success('Project confirmed and marked as Completed.')
    setProjectVersion((v) => v + 1)
  }

  const rejectPendingProject = async () => {
    if (!id) return
    await updateProjectById(id, { status: 'In Progress' })
    message.success('Project rejected. Status set back to In Progress.')
    setProjectVersion((v) => v + 1)
  }

  const archiveProject = () => {
    if (!id) return
    Modal.confirm({
      title: 'Archive project?',
      content: 'Archived projects are hidden from the main list. Only Super Admin can archive. You can still open this project from "Show archived".',
      okText: 'Archive',
      cancelText: 'Cancel',
      onOk: async () => {
        await updateProjectById(id, { isArchived: true })
        message.success('Project archived.')
        setProjectVersion((v) => v + 1)
      },
    })
  }

  const closeProjectEditDrawer = () => {
    if (!editDrawerDirty) {
      setEditDrawerOpen(false)
      setEditDrawerDirty(false)
      setGlobalDirty(false)
      return
    }
    Modal.confirm({
      title: 'Discard changes?',
      content: 'You have unsaved changes in the edit form. If you close, your changes will be lost.',
      okText: 'Close without saving',
      okButtonProps: { danger: true },
      cancelText: 'Stay',
      onOk: () => {
        setEditDrawerOpen(false)
        setEditDrawerDirty(false)
        setGlobalDirty(false)
      },
    })
  }

  const confirmLeaveProjectPage = (nextPath: string) => {
    confirmNavigation(nextPath, () => navigate(nextPath))
  }

  const openAddComment = () => {
    setActiveTab('notes')
  }

  if (!project) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => confirmLeaveProjectPage('/projects')}>
          Back to Projects
        </Button>
        <Typography.Text type="secondary">Project not found.</Typography.Text>
      </div>
    )
  }

  const effectiveMembers: ProjectMember[] = [
    ...project.members.filter((m) => !removedMemberIds.includes(m.memberId)),
    ...localMembers,
  ].map((m) => ({ ...m, role: leadRoleOverrides[m.memberId] ?? m.role }))
  const effectiveTasks: ProjectTask[] = [...project.tasks, ...localTasks]
  const doneStatuses = ['Completed']
  const effectiveProgress = effectiveTasks.length
    ? Math.round((effectiveTasks.filter((t) => doneStatuses.includes(t.status)).length / effectiveTasks.length) * 100)
    : project.progress
  const effectiveFiles: ProjectFile[] = [
    ...project.files.filter((f) => !removedFileKeys.includes(f.key)),
    ...localFiles,
  ]

  const onAddMember = (values: { memberId: string; role: string }) => {
    const chosen = allMembers.find((m) => m.memberId === values.memberId)
    if (!chosen) return
    const newRole = values.role || 'Contributor'
    // Each project has only one Lead: if adding a Lead, demote the current Lead to Contributor
    if (newRole === 'Lead') {
      const currentLead = [...project.members.filter((m) => !removedMemberIds.includes(m.memberId)), ...localMembers].find((m) => m.role === 'Lead')
      if (currentLead && currentLead.memberId !== chosen.memberId) {
        setLeadRoleOverrides((prev) => ({ ...prev, [currentLead.memberId]: 'Contributor' }))
      }
    }
    setLocalMembers((prev) => [...prev, { key: `local-m-${Date.now()}`, memberId: chosen.memberId, name: chosen.name, role: newRole }])
    message.success('Member added to project.')
    addMemberForm.resetFields()
    setAddMemberModalOpen(false)
  }

  const onSetProjectRole = (record: ProjectMember, newRole: 'Lead' | 'Contributor' | 'Moderator') => {
    if (newRole === 'Lead') {
      const currentLead = effectiveMembers.find((m) => m.role === 'Lead')
      setLeadRoleOverrides((prev) => ({
        ...prev,
        [record.memberId]: 'Lead',
        ...(currentLead && currentLead.memberId !== record.memberId ? { [currentLead.memberId]: 'Contributor' } : {}),
      }))
      message.success(`${record.name} is now Project Lead.${currentLead && currentLead.memberId !== record.memberId ? ` ${currentLead.name} is now Contributor.` : ''}`)
    } else {
      setLeadRoleOverrides((prev) => ({ ...prev, [record.memberId]: newRole }))
      message.success(`${record.name} is now ${newRole}.`)
    }
  }

  const onRemoveMember = (record: ProjectMember, isLocal: boolean) => {
    const effectiveRole = leadRoleOverrides[record.memberId] ?? record.role
    if (effectiveRole === 'Lead') {
      message.warning('Cannot remove the project lead. Set another member as project lead first.')
      return
    }
    Modal.confirm({
      title: 'Remove member from project?',
      content: `${record.name} (${record.memberId}) will be removed from this project.`,
      okText: 'Remove',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        if (isLocal) setLocalMembers((prev) => prev.filter((m) => m.memberId !== record.memberId))
        else setRemovedMemberIds((prev) => [...prev, record.memberId])
        setLeadRoleOverrides((prev) => {
          const next = { ...prev }
          delete next[record.memberId]
          return next
        })
        message.success('Member removed from project.')
      },
    })
  }

  const onAddTask = (values: { title: string; status: string; assigneeMemberIds?: string[] }) => {
    if (!canManageProjectFiles) {
      message.error('Only the project lead or an admin can add tasks to this project.')
      return
    }
    const memberIds = Array.isArray(values.assigneeMemberIds) ? values.assigneeMemberIds : []
    const assignees = memberIds
      .map((mid) => effectiveMembers.find((m) => m.memberId === mid))
      .filter(Boolean)
      .map((m) => ({ memberId: m!.memberId, name: m!.name }))
    setLocalTasks((prev) => [
      ...prev,
      {
        key: `local-t-${Date.now()}`,
        title: values.title.trim(),
        status: values.status || 'To do',
        assignees: assignees.length ? assignees : undefined,
      },
    ])
    message.success('Task added.')
    addTaskForm.resetFields()
  }

  const onAddFile = (file: { name: string; size?: number }) => {
    if (!canManageProjectFiles) {
      message.error('Only the project lead or an admin can upload files.')
      return false
    }
    setLocalFiles((prev) => [
      ...prev,
      {
        key: `local-f-${Date.now()}-${file.name}`,
        name: file.name,
        size: formatBytes(file.size),
        uploadedAt: new Date().toISOString().slice(0, 10),
      },
    ])
    message.success('File added.')
    return false
  }

  const onRemoveFile = (record: ProjectFile) => {
    if (!canManageProjectFiles) {
      message.error('Only the project lead or an admin can remove files.')
      return
    }
    const isLocal = record.key.startsWith('local-f-')
    Modal.confirm({
      title: 'Remove file?',
      content: record.name,
      okText: 'Remove',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        if (isLocal) setLocalFiles((prev) => prev.filter((f) => f.key !== record.key))
        else setRemovedFileKeys((prev) => [...prev, record.key])
        message.success('File removed.')
      },
    })
  }

  const memberColumns = [
    { title: 'Member', dataIndex: 'name', key: 'name' },
    { title: 'Member ID', dataIndex: 'memberId', key: 'memberId' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    ...(isSuperAdmin
      ? [
          {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_: unknown, record: ProjectMember) => {
              const isLead = record.role === 'Lead'
              return (
                <Space size={4} wrap>
                    {record.role !== 'Lead' && (
                      <Tooltip title="Set as Lead">
                        <Button type="link" size="small" icon={<CrownOutlined />} onClick={() => onSetProjectRole(record, 'Lead')} />
                      </Tooltip>
                    )}
                    {record.role === 'Moderator' && (
                      <Tooltip title="Set as Contributor">
                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onSetProjectRole(record, 'Contributor')} />
                      </Tooltip>
                    )}
                    {record.role === 'Contributor' && (
                      <Tooltip title="Set as Moderator">
                        <Button type="link" size="small" icon={<AuditOutlined />} onClick={() => onSetProjectRole(record, 'Moderator')} />
                      </Tooltip>
                    )}
                    <Tooltip title={isLead ? 'Set another member as project lead first.' : 'Remove from project'}>
                      <span>
                        <Button
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          disabled={isLead}
                          onClick={() => onRemoveMember(record, localMembers.some((m) => m.memberId === record.memberId))}
                        />
                      </span>
                    </Tooltip>
                  </Space>
              )
            },
          },
        ]
      : []),
  ]
  const noteColumns = [
    { title: 'Author', dataIndex: 'author', key: 'author' },
    { title: 'Content', dataIndex: 'content', key: 'content' },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => formatDate(d) },
  ]
  const fileColumns = [
    { title: 'File', dataIndex: 'name', key: 'name' },
    { title: 'Size', dataIndex: 'size', key: 'size' },
    { title: 'Uploaded', dataIndex: 'uploadedAt', key: 'uploadedAt' },
    ...(canManageProjectFiles
      ? [
          {
            title: 'Action',
            key: 'action',
            width: 100,
            render: (_: unknown, record: ProjectFile) => (
              <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => onRemoveFile(record)}>
                Remove
              </Button>
            ),
          },
        ]
      : []),
  ]
  const taskColumns = [
    { title: 'Task', dataIndex: 'title', key: 'title' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Assignees',
      key: 'assignees',
      render: (_: unknown, record: ProjectTask) => {
        const assignees = getTaskAssignees(record)
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
  ]
  const taskStatusOptions = [
    { value: 'To do', label: 'To do' },
    { value: 'In progress', label: 'In progress' },
  ]

  const tabItems: TabsProps['items'] = [
    {
      key: 'overview',
      label: (
        <span>
          <AppstoreOutlined /> Overview
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          {project.status === 'Pending completion' && canConfirmRejectPending && (
            <Col span={24}>
              <Card size="small" title="Pending completion review" style={{ borderColor: '#faad14' }}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  Project lead requested completion. Confirm to mark as Completed, or Reject to return to In Progress.
                </Typography.Text>
                <Space>
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={confirmPendingProject}>
                    Confirm
                  </Button>
                  <Button danger icon={<CloseCircleOutlined />} onClick={rejectPendingProject}>
                    Reject
                  </Button>
                </Space>
              </Card>
            </Col>
          )}
          {project.status === 'Completed' && isSuperAdmin && !project.isArchived && (
            <Col span={24}>
              <Card size="small" title="Archive project">
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  Only Super Admin can archive. Archived projects are hidden from the main Projects list.
                </Typography.Text>
                <Button icon={<InboxOutlined />} onClick={archiveProject}>
                  Archive project
                </Button>
              </Card>
            </Col>
          )}
          <Col span={24}>
            <Card size="small">
              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">Project ID</Typography.Text>
                  <div style={{ fontWeight: 600 }}>{project.projectId}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">Project Name</Typography.Text>
                  <div style={{ fontWeight: 600 }}>{project.projectName}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">Category</Typography.Text>
                  <div>{project.projectCategory}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Tags</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    {project.projectTag
                      ? (
                          <Space size={4} wrap>
                            {project.projectTag.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                              <Tag key={t}>{t}</Tag>
                            ))}
                          </Space>
                        )
                      : '—'}
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">Priority</Typography.Text>
                  <div><Tag color={priorityColors[project.priority] || 'default'}>{project.priority}</Tag></div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">Status</Typography.Text>
                  <div>
                    <Space size={4} wrap>
                      <Tag color={statusTagColor(project.status)}>{project.status}</Tag>
                      {isProjectOverdue(project) && <Tag color="red">Overdue</Tag>}
                    </Space>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary"><CalendarOutlined /> Start Date</Typography.Text>
                  <div>{formatDate(project.startDate)}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary"><CalendarOutlined /> End Date</Typography.Text>
                  <div>{formatDate(project.endDate)}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">Tasks (stored)</Typography.Text>
                  <div>{project.completedTasksCount} / {project.tasksCount} completed</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">Archived</Typography.Text>
                  <div>{project.isArchived ? <Tag>Archived</Tag> : 'No'}</div>
                </Col>
                <Col xs={24}>
                  <Typography.Text type="secondary">Progress (from tasks)</Typography.Text>
                  <Progress percent={effectiveProgress} size="small" style={{ marginTop: 4 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    {effectiveTasks.filter((t) => ['Done', 'Completed'].includes(t.status)).length} of {effectiveTasks.length} tasks done
                  </Typography.Text>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary"><UserOutlined /> Created by</Typography.Text>
                  <div>{project.createdBy}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">Created at</Typography.Text>
                  <div>{formatDate(project.createdAt)}</div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'tasks',
      label: (
        <span>
          <CheckSquareOutlined /> Tasks
        </span>
      ),
      children: (
        <>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Progress is calculated from tasks marked Done or Completed. New tasks can only be assigned to project members.
          </Typography.Text>
          {(isSuperAdmin || isLeadOfThisProject) && (
          <Card size="small" title="Add task" style={{ marginBottom: 16 }}>
            <Form form={addTaskForm} layout="vertical" onFinish={onAddTask}>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter task title' }]}>
                    <Input placeholder="Task title" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="status" label="Status" initialValue="To do">
                    <Select options={taskStatusOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="assigneeMemberIds" label="Assignees (project members)" rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one assignee' }]}>
                    <Select
                      mode="multiple"
                      placeholder="Select one or more members"
                      options={effectiveMembers.map((m) => ({ value: m.memberId, label: `${m.name} (${m.role})` }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={2}>
                  <Form.Item label=" ">
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                      Add
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
          )}
          <Table
            dataSource={effectiveTasks}
            columns={taskColumns}
            pagination={false}
            size="small"
          />
        </>
      ),
    },
    {
      key: 'members',
      label: (
        <span>
          <TeamOutlined /> Project Members
        </span>
      ),
      children: (
        <>
          {isSuperAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAddMemberModalOpen(true)}>
              Add member
            </Button>
          </div>
          )}
          <Table
            dataSource={effectiveMembers}
            columns={memberColumns}
            pagination={false}
            size="small"
            rowKey="key"
          />
        </>
      ),
    },
    {
      key: 'notes',
      label: (
        <span>
          <CommentOutlined /> Notes / Comments
        </span>
      ),
      children: (
        <>
          <Card size="small" title="Add comment" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%' }} direction="vertical">
              <Input.TextArea
                ref={commentTextareaRef}
                rows={3}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button type="primary" onClick={() => { onAddComment(newComment); setNewComment('') }}>
                Add comment
              </Button>
            </Space.Compact>
          </Card>
          <Table
            dataSource={[...project.notes, ...localNotes]}
            columns={noteColumns}
            pagination={false}
            size="small"
          />
        </>
      ),
    },
    {
      key: 'files',
      label: (
        <span>
          <FileOutlined /> Files
        </span>
      ),
      children: (
        <>
          {canManageProjectFiles && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <Upload multiple showUploadList={false} beforeUpload={onAddFile}>
                <Button icon={<UploadOutlined />}>Upload files</Button>
              </Upload>
            </div>
          )}
          <Table
            dataSource={effectiveFiles}
            columns={fileColumns}
            rowKey="key"
            pagination={false}
            size="small"
            locale={{ emptyText: 'No files yet.' }}
          />
        </>
      ),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => confirmLeaveProjectPage('/projects')}>
          Back to Projects
        </Button>
        <Space wrap>
          <Button icon={<CommentOutlined />} onClick={openAddComment}>
            Add comment
          </Button>
          {(isSuperAdmin || isLeadOfThisProject) && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setEditDrawerOpen(true)
                setEditDrawerDirty(false)
                setGlobalDirty(false)
              }}
            >
              Edit project
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <Typography.Title level={4} style={{ marginTop: 0 }}>{project.projectName}</Typography.Title>
        <Space size="small" style={{ marginTop: 8 }} wrap align="center">
          <Typography.Text type="secondary">Project ID: {project.projectId}</Typography.Text>
          <Tag color={priorityColors[project.priority] || 'default'}>{project.priority}</Tag>
          <Tag color={statusTagColor(project.status)}>{project.status}</Tag>
          {isProjectOverdue(project) && <Tag color="red">Overdue</Tag>}
          <Space size={4} align="center">
            <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>Progress</Typography.Text>
            <Progress percent={effectiveProgress} size="small" showInfo style={{ marginBottom: 0, minWidth: 80, width: 80 }} />
          </Space>
        </Space>
      </Card>

      <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k || 'overview')} items={tabItems} style={{ marginTop: 16 }} />

      <Modal
        title="Add member to project"
        open={addMemberModalOpen}
        onCancel={() => { setAddMemberModalOpen(false); addMemberForm.resetFields() }}
        footer={null}
        destroyOnClose
      >
        {allMembers.filter((m) => !effectiveMembers.some((pm) => pm.memberId === m.memberId)).length === 0 ? (
          <Typography.Text type="secondary">All members are already in this project. Add new members from the Members page first.</Typography.Text>
        ) : (
        <Form form={addMemberForm} layout="vertical" onFinish={onAddMember}>
          <Form.Item name="memberId" label="Member" rules={[{ required: true, message: 'Select a member' }]}>
            <Select
              placeholder="Select member to add"
              options={allMembers
                .filter((m) => !effectiveMembers.some((pm) => pm.memberId === m.memberId))
                .map((m) => ({ value: m.memberId, label: m.name }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="role" label="Role in project" initialValue="Contributor">
            <Select placeholder="Select role" options={addMemberRoleOptions} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Add to project</Button>
              <Button onClick={() => { setAddMemberModalOpen(false); addMemberForm.resetFields() }}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
        )}
      </Modal>

      <Drawer
        title="Edit project"
        width={560}
        open={editDrawerOpen}
        onClose={closeProjectEditDrawer}
        destroyOnClose
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Project ID: {project.projectId} (read-only). Progress is calculated from tasks.
        </Typography.Text>
        {((project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin) && (
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            This project is pending admin review or completed. Only an admin can change details or reopen it.
          </Typography.Text>
        )}
        <Form
          form={editForm}
          layout="vertical"
          onFinish={onEditFinish}
          onFieldsChange={() => {
            setEditDrawerDirty(true)
            setGlobalDirty(true)
          }}
        >
          <Form.Item name="projectName" label="Project Name" rules={[{ required: true }]}>
            <Input placeholder="Project Alpha" disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin} />
          </Form.Item>
          <Form.Item name="projectCategory" label="Project Category" rules={[{ required: true }]}>
            <Select placeholder="Select category" options={categoryOptions} showSearch allowClear disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin} />
          </Form.Item>
          <Form.Item name="projectTag" label="Project Tags">
            <Select mode="multiple" placeholder="Select tags" options={tagOptions} showSearch allowClear disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin} />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <Select options={priorityOptions} disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date">
                <DatePicker style={{ width: '100%' }} disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End Date">
                <DatePicker style={{ width: '100%' }} disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Project Status">
            <Select options={isSuperAdmin ? statusOptionsWithCompleted : statusOptionsBase} disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin} />
          </Form.Item>
          <Form.Item label="Actions">
            <Space wrap size="middle">
              <Button type="primary" htmlType="submit" disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin}>
                Save changes
              </Button>
              <Button onClick={closeProjectEditDrawer}>Cancel</Button>
              <Button
                type="default"
                icon={<CheckCircleOutlined />}
                style={
                  (project.status === 'Pending completion' || project.status === 'Completed')
                    ? { borderColor: '#d9d9d9', color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' }
                    : { borderColor: '#52c41a', color: '#52c41a' }
                }
                onClick={markProjectCompleted}
                disabled={project.status === 'Pending completion' || project.status === 'Completed'}
              >
                {(project.status === 'Pending completion' || project.status === 'Completed') ? 'Pending' : 'Mark as completed'}
              </Button>
            </Space>
          </Form.Item>
          {isSuperAdmin && project.status === 'Not Started' && id && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Form.Item label="Danger zone">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Delete this project?',
                      content: `"${project.projectName}" (${project.projectId}) will be permanently deleted. This cannot be undone.`,
                      okText: 'Delete',
                      okButtonProps: { danger: true },
                      cancelText: 'Cancel',
                      onOk: async () => {
                        await deleteProject(id)
                        message.success('Project deleted.')
                        navigate('/projects')
                      },
                    })
                  }}
                >
                  Delete project
                </Button>
              </Form.Item>
            </>
          )}
        </Form>
      </Drawer>
    </div>
  )
}
