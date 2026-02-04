import { useState } from 'react'
import { Typography, Card, Table, Button, Input, Space, message, Modal } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useProjectMeta } from '../context/ProjectMetaContext'

export default function ProjectCategories() {
  const { categories, addCategory, removeCategory } = useProjectMeta()
  const [newName, setNewName] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      message.warning('Enter a category name.')
      return
    }
    if (categories.includes(trimmed)) {
      message.warning('This category already exists.')
      return
    }
    addCategory(trimmed)
    setNewName('')
    message.success('Category added.')
  }

  const handleDelete = (name: string) => {
    setDeleting(name)
    Modal.confirm({
      title: 'Delete category?',
      content: `"${name}" will be removed from the list. Projects using it will keep the value but it won't appear in the dropdown for new projects.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        removeCategory(name)
        setDeleting(null)
        message.success('Category removed.')
      },
      onCancel: () => setDeleting(null),
    })
  }

  const columns = [
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
          onClick={() => handleDelete(record.name)}
          disabled={deleting === record.name}
        >
          Remove
        </Button>
      ),
    },
  ]

  const dataSource = categories.map((name) => ({ key: name, name }))

  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>Project Categories</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Manage categories used when creating or editing projects.
      </Typography.Text>

      <Card title="Add category" size="small" style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%', maxWidth: 320 }}>
          <Input
            placeholder="e.g. Development"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={handleAdd}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add
          </Button>
        </Space.Compact>
      </Card>

      <Card title="Existing categories" size="small">
        <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />
      </Card>
    </div>
  )
}
