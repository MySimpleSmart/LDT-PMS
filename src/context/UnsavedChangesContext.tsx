import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Modal } from 'antd'

type UnsavedChangesContextValue = {
  dirty: boolean
  setDirty: (dirty: boolean) => void
  confirmNavigation: (nextPath: string, navigateFn: () => void) => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false)

  const confirmNavigation = useCallback(
    (nextPath: string, navigateFn: () => void) => {
      if (!dirty) {
        navigateFn()
        return
      }
      Modal.confirm({
        title: 'Discard changes?',
        content: `You have unsaved changes. If you leave this page (${nextPath}), your changes will be lost.`,
        okText: 'Leave without saving',
        okButtonProps: { danger: true },
        cancelText: 'Stay',
        onOk: () => {
          setDirty(false)
          navigateFn()
        },
      })
    },
    [dirty]
  )

  const value = useMemo(
    () => ({ dirty, setDirty, confirmNavigation }),
    [dirty, confirmNavigation]
  )

  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext)
  if (!ctx) throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider')
  return ctx
}

