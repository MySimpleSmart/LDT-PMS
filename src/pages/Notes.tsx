import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  Space,
  Input,
  DatePicker,
  Pagination,
  Tag,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SearchOutlined, UserAddOutlined, PushpinOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useNotes } from '../context/NotesContext'
import { getNoteById as fetchNoteById } from '../data/notes'
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

/** Check if note content has @[Name](memberId) mentions. */
function hasMentions(content: string | undefined | null): boolean {
  if (typeof content !== 'string') return false
  return /@\[([^\]]+)\]\([^)]+\)/.test(content)
}

/** Truncate content for card preview; mentions in truncated part will still render as links. */
function truncateForPreview(content: string | undefined | null, maxLen: number): string {
  const s = typeof content === 'string' ? content : ''
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen).trim() + '…'
}

export default function Notes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { notes, loading, error, addNote, updateNote, deleteNote, setPinnedNote, refreshNotes } = useNotes()
  const { displayName, currentUserMemberId, isAdmin, isSuperAdmin } = useCurrentUser()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewNote, setViewNote] = useState<Note | null>(null)
  const [form] = Form.useForm()

  const authorName = displayName.trim() || 'User'
  const authorId = currentUserMemberId ?? ''
  const [members, setMembers] = useState<{ memberId: string; name: string }[]>([])
  useEffect(() => {
    getMembersList().then(setMembers).catch(() => setMembers([]))
  }, [])
  const notesList = Array.isArray(notes) ? notes : []

  useEffect(() => {
    const openNoteId = searchParams.get('open')
    if (!openNoteId) return
    const noteFromList = notesList.find((n) => n.id === openNoteId)
    if (noteFromList) {
      setViewNote(noteFromList)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('open')
        return next
      }, { replace: true })
      return
    }
    if (!loading) {
      fetchNoteById(openNoteId).then((fetched) => {
        if (fetched) {
          setViewNote(fetched)
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.delete('open')
            return next
          }, { replace: true })
        }
      }).catch(() => {})
    }
  }, [searchParams, notesList, loading, setSearchParams])

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
    // Pinned note first, then by createdAt desc
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
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

  const [saving, setSaving] = useState(false)

  const onFinish = async (values: { content: string }) => {
    const content = (values.content ?? '').trim()
    if (!content) {
      message.warning('Enter some content.')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateNote(editingId, { content, updatedAt: new Date().toISOString() })
        message.success('Note updated.')
      } else {
        await addNote({ content, author: authorName, authorId: authorId || undefined, createdAt: new Date().toISOString() })
        message.success('Note created.')
      }
      closeModal()
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save note.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id)
      setViewNote(null)
      message.success('Note deleted.')
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to delete note.')
    }
  }

  const canEditOrDeleteNote = (note: Note) =>
    isSuperAdmin || (note.authorId && note.authorId === currentUserMemberId) || (authorName && note.author === authorName)

  const handlePinToggle = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation()
    if (!isAdmin) return
    try {
      const newPinned = !note.pinned
      await setPinnedNote(newPinned ? note.id : null)
      message.success(newPinned ? 'Note pinned.' : 'Note unpinned.')
      if (viewNote?.id === note.id) {
        setViewNote((prev) => (prev ? { ...prev, pinned: newPinned } : null))
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to pin note.')
    }
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
        <Space>
          {error && (
            <Button onClick={() => refreshNotes()}>Retry</Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add note
          </Button>
        </Space>
      </div>

      {error && (
        <Typography.Text type="danger" style={{ display: 'block', marginBottom: 16 }}>
          {error}
        </Typography.Text>
      )}

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

      {loading ? (
        <Card>
          <Typography.Text type="secondary">Loading notes…</Typography.Text>
        </Card>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <Typography.Text type="secondary">
            {hasActiveFilters ? 'No notes match your filters.' : 'No notes yet. Create one to get started.'}
          </Typography.Text>
        </Card>
      ) : (
        <>
          <style>{`
            .notes-card-grid .ant-card { border: 1px solid #f0f0f0; box-shadow: none; transition: background-color 0.2s ease, border-color 0.2s ease; }
            .notes-card-grid .ant-card:hover { background-color: #fafafa; }
            .notes-card-grid .ant-card.notes-card-pinned { background-color: #fffbe6; border-color: #ffd666; }
            .notes-card-grid .ant-card.notes-card-pinned:hover { background-color: #fff1b8; }
          `}</style>
          <Row gutter={[16, 16]} className="notes-card-grid">
            {paginatedNotes.map((note) => (
              <Col key={note.id} xs={24} sm={12} md={6} lg={6}>
                <Card
                  size="small"
                  hoverable={false}
                  onClick={() => openView(note)}
                  className={note.pinned ? 'notes-card-pinned' : undefined}
                  style={{ height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                  styles={{
                    body: {
                      padding: 16,
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                    },
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                      <Space size={4} wrap>
                      {note.pinned && (
                        <Tag icon={<PushpinOutlined />} style={{ margin: 0, background: '#ffe58f', border: 'none', color: '#ad6800' }}>
                          Pinned
                        </Tag>
                      )}
                      {hasMentions(note.content) && (
                        <Tag color="blue" icon={<UserAddOutlined />} style={{ margin: 0 }}>
                          Mentions
                        </Tag>
                      )}
                    </Space>
                    {isAdmin && (
                      <Button
                        type="text"
                        size="small"
                        icon={<PushpinOutlined style={{ transform: note.pinned ? 'rotate(-45deg)' : undefined, color: note.pinned ? '#fa8c16' : 'rgba(0,0,0,0.45)' }} />}
                        onClick={(e) => handlePinToggle(e, note)}
                        title={note.pinned ? 'Unpin' : 'Pin'}
                        style={{ margin: '-4px -4px 0 0', flexShrink: 0 }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minHeight: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'rgba(0,0,0,0.85)' }}>
                    <NoteContent content={truncateForPreview(note.content, PREVIEW_LENGTH)} />
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      <UserOutlined /> {note.author} · {formatDate(note.createdAt)}
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
              {isAdmin && (
                <Button
                  type={viewNote.pinned ? 'default' : 'default'}
                  icon={<PushpinOutlined style={{ transform: viewNote.pinned ? 'rotate(-45deg)' : undefined }} />}
                  onClick={() => handlePinToggle({ stopPropagation: () => {} } as React.MouseEvent, viewNote)}
                  title={viewNote.pinned ? 'Unpin' : 'Pin'}
                >
                  {viewNote.pinned ? 'Unpin' : 'Pin'}
                </Button>
              )}
              {canEditOrDeleteNote(viewNote) && (
                <>
              <Button type="primary" icon={<EditOutlined />} onClick={() => openEdit(viewNote)}>
                Edit
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={viewNote.pinned}
                title={viewNote.pinned ? 'Unpin the note before deleting' : undefined}
                onClick={() => {
                  Modal.confirm({
                    title: 'Delete this note?',
                    content: 'This cannot be undone.',
                    okText: 'Delete',
                    okButtonProps: { danger: true },
                    cancelText: 'Cancel',
                    onOk: async () => {
                      await handleDelete(viewNote.id)
                    },
                  })
                }}
              >
                Delete
              </Button>
                </>
              )}
            </Space>
          ) : null
        }
      >
        {viewNote && (
          <>
            {viewNote.pinned && (
              <Tag icon={<PushpinOutlined />} style={{ marginBottom: 16, background: '#ffe58f', border: 'none', color: '#ad6800' }}>
                Pinned
              </Tag>
            )}
            {hasMentions(viewNote.content) && (
              <Tag color="blue" icon={<UserAddOutlined />} style={{ marginBottom: 16 }}>
                Contains mentions
              </Tag>
            )}
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
              <NoteContent content={viewNote.content ?? ''} />
            </div>
            <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Typography.Text type="secondary">
                <UserOutlined /> {viewNote.author ?? '—'} · Created {formatDate(viewNote.createdAt)}
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
              rules={[
                { required: true, message: 'Enter note content' },
                { max: 1000, message: 'Note must be 1000 characters or less' },
              ]}
            >
              <MentionTextArea
                members={members}
                placeholder="Write your note... Type @ to mention a member. (max 1000 characters)"
                rows={6}
                maxLength={1000}
                showCount
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {editingId ? 'Save changes' : 'Create note'}
                </Button>
                <Button onClick={closeModal} disabled={saving}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}
