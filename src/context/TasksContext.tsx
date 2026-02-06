import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react'
import type { Task, TaskNote } from '../types/task'
import { flattenTasksFromProjects, persistTaskNote, persistAddTask, persistUpdateTask, persistRemoveTask } from '../data/tasks'

interface TasksContextValue {
  tasks: Task[]
  /** Add a task and persist to Firestore. projectDocId is the project document id (e.g. row.id). */
  addTask: (projectDocId: string, task: Omit<Task, 'id'>) => Promise<Task>
  /** Update task fields and persist to Firestore (startDate, endDate, status, taskName, assignees). */
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'notes'>>) => Promise<void>
  /** Remove a task from the project in Firestore (temporary). */
  removeTask: (taskId: string) => Promise<void>
  addTaskNote: (taskId: string, note: Omit<TaskNote, 'key'>) => Promise<void>
  getTaskById: (taskId: string) => Task | undefined
}

const TasksContext = createContext<TasksContextValue | null>(null)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const initial = await flattenTasksFromProjects()
        if (active) setTasks(initial)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load initial tasks from projects', err)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const addTask = useCallback(async (projectDocId: string, task: Omit<Task, 'id'>): Promise<Task> => {
    const created = await persistAddTask(projectDocId, {
      title: task.taskName,
      status: task.status,
      assignees: task.assignees,
      startDate: task.startDate,
      endDate: task.endDate,
      completedAt: task.completedAt,
      notes: task.notes?.length ? task.notes : undefined,
    })
    setTasks((prev) => [...prev, created])
    return created
  }, [])

  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<Task, 'id' | 'notes'>>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    )
    await persistUpdateTask(taskId, {
      taskName: updates.taskName,
      status: updates.status,
      startDate: updates.startDate,
      endDate: updates.endDate,
      assignees: updates.assignees,
      completedAt: updates.completedAt,
    })
  }, [])

  const removeTask = useCallback(async (taskId: string) => {
    await persistRemoveTask(taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }, [])

  const addTaskNote = useCallback(async (taskId: string, note: Omit<TaskNote, 'key'>) => {
    const newNote: TaskNote = { ...note, key: `note-${Date.now()}` }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, notes: [...(t.notes ?? []), newNote] } : t
      )
    )
    await persistTaskNote(taskId, newNote)
  }, [])

  const getTaskById = useCallback(
    (taskId: string) => tasks.find((t) => t.id === taskId),
    [tasks]
  )

  const value = useMemo(
    () => ({ tasks, addTask, updateTask, removeTask, addTaskNote, getTaskById }),
    [tasks, addTask, updateTask, removeTask, addTaskNote, getTaskById]
  )
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used within TasksProvider')
  return ctx
}
