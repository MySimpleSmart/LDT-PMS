import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Typography, Card, Table, Button, Input, Space, message, Modal, Tabs } from 'antd'
import type { TabsProps } from 'antd'
import { PlusOutlined, DeleteOutlined, AppstoreOutlined, TagsOutlined, IdcardOutlined, BankOutlined } from '@ant-design/icons'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { useCurrentUser } from '../context/CurrentUserContext'

function useListSection(
  list: string[],
  add: (name: string) => void,
  remove: (name: string) => void,
  entityLabel: string
) {
  const [inputValue, setInputValue] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      message.warning(`Enter a ${entityLabel} name.`)
      return
    }
    if (list.includes(trimmed)) {
      message.warning(`This ${entityLabel} already exists.`)
      return
    }
    add(trimmed)
    setInputValue('')
    message.success(`${entityLabel} added.`)
  }

  const handleDelete = (name: string) => {
    setDeleting(name)
    Modal.confirm({
      title: `Remove ${entityLabel}?`,
      content: `"${name}" will be removed from the list. Existing records using it will keep the value.`,
      okText: 'Remove',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        remove(name)
        setDeleting(null)
        message.success(`${entityLabel} removed.`)
      },
      onCancel: () => setDeleting(null),
    })
  }

  return { inputValue, setInputValue, deleting, handleAdd, handleDelete }
}

export default function SystemSettings() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isSuperAdmin } = useCurrentUser()
  const initialTab = (location.state as { tab?: string } | null)?.tab === 'tags' ? 'tags' : (location.state as { tab?: string } | null)?.tab === 'categories' ? 'categories' : 'job-types'
  const {
    categories,
    tags,
    jobTypes,
    positions,
    addCategory,
    removeCategory,
    addTag,
    removeTag,
    addJobType,
    removeJobType,
    addPosition,
    removePosition,
  } = useProjectMeta()

  useEffect(() => {
    if (!isSuperAdmin) navigate('/', { replace: true })
  }, [isSuperAdmin, navigate])

  const jobSection = useListSection(jobTypes, addJobType, removeJobType, 'job type')
  const positionSection = useListSection(positions, addPosition, removePosition, 'position')
  const categorySection = useListSection(categories, addCategory, removeCategory, 'category')
  const tagSection = useListSection(tags, addTag, removeTag, 'tag')

  const makeColumns = (
    deleting: string | null,
    onDelete: (name: string) => void
  ) => [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: unknown, record: { name: string }) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onDelete(record.name)}
          disabled={deleting === record.name}
        >
          Remove
        </Button>
      ),
    },
  ]

  const tabItems: TabsProps['items'] = [
    {
      key: 'job-types',
      label: (
        <span>
          <IdcardOutlined /> Job types
        </span>
      ),
      children: (
        <>
          <Card title="Add job type" size="small" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 320 }}>
              <Input
                placeholder="e.g. Developer, Designer"
                value={jobSection.inputValue}
                onChange={(e) => jobSection.setInputValue(e.target.value)}
                onPressEnter={jobSection.handleAdd}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={jobSection.handleAdd}>
                Add
              </Button>
            </Space.Compact>
          </Card>
          <Card title="Existing job types" size="small">
            <Table
              dataSource={jobTypes.map((name) => ({ key: name, name }))}
              columns={makeColumns(jobSection.deleting, jobSection.handleDelete)}
              pagination={false}
              size="small"
            />
          </Card>
        </>
      ),
    },
    {
      key: 'positions',
      label: (
        <span>
          <BankOutlined /> Positions
        </span>
      ),
      children: (
        <>
          <Card title="Add position" size="small" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 320 }}>
              <Input
                placeholder="e.g. Project Manager"
                value={positionSection.inputValue}
                onChange={(e) => positionSection.setInputValue(e.target.value)}
                onPressEnter={positionSection.handleAdd}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={positionSection.handleAdd}>
                Add
              </Button>
            </Space.Compact>
          </Card>
          <Card title="Existing positions" size="small">
            <Table
              dataSource={positions.map((name) => ({ key: name, name }))}
              columns={makeColumns(positionSection.deleting, positionSection.handleDelete)}
              pagination={false}
              size="small"
            />
          </Card>
        </>
      ),
    },
    {
      key: 'categories',
      label: (
        <span>
          <AppstoreOutlined /> Project categories
        </span>
      ),
      children: (
        <>
          <Card title="Add category" size="small" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 320 }}>
              <Input
                placeholder="e.g. Development"
                value={categorySection.inputValue}
                onChange={(e) => categorySection.setInputValue(e.target.value)}
                onPressEnter={categorySection.handleAdd}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={categorySection.handleAdd}>
                Add
              </Button>
            </Space.Compact>
          </Card>
          <Card title="Existing categories" size="small">
            <Table
              dataSource={categories.map((name) => ({ key: name, name }))}
              columns={makeColumns(categorySection.deleting, categorySection.handleDelete)}
              pagination={false}
              size="small"
            />
          </Card>
        </>
      ),
    },
    {
      key: 'tags',
      label: (
        <span>
          <TagsOutlined /> Project tags
        </span>
      ),
      children: (
        <>
          <Card title="Add tag" size="small" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 320 }}>
              <Input
                placeholder="e.g. api, backend"
                value={tagSection.inputValue}
                onChange={(e) => tagSection.setInputValue(e.target.value)}
                onPressEnter={tagSection.handleAdd}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={tagSection.handleAdd}>
                Add
              </Button>
            </Space.Compact>
          </Card>
          <Card title="Existing tags" size="small">
            <Table
              dataSource={tags.map((name) => ({ key: name, name }))}
              columns={makeColumns(tagSection.deleting, tagSection.handleDelete)}
              pagination={false}
              size="small"
            />
          </Card>
        </>
      ),
    },
  ]

  if (!isSuperAdmin) return null

  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        System settings
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Manage job types, positions, and project categories & tags. Only Super Admin can change these.
      </Typography.Text>
      <Tabs defaultActiveKey={initialTab} items={tabItems} />
    </div>
  )
}
