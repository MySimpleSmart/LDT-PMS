import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Typography, Card, Table, Button, Input, Space, message, Modal, Tabs } from 'antd'
import type { TabsProps } from 'antd'
import { PlusOutlined, DeleteOutlined, AppstoreOutlined, TagsOutlined } from '@ant-design/icons'
import { useProjectMeta } from '../context/ProjectMetaContext'
import { useCurrentUser } from '../context/CurrentUserContext'

export default function ProjectCategoriesAndTags() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSuperAdmin } = useCurrentUser()
  const { categories, addCategory, removeCategory, tags, addTag, removeTag } = useProjectMeta()

  useEffect(() => {
    if (!isSuperAdmin) navigate('/projects', { replace: true })
  }, [isSuperAdmin, navigate])

  const [categoryName, setCategoryName] = useState('')
  const [tagName, setTagName] = useState('')
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const initialTab = (location.state as { tab?: string } | null)?.tab === 'tags' ? 'tags' : 'categories'

  const handleAddCategory = () => {
    const trimmed = categoryName.trim()
    if (!trimmed) {
      message.warning('Enter a category name.')
      return
    }
    if (categories.includes(trimmed)) {
      message.warning('This category already exists.')
      return
    }
    addCategory(trimmed)
    setCategoryName('')
    message.success('Category added.')
  }

  const handleDeleteCategory = (name: string) => {
    setDeletingCategory(name)
    Modal.confirm({
      title: 'Delete category?',
      content: `"${name}" will be removed from the list. Projects using it will keep the value but it won't appear in the dropdown for new projects.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        removeCategory(name)
        setDeletingCategory(null)
        message.success('Category removed.')
      },
      onCancel: () => setDeletingCategory(null),
    })
  }

  const handleAddTag = () => {
    const trimmed = tagName.trim()
    if (!trimmed) {
      message.warning('Enter a tag name.')
      return
    }
    if (tags.includes(trimmed)) {
      message.warning('This tag already exists.')
      return
    }
    addTag(trimmed)
    setTagName('')
    message.success('Tag added.')
  }

  const handleDeleteTag = (name: string) => {
    setDeletingTag(name)
    Modal.confirm({
      title: 'Delete tag?',
      content: `"${name}" will be removed from the list. Projects using it will keep the value but it won't appear in the dropdown for new projects.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        removeTag(name)
        setDeletingTag(null)
        message.success('Tag removed.')
      },
      onCancel: () => setDeletingTag(null),
    })
  }

  const categoryColumns = [
    { title: 'Category', dataIndex: 'name', key: 'name' },
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
          onClick={() => handleDeleteCategory(record.name)}
          disabled={deletingCategory === record.name}
        >
          Remove
        </Button>
      ),
    },
  ]

  const tagColumns = [
    { title: 'Tag', dataIndex: 'name', key: 'name' },
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
          onClick={() => handleDeleteTag(record.name)}
          disabled={deletingTag === record.name}
        >
          Remove
        </Button>
      ),
    },
  ]

  const tabItems: TabsProps['items'] = [
    {
      key: 'categories',
      label: (
        <span>
          <AppstoreOutlined /> Categories
        </span>
      ),
      children: (
        <>
          <Card title="Add category" size="small" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 320 }}>
              <Input
                placeholder="e.g. Development"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onPressEnter={handleAddCategory}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory}>
                Add
              </Button>
            </Space.Compact>
          </Card>
          <Card title="Existing categories" size="small">
            <Table
              dataSource={categories.map((name) => ({ key: name, name }))}
              columns={categoryColumns}
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
          <TagsOutlined /> Tags
        </span>
      ),
      children: (
        <>
          <Card title="Add tag" size="small" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 320 }}>
              <Input
                placeholder="e.g. api, backend"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                onPressEnter={handleAddTag}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTag}>
                Add
              </Button>
            </Space.Compact>
          </Card>
          <Card title="Existing tags" size="small">
            <Table
              dataSource={tags.map((name) => ({ key: name, name }))}
              columns={tagColumns}
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
        Project Categories & Tags
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Manage categories and tags used when creating or editing projects.
      </Typography.Text>

      <Tabs defaultActiveKey={initialTab} items={tabItems} />
    </div>
  )
}
