import { useState } from 'react'
import { Typography, Timeline, Button } from 'antd'

export const ACTIVITY_LOG_PAGE_SIZE = 20

export type ActivityLogItem = {
  key: string
  label: string
  sublabel: string
}

type ActivityLogTimelineProps = {
  items: ActivityLogItem[]
  pageSize?: number
  emptyMessage?: string
  /** Optional description shown above the timeline (e.g. "Recent actions and events for this project.") */
  description?: string
}

export default function ActivityLogTimeline({
  items,
  pageSize = ACTIVITY_LOG_PAGE_SIZE,
  emptyMessage = 'No activity yet.',
  description,
}: ActivityLogTimelineProps) {
  const [displayCount, setDisplayCount] = useState(pageSize)
  const visible = items.slice(0, displayCount)
  const hasMore = displayCount < items.length
  const loadMoreCount = hasMore ? Math.min(pageSize, items.length - displayCount) : 0

  return (
    <>
      {description && (
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {description}
          {items.length > 0 && (
            <> Showing {Math.min(displayCount, items.length)} of {items.length}.</>
          )}
        </Typography.Text>
      )}
      {items.length === 0 ? (
        <Typography.Text type="secondary">{emptyMessage}</Typography.Text>
      ) : (
        <>
          <Timeline
            items={visible.map((a) => ({
              key: a.key,
              children: (
                <>
                  <Typography.Text>{a.label}</Typography.Text>
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    {a.sublabel}
                  </Typography.Text>
                </>
              ),
            }))}
          />
          {hasMore && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button type="link" onClick={() => setDisplayCount((c) => c + pageSize)}>
                Load more ({loadMoreCount} more)
              </Button>
            </div>
          )}
        </>
      )}
    </>
  )
}
