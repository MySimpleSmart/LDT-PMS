import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, message, Row, Col, Modal, DatePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTasks } from '../context/TasksContext'
import { getProjectsList, getProjectById, type ProjectListRow, type ProjectDetail } from '../data/projects'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import type { TaskNote } from '../types/task'

const taskStatusOptions = [
  { value: 'To do', label: 'To do' },
  { value: 'In progress', label: 'In progress' },
]

export default function NewTask() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { addTask } = useTasks()
  const { displayName, isSuperAdmin, currentAdminId, currentMember, currentUserMemberId } = useCurrentUser()
  const { dirty, setDirty, confirmNavigation } = useUnsavedChanges()

  const [projects, setProjects] = useState<ProjectListRow[]>([])
  const [projectDetailsById, setProjectDetailsById] = useState<Record<string, ProjectDetail>>({})
  const [leadProjectIds, setLeadProjectIds] = useState<string[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await getProjectsList()
        if (!active) return
        setProjects(rows)

        const details: Record<string, ProjectDetail> = {}
        const leadIds: string[] = []
        for (const row of rows) {
          try {
            const detail = await getProjectById(row.id)
            if (!detail) continue
            details[row.id] = detail
            if (currentUserMemberId && detail.members.some((m) => m.role === 'Lead' && m.memberId === currentUserMemberId)) {
              leadIds.push(row.id)
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to load project detail for NewTask', row.id, err)
          }
        }
        if (active) {
          setProjectDetailsById(details)
          setLeadProjectIds(leadIds)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load projects for NewTask page', err)
      }
    })()
    return () => {
      active = false
    }
  }, [currentUserMemberId])

  const canAddTask = isSuperAdmin || (currentAdminId && !currentMember) || Boolean(currentUserMemberId && leadProjectIds.length)

  useEffect(() => {
    if (!canAddTask) navigate('/tasks', { replace: true })
  }, [canAddTask, navigate])

  useEffect(() => {
    setDirty(false)
    return () => setDirty(false)
  }, [setDirty])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const projectOptions = (currentMember && currentUserMemberId && leadProjectIds.length
    ? projects.filter((p) => leadProjectIds.includes(p.id))
    : projects
  ).map((p) => ({ value: p.id, label: `${p.projectId} – ${p.projectName}` }))

  const selectedProjectId = Form.useWatch('projectId', form)
  const projectDetail = selectedProjectId ? projectDetailsById[selectedProjectId] ?? null : null
  const assigneeOptions = projectDetail
    ? projectDetail.members.map((m) => ({ value: m.memberId, label: `${m.name} (${m.role})` }))
    : []

  const onFinish = (values: Record<string, unknown>) => {
    const projectId = values.projectId as string
    const project = projectId ? projectDetailsById[projectId] ?? null : null
    if (!project) {
      message.error('Please select a project.')
      return
    }
    if (currentMember && currentUserMemberId && !leadProjectIds.includes(projectId)) {
      message.error('You can only add tasks to projects you lead.')
      return
    }
    const memberIds = (values.assigneeMemberIds as string[] | undefined) || []
    const assignees = memberIds
      .map((mid) => project.members.find((m) => m.memberId === mid))
      .filter(Boolean)
      .map((m) => ({ memberId: m!.memberId, name: m!.name }))

    const start = values.startDate as { format?: (s: string) => string } | undefined
    const end = values.endDate as { format?: (s: string) => string } | undefined
    const startDate = start?.format?.('YYYY-MM-DD')
    const endDate = end?.format?.('YYYY-MM-DD')

    const initialNote = String(values.initialNote ?? '').trim()
    const author = displayName || 'Current user'
    const notes: TaskNote[] = initialNote
      ? [{ key: `note-${Date.now()}`, author, content: initialNote, createdAt: new Date().toISOString() }]
      : []

    const payload = {
      projectId: project.projectId,
      projectName: project.projectName,
      taskName: (values.taskName as string)?.trim() || '',
      status: (values.status as string) || 'To do',
      startDate,
      endDate,
      assignees: assignees.length ? assignees : undefined,
      notes,
    }

    const assigneeNames = assignees.map((a) => a.name).join(', ') || '—'

    Modal.confirm({
      title: 'Create this task?',
      content: (
        <div>
          <div><b>Project:</b> {project.projectName} ({project.projectId})</div>
          <div><b>Task:</b> {payload.taskName}</div>
          <div><b>Status:</b> {payload.status}</div>
          <div><b>Start / End:</b> {(payload.startDate || '—')} → {(payload.endDate || '—')}</div>
          <div><b>Assignees:</b> {assigneeNames}</div>
          <div><b>Notes:</b> {notes.length ? 'Yes' : 'No'}</div>
        </div>
      ),
      okText: 'Create task',
      cancelText: 'Cancel',
      onOk: () => {
        addTask(payload)
        message.success('Task added.')
        setDirty(false)
        navigate('/tasks')
      },
    })
  }

  return (
    <div style={{ width: '100%' }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => confirmNavigation('/tasks', () => navigate('/tasks'))} style={{ marginBottom: 16 }}>
        Back to Tasks
      </Button>

      <Card title="Add new task">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Assignees must be members of the selected project. You can select one or more.
        </Typography.Text>

        <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={() => setDirty(true)} initialValues={{ status: 'To do' }}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="projectId" label="Related Project" rules={[{ required: true, message: 'Select a project' }]}>
                <Select
                  placeholder="Select project"
                  options={projectOptions}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="taskName" label="Task Name" rules={[{ required: true, message: 'Enter task name' }]}>
                <Input placeholder="e.g. Setup API" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="Task Status">
                <Select options={taskStatusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="startDate" label="Start Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="endDate" label="End Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="assigneeMemberIds" label="Assignees (project members)" rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one assignee' }]}>
                <Select
                  mode="multiple"
                  placeholder={projectDetail ? 'Select one or more assignees' : 'Select a project first'}
                  options={assigneeOptions}
                  showSearch
                  optionFilterProp="label"
                  disabled={!projectDetail}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="initialNote" label="Notes (optional)">
                <Input.TextArea rows={3} placeholder="Add an initial note..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create task
              </Button>
              <Button onClick={() => confirmNavigation('/tasks', () => navigate('/tasks'))}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
