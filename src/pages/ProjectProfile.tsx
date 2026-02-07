import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
import { ArrowLeftOutlined, EditOutlined, TeamOutlined, CommentOutlined, FileOutlined, CalendarOutlined, UserOutlined, CheckSquareOutlined, PlusOutlined, UserAddOutlined, DeleteOutlined, UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, AppstoreOutlined, InboxOutlined, CrownOutlined, AuditOutlined, HistoryOutlined, RollbackOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import { getProjectById, updateProjectById, deleteProject, isProjectOverdue, type ProjectDetail } from '../data/projects'
import { createNotification, createNotificationsForMembers } from '../data/notifications'
import { appendMemberActivity, getMembersList, getAdminMemberIds } from '../data/members'
import { getTaskAssignees } from '../data/tasks'
import { useCurrentUser } from '../context/CurrentUserContext'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import type { ProjectFile, ProjectMember, ProjectNote, ProjectTask, ProjectActivity } from '../types/project'

const MAX_PROJECT_NOTES = 20
import ActivityLogTimeline from '../components/ActivityLogTimeline'
import { useTasks } from '../context/TasksContext'

const priorityColors: Record<string, string> = {
  Low: 'default',
  Medium: 'blue',
  High: 'orange',
  Urgent: 'red',
}
const statusTagColor = (status: string) =>
  status === 'Completed' ? 'green' : status === 'Pending completion' ? 'orange' : 'default'

function taskStatusTagColor(s: string): string {
  if (s === 'Completed') return 'green'
  if (s === 'In progress') return 'blue'
  return 'default'
}

function excerpt(text: string, max = 60): string {
  const t = String(text || '').trim()
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

/** Count tasks that are not completed and have end date in the past. */
function countOverdueTasks(tasks: { status?: string; endDate?: string }[] | undefined): number {
  if (!Array.isArray(tasks)) return 0
  const today = dayjs().startOf('day')
  return tasks.filter((t) => {
    if (t.status === 'Completed') return false
    if (!t.endDate?.trim()) return false
    return dayjs(t.endDate).startOf('day').isBefore(today)
  }).length
}

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
]

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
  const { currentAdminId, currentMember, isSuperAdmin, isAdmin, currentUserMemberId, displayName } = useCurrentUser()
  const canConfirmRejectPending = isSuperAdmin || isAdmin
  const { categories, tags } = useProjectMeta()
  const { tasks: globalTasks, updateTask, addTask, removeTask } = useTasks()
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
    if (isSuperAdmin || isAdmin) return true
    if (!currentUserMemberId) return false
    const members = Array.isArray(project.members) ? project.members : []
    const leadMember = members.find((m) => m && m.role === 'Lead')
    return leadMember?.memberId === currentUserMemberId
  }, [project, isSuperAdmin, isAdmin, currentUserMemberId])
  const canManageProjectFiles = canConfirmRejectPending || isLeadOfThisProject
  const canRemove = isSuperAdmin

  /** Member (no manage rights) can mark complete only when the task is assigned solely to them. */
  const canMarkCompleteAsMember = useCallback(
    (record: ProjectTask) => {
      if (canManageProjectFiles) return false
      if (!currentUserMemberId) return false
      const assignees = getTaskAssignees(record)
      const soleAssignee = assignees.length === 1 ? assignees[0] : null
      return Boolean(soleAssignee && soleAssignee.memberId?.toUpperCase() === currentUserMemberId.toUpperCase())
    },
    [canManageProjectFiles, currentUserMemberId]
  )

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
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')
  /** When a new Lead is added, previous Lead is demoted to Contributor (each project has only one Lead) */
  const [leadRoleOverrides, setLeadRoleOverrides] = useState<Record<string, string>>({})
  const [editForm] = Form.useForm()
  const [addMemberForm] = Form.useForm()
  const [addTaskForm] = Form.useForm()
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const activityBackfilledRef = useRef<string | null>(null)
  const [allMembers, setAllMembers] = useState<{ memberId: string; name: string }[]>([])
  useEffect(() => {
    getMembersList().then(setAllMembers).catch(() => setAllMembers([]))
  }, [])

  useEffect(() => {
    if (!id || !project || (Array.isArray(project.activityLog) && project.activityLog.length > 0) || activityBackfilledRef.current === id) return
    activityBackfilledRef.current = id
    const initial: ProjectActivity = {
      key: `activity-${Date.now()}`,
      type: 'project_created',
      description: 'Project created',
      author: project.createdBy || 'Unknown',
      createdAt: project.createdAt || new Date().toISOString(),
    }
    let cancelled = false
    updateProjectById(id, { activityLog: [initial] })
      .then(() => { if (!cancelled) setProjectVersion((v) => v + 1) })
      .catch(() => { activityBackfilledRef.current = null })
    return () => { cancelled = true }
  }, [id, project])

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

  const pushActivity = (type: string, description: string): ProjectActivity => ({
    key: `activity-${Date.now()}`,
    type,
    description,
    author: displayName || 'Current user',
    createdAt: new Date().toISOString(),
  })

  const logToProfileActivity = (activity: ProjectActivity) => {
    const memberId = currentUserMemberId
    if (!memberId) return
    const projectName = project?.projectName?.trim()
    const description = projectName ? `Project "${projectName}": ${activity.description}` : activity.description
    appendMemberActivity(memberId, { ...activity, key: `profile-${activity.key}`, description }).catch(() => {})
  }

  const canEditDeleteNote = (note: ProjectNote) => {
    const isAdminOrLead = isLeadOfThisProject || isSuperAdmin || isAdmin || (currentAdminId && !currentMember)
    const isOwner = note.author === (displayName || 'Current user')
    return Boolean(isAdminOrLead || isOwner)
  }

  const onAddComment = async (content: string) => {
    if (!content.trim() || !id) return
    const currentNotes = Array.isArray(project.notes) ? project.notes : []
    if (currentNotes.length >= MAX_PROJECT_NOTES) {
      message.error(`Maximum ${MAX_PROJECT_NOTES} comments allowed.`)
      return
    }
    const author = displayName || 'Current user'
    const newNote: ProjectNote = {
      key: `note-${Date.now()}`,
      author,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }
    const notes = [...currentNotes, newNote]
    const activity = pushActivity('comment_added', 'Added a comment')
    const activityLog = [...(Array.isArray(project.activityLog) ? project.activityLog : []), activity]
    try {
      await updateProjectById(id, { notes, activityLog })
      logToProfileActivity(activity)
      const updated = await getProjectById(id)
      if (updated) setProject(updated)
      message.success('Comment added.')
      setNewComment('')
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save comment.')
    }
  }

  const onEditNote = (note: ProjectNote) => {
    setEditingNote(note)
    setEditCommentContent(note.content)
  }

  const onSaveEditNote = async () => {
    if (!editingNote || !id || !editCommentContent.trim()) return
    const currentNotes = Array.isArray(project.notes) ? project.notes : []
    const notes = currentNotes.map((n) =>
      n.key === editingNote.key ? { ...n, content: editCommentContent.trim() } : n
    )
    const activity = pushActivity('comment_edited', 'Edited a comment')
    const activityLog = [...(project.activityLog || []), activity]
    try {
      await updateProjectById(id, { notes, activityLog })
      logToProfileActivity(activity)
      const updated = await getProjectById(id)
      if (updated) setProject(updated)
      message.success('Comment updated.')
      setEditingNote(null)
      setEditCommentContent('')
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update comment.')
    }
  }

  const onDeleteNote = (note: ProjectNote) => {
    if (!id) return
    Modal.confirm({
      title: 'Delete comment?',
      content: 'This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        const currentNotes = Array.isArray(project.notes) ? project.notes : []
        const notes = currentNotes.filter((n) => n.key !== note.key)
        const activity = pushActivity('comment_deleted', 'Deleted a comment')
        const activityLog = [...(Array.isArray(project.activityLog) ? project.activityLog : []), activity]
        try {
          await updateProjectById(id, { notes, activityLog })
          logToProfileActivity(activity)
          const updated = await getProjectById(id)
          if (updated) setProject(updated)
          message.success('Comment deleted.')
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to delete comment.')
        }
      },
    })
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
            const baseTasks = Array.isArray(project.tasks) ? project.tasks : []
            const completedBaseTasks = baseTasks.map((t) => ({
              ...t,
              status: 'Completed',
              completedAt: new Date().toISOString(),
            }))
            const activity = pushActivity('project_completed', 'Project marked as Completed')
            const activityLog = [...(project.activityLog || []), activity]
            await updateProjectById(id, { ...updates, tasks: completedBaseTasks, activityLog })
            logToProfileActivity(activity)

            // Update any local (session-only) tasks in this profile view
            const completedAt = new Date().toISOString()
            setLocalTasks((prev) => prev.map((t) => ({ ...t, status: 'Completed', completedAt })))

            // Also update global Tasks list for tasks belonging to this project
            globalTasks
              .filter((t) => t.projectId === project.projectId)
              .forEach((t) => updateTask(t.id, { status: 'Completed', completedAt: new Date().toISOString() }))
          } else {
            const activity = pushActivity('project_updated', 'Updated project details')
            const activityLog = [...(project.activityLog || []), activity]
            await updateProjectById(id, { ...updates, activityLog })
            logToProfileActivity(activity)
          }
          if (updates.status === 'Pending completion') {
            const adminIds = await getAdminMemberIds()
            createNotificationsForMembers(adminIds, {
              type: 'project_pending_approval',
              title: `Project "${project?.projectName ?? 'Unknown'}" is pending approval.`,
              link: `/projects/${id}`,
            }).catch(() => {})
          }
        } else if (id) {
          const activity = pushActivity('project_updated', 'Updated project details')
          const activityLog = [...(project.activityLog || []), activity]
          await updateProjectById(id, { ...updates, activityLog })
          logToProfileActivity(activity)
        }
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
    if (!isSuperAdmin && !isAdmin && !isLeadOfThisProject) {
      message.error('Only the project lead or an admin can mark this project as completed.')
      return
    }
    // Project Lead can only request completion (Pending completion); only Super Admin can set Completed
    const targetStatus = (isSuperAdmin || isAdmin) ? 'Completed' : 'Pending completion'
    editForm.setFieldsValue({ status: targetStatus })
    const values = { ...editForm.getFieldsValue(), status: targetStatus }
    onEditFinish(values)
  }

  const confirmPendingProject = async () => {
    if (!id || !project) return
    const baseTasks = Array.isArray(project.tasks) ? project.tasks : []
    const completedAt = new Date().toISOString()
    const completedBaseTasks = baseTasks.map((t) => ({ ...t, status: 'Completed', completedAt }))
    const activity = pushActivity('project_completed', 'Project confirmed and marked as Completed')
    const activityLog = [...(project.activityLog || []), activity]
    await updateProjectById(id, { status: 'Completed', tasks: completedBaseTasks, activityLog })
    logToProfileActivity(activity)
    setLocalTasks((prev) => prev.map((t) => ({ ...t, status: 'Completed', completedAt })))
    globalTasks.filter((t) => t.projectId === project.projectId).forEach((t) => updateTask(t.id, { status: 'Completed', completedAt }))
    const leadMember = Array.isArray(project.members) ? project.members.find((m) => m?.role === 'Lead') : undefined
    if (leadMember?.memberId) {
      createNotification(leadMember.memberId, {
        type: 'project_completed',
        title: `Project "${project.projectName}" has been confirmed and marked as Completed.`,
        link: `/projects/${id}`,
      }).catch(() => {})
    }
    message.success('Project confirmed and marked as Completed.')
    setProjectVersion((v) => v + 1)
  }

  const rejectPendingProject = async () => {
    if (!id || !project) return
    const activity = pushActivity('status_changed', 'Project status set back to In Progress')
    const activityLog = [...(project.activityLog || []), activity]
    await updateProjectById(id, { status: 'In Progress', activityLog })
    logToProfileActivity(activity)
    const leadMember = Array.isArray(project.members) ? project.members.find((m) => m?.role === 'Lead') : undefined
    if (leadMember?.memberId) {
      createNotification(leadMember.memberId, {
        type: 'project_rejected',
        title: `Project "${project.projectName}" completion was rejected. Status set back to In Progress.`,
        link: `/projects/${id}`,
      }).catch(() => {})
    }
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

  const activityLogSorted = useMemo(() => {
    const log = Array.isArray(project?.activityLog) ? project?.activityLog : []
    return [...log]
      .filter((a) => a && (a.createdAt || a.key))
      .sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()))
  }, [project?.activityLog])

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

  const projectMembers = Array.isArray(project.members) ? project.members : []
  const projectTasks = Array.isArray(project.tasks) ? project.tasks : []
  const projectFiles = Array.isArray(project.files) ? project.files : []
  const projectNotes = Array.isArray(project.notes) ? project.notes : []

  const effectiveMembers: ProjectMember[] = [
    ...projectMembers.filter((m) => m && !removedMemberIds.includes(m.memberId)),
    ...localMembers,
  ].map((m) => ({ ...m, role: leadRoleOverrides[m.memberId] ?? m.role }))
  const effectiveTasks: ProjectTask[] = [...projectTasks, ...localTasks]
  const doneStatuses = ['Completed']
  const effectiveProgress = effectiveTasks.length
    ? Math.round((effectiveTasks.filter((t) => t && doneStatuses.includes(t.status)).length / effectiveTasks.length) * 100)
    : (typeof project.progress === 'number' ? project.progress : 0)
  const effectiveFiles: ProjectFile[] = [
    ...projectFiles.filter((f) => f && !removedFileKeys.includes(f.key)),
    ...localFiles,
  ]

  const onAddMember = async (values: { memberId: string; role: string }) => {
    const chosen = allMembers.find((m) => m.memberId === values.memberId)
    if (!chosen || !id) return
    const newRole = values.role || 'Contributor'
    let list: ProjectMember[] = [
      ...projectMembers.filter((m) => !removedMemberIds.includes(m.memberId)),
      ...localMembers,
    ]
    const currentLead = list.find((m) => (leadRoleOverrides[m.memberId] ?? m.role) === 'Lead')
    if (newRole === 'Lead' && currentLead && currentLead.memberId !== chosen.memberId) {
      list = list.map((m) => (m.memberId === currentLead.memberId ? { ...m, role: 'Contributor' } : m))
      setLeadRoleOverrides((prev) => ({ ...prev, [currentLead.memberId]: 'Contributor' }))
    }
    list = list.map((m) => ({ ...m, role: leadRoleOverrides[m.memberId] ?? m.role }))
    list.push({ key: `mem-${Date.now()}`, memberId: chosen.memberId, name: chosen.name, role: newRole })
    const activity = pushActivity('member_added', `Added ${chosen.name} as ${newRole}`)
    const activityLog = [...(project.activityLog || []), activity]
    try {
      await updateProjectById(id, { members: list, activityLog })
      logToProfileActivity(activity)
      const updated = await getProjectById(id)
      if (updated) setProject(updated)
      createNotification(chosen.memberId, {
        type: 'project_added',
        title: `You were added to project: ${project.projectName}`,
        link: `/projects/${id}`,
      }).catch(() => {})
      setLocalMembers((prev) => prev.filter((m) => m.memberId !== chosen.memberId))
      message.success('Member added to project.')
      addMemberForm.resetFields()
      setAddMemberModalOpen(false)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save member to project.')
    }
  }

  const onSetProjectRole = async (record: ProjectMember, newRole: 'Lead' | 'Contributor' | 'Moderator') => {
    if (!id) return
    const updates: Record<string, string> = { [record.memberId]: newRole }
    if (newRole === 'Lead') {
      const currentLead = effectiveMembers.find((m) => m.role === 'Lead')
      if (currentLead && currentLead.memberId !== record.memberId) {
        updates[currentLead.memberId] = 'Contributor'
      }
    }
    const list: ProjectMember[] = [
      ...projectMembers.filter((m) => !removedMemberIds.includes(m.memberId)),
      ...localMembers,
    ].map((m) => ({ ...m, role: updates[m.memberId] ?? leadRoleOverrides[m.memberId] ?? m.role }))
    const activity = pushActivity('member_role_changed', `${record.name} set to ${newRole}`)
    const activityLog = [...(project.activityLog || []), activity]
    try {
      await updateProjectById(id, { members: list, activityLog })
      logToProfileActivity(activity)
      const updated = await getProjectById(id)
      if (updated) setProject(updated)
      setLeadRoleOverrides((prev) => {
        const next = { ...prev }
        Object.keys(updates).forEach((mid) => delete next[mid])
        return next
      })
      const currentLead = effectiveMembers.find((m) => m.role === 'Lead')
      message.success(
        newRole === 'Lead'
          ? `${record.name} is now Project Lead.${currentLead && currentLead.memberId !== record.memberId ? ` ${currentLead.name} is now Contributor.` : ''}`
          : `${record.name} is now ${newRole}.`
      )
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update member role.')
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
      onOk: async () => {
        if (!id) return
        const list: ProjectMember[] = [
          ...projectMembers.filter((m) => !removedMemberIds.includes(m.memberId) && m.memberId !== record.memberId),
          ...localMembers.filter((m) => m.memberId !== record.memberId),
        ].map((m) => ({ ...m, role: leadRoleOverrides[m.memberId] ?? m.role }))
        const activity = pushActivity('member_removed', `Removed ${record.name} from project`)
        const activityLog = [...(project.activityLog || []), activity]
        try {
          await updateProjectById(id, { members: list, activityLog })
          logToProfileActivity(activity)
          const updated = await getProjectById(id)
          if (updated) setProject(updated)
          setLocalMembers((prev) => prev.filter((m) => m.memberId !== record.memberId))
          setRemovedMemberIds((prev) => prev.filter((mid) => mid !== record.memberId))
          setLeadRoleOverrides((prev) => {
            const next = { ...prev }
            delete next[record.memberId]
            return next
          })
          message.success('Member removed from project.')
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to remove member from project.')
        }
      },
    })
  }

  const onAddTask = async (values: { title: string; status: string; assigneeMemberIds?: string[] }) => {
    if (!canManageProjectFiles || !id) {
      message.error('Only the project lead or an admin can add tasks to this project.')
      return
    }
    const memberIds = Array.isArray(values.assigneeMemberIds) ? values.assigneeMemberIds : []
    const assignees = memberIds
      .map((mid) => effectiveMembers.find((m) => m.memberId === mid))
      .filter(Boolean)
      .map((m) => ({ memberId: m!.memberId, name: m!.name }))
    try {
      await addTask(id, {
        taskName: values.title.trim(),
        status: values.status || 'To do',
        assignees: assignees.length ? assignees : undefined,
        projectId: project.projectId,
        projectName: project.projectName,
      })
      const updated = await getProjectById(id)
      if (updated) setProject(updated)
      const activity = pushActivity('task_added', `Added task "${values.title.trim()}"`)
      const activityLog = [...(updated?.activityLog ?? []), activity]
      await updateProjectById(id, { activityLog })
      logToProfileActivity(activity)
      const refreshed = await getProjectById(id)
      if (refreshed) setProject(refreshed)
      message.success('Task saved.')
      addTaskForm.resetFields()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save task.')
    }
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

  const getTaskId = (record: ProjectTask) => (id ? `${id}-${record.key}` : '')

  const handleMarkCompleteTask = (record: ProjectTask) => {
    if (record.status === 'Completed') return
    const canComplete = canManageProjectFiles || canMarkCompleteAsMember(record)
    if (!canComplete) {
      message.error('You cannot mark this task as completed. Only the project lead, admin, or the sole assignee can.')
      return
    }
    const taskId = getTaskId(record)
    if (!taskId) return
    Modal.confirm({
      title: 'Mark task as completed?',
      content: 'This will set the task status to Completed.',
      okText: 'Mark as completed',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await updateTask(taskId, { status: 'Completed' })
          const activity = pushActivity('task_completed', `Task "${record.title}" marked as completed`)
          const activityLog = [...(Array.isArray(project.activityLog) ? project.activityLog : []), activity]
          await updateProjectById(id!, { activityLog })
          logToProfileActivity(activity)
          const updated = await getProjectById(id!)
          if (updated) setProject(updated)
          message.success('Task marked as completed.')
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to update task.')
        }
      },
    })
  }

  const handleRedoTask = (record: ProjectTask) => {
    if (record.status !== 'Completed') return
    if (!canManageProjectFiles) return
    const taskId = getTaskId(record)
    if (!taskId) return
    Modal.confirm({
      title: 'Reopen task?',
      content: 'This will set the task status back to In progress.',
      okText: 'Reopen',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await updateTask(taskId, { status: 'In progress' })
          const activity = pushActivity('task_reopened', `Task "${record.title}" reopened`)
          const activityLog = [...(Array.isArray(project.activityLog) ? project.activityLog : []), activity]
          await updateProjectById(id!, { activityLog })
          logToProfileActivity(activity)
          const updated = await getProjectById(id!)
          if (updated) setProject(updated)
          message.success('Task reopened.')
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to update task.')
        }
      },
    })
  }

  const handleRemoveTaskFromProject = (record: ProjectTask) => {
    if (!canManageProjectFiles) return
    const taskId = getTaskId(record)
    if (!taskId) return
    Modal.confirm({
      title: 'Remove task?',
      content: `This will permanently remove "${record.title}" from the project. This cannot be undone.`,
      okText: 'Remove',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await removeTask(taskId)
          const activity = pushActivity('task_removed', `Task "${record.title}" removed from project`)
          const activityLog = [...(Array.isArray(project.activityLog) ? project.activityLog : []), activity]
          await updateProjectById(id!, { activityLog })
          logToProfileActivity(activity)
          const updated = await getProjectById(id!)
          if (updated) setProject(updated)
          message.success('Task removed.')
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to remove task.')
        }
      },
    })
  }

  const openTaskOnTasksPage = (record: ProjectTask) => {
    const taskId = getTaskId(record)
    if (taskId) navigate('/tasks', { state: { openTaskId: taskId } })
  }

  const memberColumns = [
    { title: 'Member', dataIndex: 'name', key: 'name' },
    { title: 'Member ID', dataIndex: 'memberId', key: 'memberId' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    ...((isSuperAdmin || isAdmin)
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
                    {canRemove && (
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
                    )}
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
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ProjectNote) =>
        canEditDeleteNote(record) ? (
          <Space size="small">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEditNote(record)}>
              Edit
            </Button>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onDeleteNote(record)}>
              Delete
            </Button>
          </Space>
        ) : null,
    },
  ]
  const fileColumns = [
    { title: 'File', dataIndex: 'name', key: 'name' },
    { title: 'Size', dataIndex: 'size', key: 'size' },
    { title: 'Uploaded', dataIndex: 'uploadedAt', key: 'uploadedAt' },
    ...(canManageProjectFiles && canRemove
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
    {
      title: '',
      key: 'complete',
      width: 48,
      align: 'center' as const,
      render: (_: unknown, record: ProjectTask) => {
        if (record.status === 'Completed') {
          return canManageProjectFiles ? (
            <Tooltip title="Reopen task">
              <RollbackOutlined
                style={{ color: '#1890ff', fontSize: 20, cursor: 'pointer' }}
                onClick={() => handleRedoTask(record)}
              />
            </Tooltip>
          ) : (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} title="Completed" />
          )
        }
        const canComplete = canManageProjectFiles || canMarkCompleteAsMember(record)
        if (canComplete) {
          return (
            <Tooltip title="Mark as completed">
              <CheckCircleOutlined
                style={{ color: 'rgba(0,0,0,0.25)', fontSize: 20, cursor: 'pointer' }}
                onClick={() => handleMarkCompleteTask(record)}
              />
            </Tooltip>
          )
        }
        return null
      },
    },
    { title: 'Task Name', dataIndex: 'title', key: 'title', width: 200 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        const displayStatus = status === 'Pending completion' ? 'In progress' : status
        return <Tag color={taskStatusTagColor(displayStatus)}>{displayStatus}</Tag>
      },
    },
    {
      title: 'Assignees',
      key: 'assignees',
      width: 200,
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
    { title: 'Started Date', dataIndex: 'startDate', key: 'startDate', width: 110, render: (d: string) => d || '—' },
    {
      title: 'Timeline',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 150,
      render: (_: string, record: ProjectTask) => {
        if (!record.endDate?.trim()) return 'No end date'
        const end = dayjs(record.endDate).startOf('day')
        if (record.status === 'Completed') {
          const completed = dayjs(record.completedAt || new Date().toISOString()).startOf('day')
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
        const daysToStart = daysUntilStart(record.startDate)
        if (daysToStart !== null && daysToStart > 0) {
          const label = daysToStart === 1 ? 'Starts tomorrow' : `Starts in ${daysToStart} days`
          return <span style={{ color: '#1890ff', fontWeight: 500 }}>{label}</span>
        }
        const days = daysUntilEnd(record.endDate)
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
      render: (_: unknown, record: ProjectTask) => {
        const notes = record.notes ?? []
        if (!notes.length) return '—'
        const last = notes[notes.length - 1]
        const preview = excerpt(last.content || '', 60)
        return (
          <Space size={6} wrap={false}>
            <Tag>{notes.length}</Tag>
            <Tooltip title={last.content || ''}>
              <Typography.Text type="secondary">{preview}</Typography.Text>
            </Tooltip>
          </Space>
        )
      },
    },
    ...(canManageProjectFiles
      ? [
          {
            title: 'Action',
            key: 'action',
            width: 140,
            render: (_: unknown, record: ProjectTask) => {
              const assignees = getTaskAssignees(record)
              const soleAssigneeToMe = currentUserMemberId && assignees.length === 1 && assignees[0].memberId?.toUpperCase() === currentUserMemberId.toUpperCase()
              if (soleAssigneeToMe) return null
              return (
                <Space size="small">
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openTaskOnTasksPage(record)}>
                    Edit
                  </Button>
                  {canRemove && (
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveTaskFromProject(record)}>
                      Remove
                    </Button>
                  )}
                </Space>
              )
            },
          },
        ]
      : []),
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
          {project.status === 'Completed' && (isSuperAdmin || isAdmin) && !project.isArchived && (
            <Col span={24}>
              <Card size="small" title="Archive project">
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  Super Admin or Admin can archive. Archived projects are hidden from the main Projects list.
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
                {countOverdueTasks(project.tasks) > 0 && (
                  <Col xs={24} md={12}>
                    <Typography.Text type="secondary">Overdue tasks</Typography.Text>
                    <div>
                      <Tooltip title={`${countOverdueTasks(project.tasks)} overdue task${countOverdueTasks(project.tasks) !== 1 ? 's' : ''}`}>
                        <Tag color="red" style={{ margin: 0 }}>{countOverdueTasks(project.tasks)}</Tag>
                      </Tooltip>
                    </div>
                  </Col>
                )}
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
          {(isSuperAdmin || isAdmin || isLeadOfThisProject) && (
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
          <TeamOutlined /> Project Members ({effectiveMembers.length})
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
          <CommentOutlined /> Notes / Comments ({projectNotes.length})
        </span>
      ),
      children: (
        <>
          <Card size="small" title={`Add comment (${projectNotes.length} / ${MAX_PROJECT_NOTES} comments)`} style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%' }} direction="vertical">
              <Input.TextArea
                ref={commentTextareaRef}
                rows={3}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={projectNotes.length >= MAX_PROJECT_NOTES}
              />
              <Button
                type="primary"
                onClick={() => onAddComment(newComment)}
                disabled={!newComment.trim() || projectNotes.length >= MAX_PROJECT_NOTES}
              >
                Add comment
              </Button>
            </Space.Compact>
          </Card>
          <Table
            dataSource={[...projectNotes, ...localNotes]}
            columns={noteColumns}
            pagination={false}
            size="small"
            rowKey="key"
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
    {
      key: 'activity',
      label: (
        <span>
          <HistoryOutlined /> Activity log ({activityLogSorted.length})
        </span>
      ),
      children: (
        <Card size="small" title="Recent activity">
          <ActivityLogTimeline
            items={activityLogSorted.map((a) => ({
              key: a.key,
              label: a.description || a.type,
              sublabel: `${a.author ? `${a.author} · ` : ''}${formatDate(a.createdAt || '')}`,
            }))}
            description="Recent actions and events for this project."
            emptyMessage="No activity yet."
          />
        </Card>
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
          {(isSuperAdmin || isAdmin || isLeadOfThisProject) && (
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

      <Modal
        title="Edit comment"
        open={editingNote !== null}
        onCancel={() => { setEditingNote(null); setEditCommentContent('') }}
        onOk={onSaveEditNote}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        {editingNote && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <Typography.Text type="secondary">{editingNote.author} · {formatDate(editingNote.createdAt)}</Typography.Text>
            </div>
            <Input.TextArea
              rows={4}
              value={editCommentContent}
              onChange={(e) => setEditCommentContent(e.target.value)}
              placeholder="Comment content..."
            />
          </div>
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
        {((project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin) && (
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
            <Input placeholder="Project Alpha" disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin} />
          </Form.Item>
          <Form.Item name="projectCategory" label="Project Category" rules={[{ required: true }]}>
            <Select placeholder="Select category" options={categoryOptions} showSearch allowClear disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin} />
          </Form.Item>
          <Form.Item name="projectTag" label="Project Tags">
            <Select mode="multiple" placeholder="Select tags" options={tagOptions} showSearch allowClear disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin} />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <Select options={priorityOptions} disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date">
                <DatePicker style={{ width: '100%' }} disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End Date">
                <DatePicker style={{ width: '100%' }} disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Project Status">
            <Select options={statusOptionsBase} disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin} />
          </Form.Item>
          <Form.Item label="Actions">
            <Space wrap size="middle">
              <Button type="primary" htmlType="submit" disabled={(project.status === 'Pending completion' || project.status === 'Completed') && !isSuperAdmin && !isAdmin}>
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
