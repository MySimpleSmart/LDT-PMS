import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Row, Col, Card, Space, Button, List, Tag, Progress } from 'antd'
import {
  ProjectOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  RiseOutlined,
  PlusOutlined,
  FileTextOutlined,
  UserAddOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useNotes } from '../context/NotesContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import { getProjectsList } from '../data/projects'
import { getMemberIdsWhoAreProjectLeads } from '../data/projects'
import { getMembersList } from '../data/members'
import { flattenTasksFromProjects } from '../data/tasks'

const NOTE_PREVIEW_LENGTH = 80
const MENTION_REGEX = /@\[([^\]]+)\]\([^)]+\)/g

function notePreview(content: string | undefined | null): string {
  const s = (content ?? '').replace(MENTION_REGEX, '@$1')
  if (s.length <= NOTE_PREVIEW_LENGTH) return s
  return s.slice(0, NOTE_PREVIEW_LENGTH).trim() + '…'
}

function formatDate(iso: string | undefined | null): string {
  if (iso == null || iso === '') return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(iso)
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { notes } = useNotes()
  const { isSuperAdmin, currentAdminId, currentMember, currentUserMemberId } = useCurrentUser()
  const isProjectLead = Boolean(currentUserMemberId && getMemberIdsWhoAreProjectLeads().map((id) => id.toUpperCase()).includes(currentUserMemberId.toUpperCase()))
  const canAddTask = isSuperAdmin || (currentAdminId && !currentMember) || isProjectLead

  const projects = useMemo(() => getProjectsList(), [])
  const tasks = useMemo(() => flattenTasksFromProjects(), [])
  const membersCount = useMemo(() => getMembersList().length, [])
  const activeProjectsCount = useMemo(() => projects.filter((p) => p.status === 'In Progress').length, [projects])

  const recentNotes = useMemo(() => (Array.isArray(notes) ? notes : []).slice(0, 10), [notes])
  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')).slice(0, 10),
    [projects]
  )

  const quickActions = [
    ...(isSuperAdmin ? [{ label: 'New project', icon: <ProjectOutlined />, path: '/projects/new' }] : []),
    ...(canAddTask ? [{ label: 'New task', icon: <CheckSquareOutlined />, path: '/tasks/new' }] : []),
    ...(isSuperAdmin ? [{ label: 'New member', icon: <UserAddOutlined />, path: '/members/new' }] : []),
    { label: 'New note', icon: <FileTextOutlined />, path: '/notes' },
  ]

  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        Dashboard
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Overview of your projects and activity.
      </Typography.Text>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" hoverable onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
            <Space>
              <div style={{ padding: 8, background: '#e6f4ff', borderRadius: 8 }}>
                <ProjectOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              </div>
              <div>
                <Typography.Text type="secondary">Projects</Typography.Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{projects.length}</div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" hoverable onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
            <Space>
              <div style={{ padding: 8, background: '#f6ffed', borderRadius: 8 }}>
                <CheckSquareOutlined style={{ fontSize: 20, color: '#52c41a' }} />
              </div>
              <div>
                <Typography.Text type="secondary">Tasks</Typography.Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{tasks.length}</div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" hoverable onClick={() => navigate('/members')} style={{ cursor: 'pointer' }}>
            <Space>
              <div style={{ padding: 8, background: '#fff7e6', borderRadius: 8 }}>
                <TeamOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
              </div>
              <div>
                <Typography.Text type="secondary">Team</Typography.Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{membersCount}</div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" hoverable onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
            <Space>
              <div style={{ padding: 8, background: '#f9f0ff', borderRadius: 8 }}>
                <RiseOutlined style={{ fontSize: 20, color: '#722ed1' }} />
              </div>
              <div>
                <Typography.Text type="secondary">Active projects</Typography.Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{activeProjectsCount}</div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={10}>
          <Card title="Quick actions" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {quickActions.map((action) => (
                <Button
                  key={action.path}
                  type="default"
                  icon={action.icon}
                  block
                  onClick={() => navigate(action.path)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: 40 }}
                >
                  {action.label}
                  <ArrowRightOutlined style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(0,0,0,0.45)' }} />
                </Button>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            title="Recent projects"
            size="small"
            extra={projects.length > 0 ? <Button type="link" size="small" onClick={() => navigate('/projects')}>View all</Button> : null}
          >
            {recentProjects.length === 0 ? (
              <Typography.Text type="secondary">No projects yet.</Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={recentProjects}
                renderItem={(p) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    actions={[<ArrowRightOutlined key="go" style={{ color: 'rgba(0,0,0,0.45)' }} />]}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={8}>
                          <span>{p.projectName}</span>
                          <Tag color={p.status === 'Completed' ? 'green' : 'default'}>{p.status}</Tag>
                        </Space>
                      }
                      description={
                        <Space size={8}>
                          <Typography.Text type="secondary">{p.projectId}</Typography.Text>
                          <Progress percent={p.progress} size="small" showInfo={false} style={{ width: 60, marginBottom: 0 }} />
                          <Typography.Text type="secondary">{p.progress}%</Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card
            title="Recent notes"
            size="small"
            extra={recentNotes.length > 0 ? <Button type="link" size="small" onClick={() => navigate('/notes')}>View all</Button> : null}
          >
            {recentNotes.length === 0 ? (
              <Typography.Text type="secondary">No notes yet. Create one from Quick actions or the Notes page.</Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={recentNotes}
                renderItem={(note) => (
                  <List.Item
                    style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                    onClick={() => navigate('/notes')}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={8}>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{note.author}</Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatDate(note.createdAt)}</Typography.Text>
                        </Space>
                      }
                      description={
                        <Typography.Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {notePreview(note.content)}
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
