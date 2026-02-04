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
} from 'antd'
import type { TabsProps } from 'antd'
import { ArrowLeftOutlined, EditOutlined, TeamOutlined, CommentOutlined, FileOutlined, CalendarOutlined, UserOutlined, CheckSquareOutlined, PlusOutlined, UserAddOutlined, DeleteOutlined, UploadOutlined, CheckCircleOutlined, AppstoreOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import { getProjectById, updateProjectById } from '../data/projects'
import { getMembersList } from '../data/members'
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
const statusOptions = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'On Hold', label: 'On Hold' },
]

export default function ProjectProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentAdmin } = useCurrentUser()
  const { categories, tags } = useProjectMeta()
  const { tasks: globalTasks, updateTask } = useTasks()
  const { setDirty: setGlobalDirty, confirmNavigation } = useUnsavedChanges()

  // IMPORTANT: keep project reference stable while editing
  const [projectVersion, setProjectVersion] = useState(0)
  const project = useMemo(() => (id ? getProjectById(id) : null), [id, projectVersion])

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
  const [editForm] = Form.useForm()
  const [addMemberForm] = Form.useForm()
  const [addTaskForm] = Form.useForm()
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)

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
    const author = currentAdmin ? `${currentAdmin.firstName} ${currentAdmin.lastName}` : 'Current user'
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
      onOk: () => {
        const updates = {
          projectName: String(values.projectName ?? ''),
          projectCategory: String(values.projectCategory ?? ''),
          projectTag: tagStr,
          priority: values.priority as 'Low' | 'Medium' | 'High' | 'Urgent',
          status: values.status as 'Not Started' | 'In Progress' | 'On Hold' | 'Completed',
          startDate: start?.format?.('YYYY-MM-DD') ?? '',
          endDate: end?.format?.('YYYY-MM-DD') ?? '',
        }
        if (id && project) {
          // If marking project as Completed, also mark all its tasks as Completed
          if (updates.status === 'Completed') {
            // Update base project tasks (those coming from data/projects.ts)
            const completedBaseTasks = project.tasks.map((t) => ({
              ...t,
              status: 'Completed',
            }))
            updateProjectById(id, { ...updates, tasks: completedBaseTasks })

            // Update any local (session-only) tasks in this profile view
            setLocalTasks((prev) => prev.map((t) => ({ ...t, status: 'Completed' })))

            // Also update global Tasks list for tasks belonging to this project
            globalTasks
              .filter((t) => t.projectId === project.projectId)
              .forEach((t) => updateTask(t.id, { status: 'Completed' }))
          } else {
            updateProjectById(id, updates)
          }
        } else if (id) {
          updateProjectById(id, updates)
        }
        console.log('Update project:', id, updates)
        message.success('Project updated successfully.')
        setEditDrawerOpen(false)
        setEditDrawerDirty(false)
        setGlobalDirty(false)
        setProjectVersion((v) => v + 1)
      },
    })
  }

  const markProjectCompleted = () => {
    editForm.setFieldsValue({ status: 'Completed' })
    const values = { ...editForm.getFieldsValue(), status: 'Completed' }
    onEditFinish(values)
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
  ]
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
    const allMembers = getMembersList()
    const chosen = allMembers.find((m) => m.memberId === values.memberId)
    if (!chosen) return
    setLocalMembers((prev) => [...prev, { key: `local-m-${Date.now()}`, memberId: chosen.memberId, name: chosen.name, role: values.role || 'Contributor' }])
    message.success('Member added to project.')
    addMemberForm.resetFields()
    setAddMemberModalOpen(false)
  }

  const onRemoveMember = (record: ProjectMember, isLocal: boolean) => {
    Modal.confirm({
      title: 'Remove member from project?',
      content: `${record.name} (${record.memberId}) will be removed from this project.`,
      okText: 'Remove',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        if (isLocal) setLocalMembers((prev) => prev.filter((m) => m.memberId !== record.memberId))
        else setRemovedMemberIds((prev) => [...prev, record.memberId])
        message.success('Member removed from project.')
      },
    })
  }

  const onAddTask = (values: { title: string; status: string; assigneeMemberId: string }) => {
    const member = effectiveMembers.find((m) => m.memberId === values.assigneeMemberId)
    setLocalTasks((prev) => [
      ...prev,
      {
        key: `local-t-${Date.now()}`,
        title: values.title.trim(),
        status: values.status || 'To do',
        assigneeMemberId: values.assigneeMemberId,
        assigneeName: member?.name,
      },
    ])
    message.success('Task added.')
    addTaskForm.resetFields()
  }

  const onAddFile = (file: { name: string; size?: number }) => {
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
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ProjectMember) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onRemoveMember(record, localMembers.some((m) => m.memberId === record.memberId))}
        >
          Remove
        </Button>
      ),
    },
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
  const taskColumns = [
    { title: 'Task', dataIndex: 'title', key: 'title' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Assignee', dataIndex: 'assigneeName', key: 'assignee', render: (name: string) => name || '—' },
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
                  <div>{project.status}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary"><CalendarOutlined /> Start Date</Typography.Text>
                  <div>{formatDate(project.startDate)}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary"><CalendarOutlined /> End Date</Typography.Text>
                  <div>{formatDate(project.endDate)}</div>
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
                  <Form.Item name="assigneeMemberId" label="Assignee (project members only)" rules={[{ required: true, message: 'Select assignee' }]}>
                    <Select
                      placeholder="Select member"
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAddMemberModalOpen(true)}>
              Add member
            </Button>
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Upload multiple showUploadList={false} beforeUpload={onAddFile}>
              <Button icon={<UploadOutlined />}>Upload files</Button>
            </Upload>
          </div>
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
        </Space>
      </div>

      <Card>
        <Typography.Title level={4} style={{ marginTop: 0 }}>{project.projectName}</Typography.Title>
        <Space size="small" style={{ marginTop: 8 }} wrap align="center">
          <Typography.Text type="secondary">Project ID: {project.projectId}</Typography.Text>
          <Tag color={priorityColors[project.priority] || 'default'}>{project.priority}</Tag>
          <Tag>{project.status}</Tag>
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
        {getMembersList().filter((m) => !effectiveMembers.some((pm) => pm.memberId === m.memberId)).length === 0 ? (
          <Typography.Text type="secondary">All members are already in this project. Add new members from the Members page first.</Typography.Text>
        ) : (
        <Form form={addMemberForm} layout="vertical" onFinish={onAddMember}>
          <Form.Item name="memberId" label="Member" rules={[{ required: true, message: 'Select a member' }]}>
            <Select
              placeholder="Select member to add"
              options={getMembersList()
                .filter((m) => !effectiveMembers.some((pm) => pm.memberId === m.memberId))
                .map((m) => ({ value: m.memberId, label: m.name }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="role" label="Role in project" initialValue="Contributor">
            <Input placeholder="e.g. Lead, Contributor" />
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
            <Input placeholder="Project Alpha" />
          </Form.Item>
          <Form.Item name="projectCategory" label="Project Category" rules={[{ required: true }]}>
            <Select placeholder="Select category" options={categoryOptions} showSearch allowClear />
          </Form.Item>
          <Form.Item name="projectTag" label="Project Tags">
            <Select mode="multiple" placeholder="Select tags" options={tagOptions} showSearch allowClear />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <Select options={priorityOptions} />
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
          <Form.Item name="status" label="Project Status">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Save changes</Button>
              <Button
                type="default"
                icon={<CheckCircleOutlined />}
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
                onClick={markProjectCompleted}
              >
                Mark as completed
              </Button>
              <Button onClick={closeProjectEditDrawer}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
