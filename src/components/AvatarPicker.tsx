import { useState } from 'react'
import { Avatar, Button, Modal } from 'antd'
import { getAvatarOptions, getDefaultAvatarUrl } from '../constants/avatars'

const PICKER_SIZE = 64

interface AvatarPickerProps {
  value?: string | null
  onChange?: (url: string | null) => void
  size?: number
}

/** Trigger shows current avatar; click opens a modal with grid of avatars. Default = first image (auto-selected). */
export default function AvatarPicker({ value, onChange, size = 56 }: AvatarPickerProps) {
  const [open, setOpen] = useState(false)
  const options = getAvatarOptions()
  const defaultUrl = getDefaultAvatarUrl()
  const effectiveValue = value == null || value === '' ? defaultUrl : value

  const handleSelect = (url: string) => {
    const isDefault = url === defaultUrl
    onChange?.(isDefault ? null : url)
    setOpen(false)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar size={size} src={effectiveValue} />
        <Button type="primary" onClick={() => setOpen(true)}>
          Choose avatar
        </Button>
      </div>

      <Modal
        title="Choose profile image"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={480}
      >
        <p style={{ marginBottom: 16, color: 'rgba(0,0,0,0.65)' }}>
          Default is automatically selected from these avatars. Click one to use it.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {options.map((opt) => {
            const selected = effectiveValue === opt.value
            return (
              <Avatar
                key={opt.value}
                size={PICKER_SIZE}
                src={opt.value}
                style={{
                  cursor: 'pointer',
                  border: selected ? '3px solid #1677ff' : '2px solid #f0f0f0',
                }}
                onClick={() => handleSelect(opt.value)}
              />
            )
          })}
        </div>
      </Modal>
    </>
  )
}
