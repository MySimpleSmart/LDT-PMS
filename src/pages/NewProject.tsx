import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, message, Row, Col, DatePicker, Modal, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import { ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { getMembersList } from '../data/members'
import { createProject } from '../data/projects'
import { createNotification } from '../data/notifications'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useCurrentUser } from '../context/CurrentUserContext'

const priorityOptions = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
]

// New project: only Not Started, In Progress, On Hold (no Pending completion or Completed)
const statusOptionsNewProject = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'On Hold', label: 'On Hold' },
]

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return undefined
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export default function NewProject() {
  const navigate = useNavigate()
  const { isAdmin, displayName } = useCurrentUser()
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const { categories, tags } = useProjectMeta()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const { dirty, setDirty, confirmNavigation } = useUnsavedChanges()

  useEffect(() => {
    if (!isAdmin) navigate('/projects', { replace: true })
  }, [isAdmin, navigate])

  useEffect(() => {
    // Reset dirty flag when entering/leaving this page
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

  const categoryOptions = categories.map((c) => ({ value: c, label: c }))
  const tagOptions = tags.map((t) => ({ value: t, label: t }))

  const [membersList, setMembersList] = useState<{ memberId: string; name: string }[]>([])
  useEffect(() => {
    getMembersList().then(setMembersList).catch(() => setMembersList([]))
  }, [])
  const memberOptions = membersList.map((m) => ({ value: m.memberId, label: m.name }))
  const selectedLeadId = Form.useWatch('projectLead', form)
  const projectMemberOptions = selectedLeadId
    ? memberOptions.filter((opt) => opt.value !== selectedLeadId)
    : memberOptions

  const startDate = Form.useWatch('startDate', form)
  const endDate = Form.useWatch('endDate', form)
  const hasBothDates = startDate != null && endDate != null
  // In Progress requires both dates. Without both dates, only Not Started or On Hold.
  const statusOptions = hasBothDates
    ? statusOptionsNewProject.filter((o) => o.value !== 'Not Started')  // In Progress, On Hold
    : statusOptionsNewProject.filter((o) => o.value !== 'In Progress')  // Not Started, On Hold
  const currentStatus = Form.useWatch('status', form)
  useEffect(() => {
    if (hasBothDates && currentStatus === 'Not Started') {
      form.setFieldValue('status', 'In Progress')
    }
  }, [hasBothDates, currentStatus, form])
  useEffect(() => {
    if (!hasBothDates && currentStatus === 'In Progress') {
      form.setFieldValue('status', 'Not Started')
    }
  }, [hasBothDates, currentStatus, form])

  const onFinish = (values: Record<string, unknown>) => {
    const start = values.startDate as { format?: (s: string) => string } | undefined
    const end = values.endDate as { format?: (s: string) => string } | undefined
    const hasDates = start != null && end != null
    let status = (values.status as string) || 'Not Started'
    if (status === 'In Progress' && !hasDates) status = 'Not Started'
    const tagVal = values.projectTag
    const tagStr = Array.isArray(tagVal) ? (tagVal as string[]).join(', ') : String(tagVal ?? '')
    const leadId = values.projectLead as string | undefined
    const memberIds = (values.projectMembers as string[]) || []
    const members: { key: string; memberId: string; name: string; role: string }[] = []
    let keyIndex = 1
    if (leadId) {
      const lead = membersList.find((m) => m.memberId === leadId)
      members.push({ key: String(keyIndex++), memberId: leadId, name: lead?.name ?? leadId, role: 'Lead' })
    }
    memberIds.filter((id) => id !== leadId).forEach((memberId) => {
      const member = membersList.find((m) => m.memberId === memberId)
      members.push({ key: String(keyIndex++), memberId, name: member?.name ?? memberId, role: 'Contributor' })
    })
    const payload = {
      ...values,
      projectTag: tagStr,
      startDate: start?.format?.('YYYY-MM-DD') ?? values.startDate,
      endDate: end?.format?.('YYYY-MM-DD') ?? values.endDate,
      projectMembers: members,
      projectFiles: fileList.map((f, idx) => ({
        key: `new-file-${idx + 1}`,
        name: f.name,
        size: formatBytes(f.size),
        uploadedAt: new Date().toISOString().slice(0, 10),
      })),
    }
    const startStr = start?.format?.('YYYY-MM-DD') ?? (values.startDate ? String(values.startDate) : '—')
    const endStr = end?.format?.('YYYY-MM-DD') ?? (values.endDate ? String(values.endDate) : '—')
    const leadName = leadId ? membersList.find((m) => m.memberId === leadId)?.name : null
    const contributorNames = memberIds.filter((id) => id !== leadId).map((id) => membersList.find((m) => m.memberId === id)?.name ?? id)
    const confirmLabelStyle = { width: 100, flexShrink: 0, color: 'rgba(0,0,0,0.45)', fontSize: 13 }
    const confirmValueStyle = { flex: 1, fontSize: 13 }
    const confirmRowStyle = { display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }
    const confirmSectionStyle = { marginBottom: 16 }
    const confirmSectionTitleStyle = { fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.65)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }
    Modal.confirm({
      title: 'Create this project?',
      content: (
        <div style={{ maxWidth: 420 }}>
          <div style={confirmSectionStyle}>
            <div style={confirmSectionTitleStyle}>Project</div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Name</span><span style={confirmValueStyle}>{String(values.projectName ?? '—')}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Category</span><span style={confirmValueStyle}>{String(values.projectCategory ?? '—')}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Tags</span><span style={confirmValueStyle}>{tagStr || '—'}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Priority</span><span style={confirmValueStyle}>{String(values.priority ?? '—')}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Status</span><span style={confirmValueStyle}>{status}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Start date</span><span style={confirmValueStyle}>{startStr}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>End date</span><span style={confirmValueStyle}>{endStr}</span></div>
          </div>
          <div style={confirmSectionStyle}>
            <div style={confirmSectionTitleStyle}>Team</div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Lead</span><span style={confirmValueStyle}>{leadName ?? '—'}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Contributors</span><span style={confirmValueStyle}>{contributorNames.length ? contributorNames.join(', ') : '—'}</span></div>
          </div>
          <div style={confirmSectionStyle}>
            <div style={confirmSectionTitleStyle}>Other</div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Notes</span><span style={confirmValueStyle}>{values.notes ? (String(values.notes).slice(0, 80) + (String(values.notes).length > 80 ? '…' : '')) : '—'}</span></div>
            <div style={confirmRowStyle}><span style={confirmLabelStyle}>Files</span><span style={confirmValueStyle}>{fileList.length ? fileList.map((f) => f.name).join(', ') : '—'}</span></div>
          </div>
        </div>
      ),
      okText: 'Create project',
      cancelText: 'Cancel',
      onOk: async () => {
        setSubmitting(true)
        try {
          const projectName = String(values.projectName ?? '')
          const projectId = await createProject({
            projectName,
            projectCategory: String(values.projectCategory ?? ''),
            projectTag: tagStr,
            priority: (values.priority as 'Low' | 'Medium' | 'High' | 'Urgent') ?? 'Medium',
            startDate: (start?.format?.('YYYY-MM-DD') ?? values.startDate) ?? '',
            endDate: (end?.format?.('YYYY-MM-DD') ?? values.endDate) ?? '',
            status,
            members,
            files: fileList.map((f, idx) => ({
              key: `new-file-${idx + 1}`,
              name: f.name,
              size: formatBytes(f.size),
              uploadedAt: new Date().toISOString().slice(0, 10),
            })),
            createdBy: (displayName || 'User').trim(),
          })
          message.success('Project created successfully.')
          setDirty(false)
          for (const m of members) {
            createNotification(m.memberId, {
              type: 'project_added',
              title: `You were added to project: ${projectName}`,
              link: `/projects/${projectId}`,
            }).catch(() => {})
          }
          navigate(`/projects/${projectId}`)
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to create project.')
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  return (
    <div style={{ width: '100%' }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => confirmNavigation('/projects', () => navigate('/projects'))} style={{ marginBottom: 16 }}>
        Back to Projects
      </Button>

      <Card title="Add new project">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={() => setDirty(true)}
          initialValues={{ priority: 'Medium', status: 'Not Started' }}
        >
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Project ID will be assigned automatically (e.g. PRJ0001). Progress is calculated from completed tasks (not manual). Created by and Created at are set on save.
          </Typography.Text>

          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
            <TeamOutlined /> Project members
          </Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            One project lead (Lead) and optionally multiple members (Contributor). You can change these later from the project detail page.
          </Typography.Text>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="projectLead" label="Project Lead (one only)">
                <Select
                  placeholder="Select project lead"
                  options={memberOptions}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  onChange={(leadId) => {
                    const members = form.getFieldValue('projectMembers') as string[] | undefined
                    if (leadId && Array.isArray(members) && members.includes(leadId)) {
                      form.setFieldValue('projectMembers', members.filter((id) => id !== leadId))
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="projectMembers" label="Project Members (Contributor, multiple)">
                <Select
                  mode="multiple"
                  placeholder="Select project members"
                  options={projectMemberOptions}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Form.Item name="projectName" label="Project Name" rules={[{ required: true, message: 'Please enter project name' }]}>
                <Input placeholder="Project Alpha" />
              </Form.Item>
              <Form.Item name="projectCategory" label="Project Category" rules={[{ required: true, message: 'Please select a category (add more in Project → Project Categories)' }]}>
                <Select placeholder="Select category" options={categoryOptions} showSearch allowClear />
              </Form.Item>
              <Form.Item name="projectTag" label="Project Tags">
                <Select mode="multiple" placeholder="Select tags" options={tagOptions} showSearch allowClear />
              </Form.Item>
              <Form.Item name="priority" label="Priority">
                <Select options={priorityOptions} />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="startDate" label="Start Date">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="endDate" label="End Date">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="status" label="Project Status">
                <Select options={statusOptions} />
              </Form.Item>
              <Form.Item name="notes" label="Notes / Comments">
                <Input.TextArea rows={4} placeholder="Initial notes or comments..." />
              </Form.Item>
            </Col>
          </Row>

          <Card size="small" title="Project files" style={{ marginTop: 16, marginBottom: 16 }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Upload files now (demo only). You can upload/remove files later from the project profile.
            </Typography.Text>
            <Upload.Dragger
              multiple
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: next }) => { setFileList(next); setDirty(true) }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Click or drag files to this area</p>
              <p style={{ margin: 0, color: 'rgba(0,0,0,0.45)' }}>Files are kept locally (no backend yet).</p>
            </Upload.Dragger>
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>Create project</Button>
              <Button onClick={() => confirmNavigation('/projects', () => navigate('/projects'))} disabled={submitting}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
