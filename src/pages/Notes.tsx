import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Typography,
  Button,
  Card,
  Row,
  Col,
  Modal,
  Form,
  Drawer,
  message,
  Popconfirm,
  Space,
  Input,
  DatePicker,
  Pagination,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useNotes } from '../context/NotesContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import { getMembersList, getMemberProfilePath } from '../data/members'
import MentionTextArea from '../components/MentionTextArea'
import type { Note } from '../types/note'

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g
const PREVIEW_LENGTH = 120

/** Renders note content with @[Name](memberId) as links to member profile. */
function NoteContent({ content }: { content?: string | null }) {
  const text = typeof content === 'string' ? content : ''
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const re = new RegExp(MENTION_REGEX.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index))
    }
    const name = m[1] ?? ''
    const memberId = m[2] ?? ''
    if (memberId) {
      parts.push(
        <Link key={m.index} to={getMemberProfilePath(memberId)} style={{ color: '#1890ff', fontWeight: 500 }}>
          @{name || 'member'}
        </Link>
      )
    } else {
      parts.push(`@[${name}]`)
    }
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts.length ? parts : text}</>
}

function formatDate(iso: string | undefined | null): string {
  if (iso == null || iso === '') return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

/** Plain-text preview: mentions become @Name, then truncate. */
function previewContent(content: string | undefined | null, maxLen: number): string {
  const s = typeof content === 'string' ? content : ''
  const plain = s.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
  if (plain.length <= maxLen) return plain
  return plain.slice(0, maxLen).trim() + '…'
}

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useNotes()
  const { displayName } = useCurrentUser()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewNote, setViewNote] = useState<Note | null>(null)
  const [form] = Form.useForm()

  const authorName = displayName.trim() || 'User'
  const members = getMembersList()
  const notesList = Array.isArray(notes) ? notes : []

  const [searchText, setSearchText] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  const filteredNotes = useMemo(() => {
    let list = notesList
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(
        (n) =>
          (n.content && n.content.toLowerCase().includes(q)) ||
          (n.author && n.author.toLowerCase().includes(q))
      )
    }
    if (dateRange && (dateRange[0] || dateRange[1])) {
      const [rangeStart, rangeEnd] = dateRange
      list = list.filter((n) => {
        const noteDate = n.createdAt ? dayjs(n.createdAt) : null
        if (!noteDate) return true
        if (rangeStart && noteDate.isBefore(rangeStart, 'day')) return false
        if (rangeEnd && noteDate.isAfter(rangeEnd, 'day')) return false
        return true
      })
    }
    return list
  }, [notesList, searchText, dateRange])

  const hasActiveFilters = Boolean(searchText || (dateRange && (dateRange[0] || dateRange[1])))

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(9)

  const paginatedNotes = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredNotes.slice(start, start + pageSize)
  }, [filteredNotes, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [filteredNotes.length])

  const onPaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage)
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setPage(1)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setModalOpen(true)
  }

  const openEdit = (note: Note) => {
    setViewNote(null)
    setEditingId(note.id)
    setModalOpen(true)
  }

  useEffect(() => {
    if (modalOpen) {
      if (editingId) {
        const note = notesList.find((n) => n.id === editingId)
        if (note) form.setFieldsValue({ content: note.content })
      } else {
        form.setFieldsValue({ content: '' })
      }
    }
  }, [modalOpen, editingId, notesList])

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    form.resetFields()
  }

  const openView = (note: Note) => {
    setViewNote(note)
  }

  const closeView = () => {
    setViewNote(null)
  }

  const onFinish = (values: { content: string }) => {
    const content = (values.content ?? '').trim()
    if (!content) {
      message.warning('Enter some content.')
      return
    }
    if (editingId) {
      updateNote(editingId, { content, updatedAt: new Date().toISOString() })
      message.success('Note updated.')
    } else {
      addNote({ content, author: authorName, createdAt: new Date().toISOString() })
      message.success('Note created.')
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    deleteNote(id)
    setViewNote(null)
    message.success('Note deleted.')
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>Notes</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            Create and manage notes. Type <Typography.Text code>@</Typography.Text> to mention a member.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add note
        </Button>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <Space wrap size="middle" align="center">
            <Input
              placeholder="Search by content or author..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 280 }}
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
                  setDateRange(null)
                }}
              >
                Clear filters
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {filteredNotes.length === 0 ? (
        <Card>
          <Typography.Text type="secondary">
            {hasActiveFilters ? 'No notes match your filters.' : 'No notes yet. Create one to get started.'}
          </Typography.Text>
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {paginatedNotes.map((note) => (
              <Col key={note.id} xs={24} sm={12} md={6} lg={6}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => openView(note)}
                  style={{ height: '100%', cursor: 'pointer' }}
                  styles={{
                    body: {
                      padding: 16,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                    },
                  }}
                >
                  <div style={{ flex: 1, minHeight: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'rgba(0,0,0,0.85)' }}>
                    {previewContent(note.content, PREVIEW_LENGTH)}
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #f0f0f0' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      <UserOutlined /> {note.author}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(note.createdAt)}
                    </Typography.Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination
              current={page}
              total={filteredNotes.length}
              pageSize={pageSize}
              onChange={onPaginationChange}
              showSizeChanger
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} notes`}
              pageSizeOptions={[6, 9, 12, 24, 48]}
            />
          </div>
        </>
      )}

      {/* View drawer: full note + Edit / Delete */}
      <Drawer
        title="Note"
        placement="right"
        width={480}
        open={!!viewNote}
        onClose={closeView}
        extra={
          viewNote ? (
            <Space>
              <Button type="primary" icon={<EditOutlined />} onClick={() => openEdit(viewNote)}>
                Edit
              </Button>
              <Popconfirm
                title="Delete this note?"
                description="This cannot be undone."
                onConfirm={() => handleDelete(viewNote.id)}
                okText="Delete"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
              >
                <Button danger icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            </Space>
          ) : null
        }
      >
        {viewNote && (
          <>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
              <NoteContent content={viewNote.content ?? ''} />
            </div>
            <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Typography.Text type="secondary" style={{ display: 'block' }}>
                <UserOutlined /> {viewNote.author ?? '—'}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block' }}>
                Created {formatDate(viewNote.createdAt)}
              </Typography.Text>
              {viewNote.updatedAt != null && viewNote.updatedAt !== '' && (
                <Typography.Text type="secondary" style={{ display: 'block' }}>
                  Updated {formatDate(viewNote.updatedAt)}
                </Typography.Text>
              )}
            </div>
          </>
        )}
      </Drawer>

      {/* Create / Edit modal - only mount form when open to avoid Form.Item + custom control issues */}
      <Modal
        title={editingId ? 'Edit note' : 'Add note'}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={560}
        destroyOnClose
      >
        {modalOpen && (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="content"
              label="Content"
              rules={[{ required: true, message: 'Enter note content' }]}
            >
              <MentionTextArea
                members={members}
                placeholder="Write your note... Type @ to mention a member."
                rows={6}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingId ? 'Save changes' : 'Create note'}
                </Button>
                <Button onClick={closeModal}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}
