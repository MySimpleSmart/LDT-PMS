import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { Task, TaskNote } from '../types/task'
import { flattenTasksFromProjects } from '../data/tasks'

interface TasksContextValue {
  tasks: Task[]
  addTask: (task: Omit<Task, 'id'>) => void
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'notes'>>) => void
  addTaskNote: (taskId: string, note: Omit<TaskNote, 'key'>) => void
  getTaskById: (taskId: string) => Task | undefined
}

const TasksContext = createContext<TasksContextValue | null>(null)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => flattenTasksFromProjects())

  const addTask = useCallback((task: Omit<Task, 'id'>) => {
    const id = `new-${Date.now()}`
    setTasks((prev) => [...prev, { ...task, id, notes: task.notes ?? [] }])
  }, [])

  const updateTask = useCallback((taskId: string, updates: Partial<Omit<Task, 'id' | 'notes'>>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    )
  }, [])

  const addTaskNote = useCallback((taskId: string, note: Omit<TaskNote, 'key'>) => {
    const newNote: TaskNote = { ...note, key: `note-${Date.now()}` }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, notes: [...(t.notes ?? []), newNote] } : t
      )
    )
  }, [])

  const getTaskById = useCallback(
    (taskId: string) => tasks.find((t) => t.id === taskId),
    [tasks]
  )

  const value = useMemo(
    () => ({ tasks, addTask, updateTask, addTaskNote, getTaskById }),
    [tasks, addTask, updateTask, addTaskNote, getTaskById]
  )
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used within TasksProvider')
  return ctx
}
