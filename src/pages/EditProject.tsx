import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, message, Row, Col, DatePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getProjectById, type ProjectDetail, updateProjectById } from '../data/projects'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import dayjs from 'dayjs'

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
  { value: 'Pending completion', label: 'Pending completion' },
  { value: 'Completed', label: 'Completed' },
]

export default function EditProject() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin } = useCurrentUser()
  const [form] = Form.useForm()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const { categories, tags } = useProjectMeta()

  const categoryOptions = categories.map((c) => ({ value: c, label: c }))
  const tagOptions = tags.map((t) => ({ value: t, label: t }))

  useEffect(() => {
    if (!isSuperAdmin) navigate('/projects', { replace: true })
  }, [isSuperAdmin, navigate])

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
        console.error('Failed to load project for EditProject', err)
        if (active) setProject(null)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (project) {
      const tagArray = project.projectTag ? project.projectTag.split(',').map((s) => s.trim()).filter(Boolean) : []
      form.setFieldsValue({
        projectName: project.projectName,
        projectCategory: project.projectCategory,
        projectTag: tagArray,
        priority: project.priority,
        startDate: project.startDate ? dayjs(project.startDate) : undefined,
        endDate: project.endDate ? dayjs(project.endDate) : undefined,
        status: project.status,
      })
    }
  }, [project, form])

  const onFinish = async (values: Record<string, unknown>) => {
    const start = values.startDate as { format?: (s: string) => string } | undefined
    const end = values.endDate as { format?: (s: string) => string } | undefined
    const tagVal = values.projectTag
    const tagStr = Array.isArray(tagVal) ? (tagVal as string[]).join(', ') : String(tagVal ?? '')
    if (id && project) {
      try {
        await updateProjectById(id, {
          projectName: String(values.projectName ?? ''),
          projectCategory: String(values.projectCategory ?? ''),
          projectTag: tagStr,
          priority: values.priority as 'Low' | 'Medium' | 'High' | 'Urgent',
          status: values.status as 'Not Started' | 'In Progress' | 'On Hold' | 'Pending completion' | 'Completed',
          startDate: start?.format?.('YYYY-MM-DD') ?? '',
          endDate: end?.format?.('YYYY-MM-DD') ?? '',
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to update project', err)
        message.error('Failed to update project.')
        return
      }
    }
    message.success('Project updated successfully.')
    navigate(`/projects/${id}`)
  }

  if (!id || !project) {
    return (
      <div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>Back to Projects</Button>
        <Typography.Text type="secondary">Project not found.</Typography.Text>
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${id}`)}>
          Back to project
        </Button>
      </div>

      <Card title="Edit project">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Project ID: {project.projectId} (read-only). Progress is calculated from tasks (read-only). Created by {project.createdBy} at {new Date(project.createdAt).toLocaleString()}.
        </Typography.Text>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={24}>
            <Col xs={24} lg={12}>
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
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Save changes</Button>
              <Button onClick={() => navigate(`/projects/${id}`)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
