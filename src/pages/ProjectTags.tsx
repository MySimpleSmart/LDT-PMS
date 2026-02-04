import { useState } from 'react'
import { Typography, Card, Table, Button, Input, Space, message, Modal } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useProjectMeta } from '../context/ProjectMetaContext'

export default function ProjectTags() {
  const { tags, addTag, removeTag } = useProjectMeta()
  const [newName, setNewName] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      message.warning('Enter a tag name.')
      return
    }
    if (tags.includes(trimmed)) {
      message.warning('This tag already exists.')
      return
    }
    addTag(trimmed)
    setNewName('')
    message.success('Tag added.')
  }

  const handleDelete = (name: string) => {
    setDeleting(name)
    Modal.confirm({
      title: 'Delete tag?',
      content: `"${name}" will be removed from the list. Projects using it will keep the value but it won't appear in the dropdown for new projects.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        removeTag(name)
        setDeleting(null)
        message.success('Tag removed.')
      },
      onCancel: () => setDeleting(null),
    })
  }

  const columns = [
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
          onClick={() => handleDelete(record.name)}
          disabled={deleting === record.name}
        >
          Remove
        </Button>
      ),
    },
  ]

  const dataSource = tags.map((name) => ({ key: name, name }))

  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>Project Tags</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Manage tags used when creating or editing projects.
      </Typography.Text>

      <Card title="Add tag" size="small" style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%', maxWidth: 320 }}>
          <Input
            placeholder="e.g. api, backend"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={handleAdd}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add
          </Button>
        </Space.Compact>
      </Card>

      <Card title="Existing tags" size="small">
        <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />
      </Card>
    </div>
  )
}
