import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, message, Row, Col, Modal, DatePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTasks } from '../context/TasksContext'
import { getProjectsList, getProjectById, type ProjectListRow, type ProjectDetail } from '../data/projects'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import type { TaskNote } from '../types/task'

function projectAllowsTaskDates(project: ProjectDetail | null): boolean {
  if (!project) return false
  const start = project.startDate?.trim() ?? ''
  const end = project.endDate?.trim() ?? ''
  return start !== '' || end !== ''
}

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

  const canAddToAnyProject = isSuperAdmin || (currentAdminId && !currentMember) || currentMember?.role === 'Admin'
  const projectOptions = (canAddToAnyProject
    ? projects
    : currentMember && currentUserMemberId && leadProjectIds.length
      ? projects.filter((p) => leadProjectIds.includes(p.id))
      : projects
  )
    .filter((p) => !p.isArchived && p.status !== 'Completed')
    .map((p) => ({ value: p.id, label: `${p.projectId} – ${p.projectName}` }))

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
    if (!canAddToAnyProject && currentMember && currentUserMemberId && !leadProjectIds.includes(projectId)) {
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

    const initialNote = String(values.initialNote ?? '').trim()
    const author = displayName || 'Current user'
    const notes: TaskNote[] = initialNote
      ? [{ key: `note-${Date.now()}`, author, content: initialNote, createdAt: new Date().toISOString() }]
      : []

    const payload = {
      projectId: project.projectId,
      projectName: project.projectName,
      taskName: (values.taskName as string)?.trim() || '',
      status,
      startDate,
      endDate,
      assignees: assignees.length ? assignees : undefined,
      completedAt: status === 'Completed' ? new Date().toISOString() : undefined,
      notes,
    }

    const assigneeNames = assignees.map((a) => a.name).join(', ') || '—'
    const initialNoteText = notes.length ? (notes[0].content.slice(0, 80) + (notes[0].content.length > 80 ? '…' : '')) : '—'
    const confirmLabelStyle = { width: 100, flexShrink: 0, color: 'rgba(0,0,0,0.45)', fontSize: 13 }
    const confirmValueStyle = { flex: 1, fontSize: 13 }
    const confirmRowStyle = { display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }
    const confirmSectionStyle = { marginBottom: 16 }
    const confirmSectionTitleStyle = { fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.65)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }

    const projectDocId = projectId
    Modal.confirm({
      title: 'Create this task?',
      content: (
        <div style={{ maxWidth: 420 }}>
          <div style={confirmSectionStyle}>
            <div style={confirmSectionTitleStyle}>Task</div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Project</span><span style={confirmValueStyle}>{project.projectName} ({project.projectId})</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Task name</span><span style={confirmValueStyle}>{payload.taskName || '—'}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Status</span><span style={confirmValueStyle}>{payload.status}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Start date</span><span style={confirmValueStyle}>{payload.startDate || '—'}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>End date</span><span style={confirmValueStyle}>{payload.endDate || '—'}</span></div>
          </div>
          <div style={confirmSectionStyle}>
            <div style={confirmSectionTitleStyle}>Assignees</div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Members</span><span style={confirmValueStyle}>{assigneeNames}</span></div>
          </div>
          <div style={confirmSectionStyle}>
            <div style={confirmSectionTitleStyle}>Other</div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Notes</span><span style={confirmValueStyle}>{initialNoteText}</span></div>
          </div>
        </div>
      ),
      okText: 'Create task',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await addTask(projectDocId, payload)
          message.success('Task saved.')
          setDirty(false)
          navigate('/tasks')
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to save task.')
        }
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
              <Form.Item
                name="startDate"
                label="Start Date"
                help={projectDetail && !projectAllowsTaskDates(projectDetail) ? 'Parent project has no start/end date; task dates are not allowed.' : undefined}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  disabled={!projectAllowsTaskDates(projectDetail)}
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
            <Col xs={24} md={12}>
              <Form.Item name="endDate" label="End Date">
                <DatePicker
                  style={{ width: '100%' }}
                  disabled={!projectAllowsTaskDates(projectDetail)}
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
