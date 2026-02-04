import { useState, useRef, useEffect } from 'react'
import { Input } from 'antd'

const { TextArea } = Input

interface MemberOption {
  memberId: string
  name: string
}

interface MentionTextAreaProps {
  value?: string
  onChange?: (value: string) => void
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>
  placeholder?: string
  rows?: number
  disabled?: boolean
  members: MemberOption[]
}

/** Find the start of the @mention query before the cursor (e.g. "@" or "@jane"). */
function getMentionRange(value: string, cursor: number): { start: number; query: string } | null {
  if (cursor <= 0) return null
  let i = cursor - 1
  while (i >= 0 && value[i] !== ' ' && value[i] !== '\n') {
    if (value[i] === '@') {
      const query = value.slice(i + 1, cursor)
      return { start: i, query }
    }
    i--
  }
  return null
}

export default function MentionTextArea({
  value = '',
  onChange,
  onBlur,
  placeholder,
  rows = 5,
  disabled,
  members,
}: MentionTextAreaProps) {
  const [showMention, setShowMention] = useState(false)
  const [mentionStart, setMentionStart] = useState(0)
  const [mentionEnd, setMentionEnd] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredMembers = mentionQuery.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : members
  const slice = filteredMembers.slice(0, 8)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    const cursor = e.target.selectionStart ?? v.length
    onChange?.(v)

    const range = getMentionRange(v, cursor)
    if (range) {
      setShowMention(true)
      setMentionStart(range.start)
      setMentionEnd(cursor)
      setMentionQuery(range.query)
      setHighlightIndex(0)
    } else {
      setShowMention(false)
    }
  }

  const insertMention = (member: MemberOption) => {
    const mention = `@[${member.name}](${member.memberId})`
    const before = value.slice(0, mentionStart)
    const after = value.slice(mentionEnd)
    const newValue = before + mention + ' ' + after
    onChange?.(newValue)
    setShowMention(false)

    setTimeout(() => {
      const newCursor = mentionStart + mention.length + 1
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursor, newCursor)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMention || slice.length === 0) return
    if (e.key === 'Escape') {
      setShowMention(false)
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowDown') {
      setHighlightIndex((i) => (i + 1) % slice.length)
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowUp') {
      setHighlightIndex((i) => (i - 1 + slice.length) % slice.length)
      e.preventDefault()
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      insertMention(slice[highlightIndex])
      e.preventDefault()
    }
  }

  useEffect(() => {
    if (!showMention) setHighlightIndex(0)
  }, [showMention, mentionQuery])

  return (
    <div style={{ position: 'relative' }}>
      <TextArea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowMention(false), 200)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      {showMention && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            marginTop: 4,
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1050,
            maxHeight: 240,
            overflow: 'auto',
            minWidth: 200,
          }}
        >
          <div style={{ padding: '4px 12px', fontSize: 12, color: '#888' }}>
            Type to filter · Enter to select
          </div>
          {slice.length === 0 ? (
            <div style={{ padding: 8, color: '#888' }}>No members match</div>
          ) : (
            slice.map((m, i) => (
              <div
                key={m.memberId}
                role="button"
                tabIndex={-1}
                onClick={() => insertMention(m)}
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: i === highlightIndex ? '#e6f4ff' : 'transparent',
                }}
              >
                @{m.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
