import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

const STORAGE_KEY_CATEGORIES = 'echo_pms_project_categories'
const STORAGE_KEY_TAGS = 'echo_pms_project_tags'

const DEFAULT_CATEGORIES = ['Development', 'Design', 'Marketing', 'Operations', 'Research']
const DEFAULT_TAGS = ['api', 'backend', 'frontend', 'ui']

function loadJson<T>(key: string, defaultVal: T): T {
  try {
    const s = localStorage.getItem(key)
    if (s) return JSON.parse(s) as T
  } catch {}
  return defaultVal
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

type ProjectMetaContextValue = {
  categories: string[]
  tags: string[]
  addCategory: (name: string) => void
  removeCategory: (name: string) => void
  addTag: (name: string) => void
  removeTag: (name: string) => void
}

const ProjectMetaContext = createContext<ProjectMetaContextValue | null>(null)

export function ProjectMetaProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<string[]>(() => loadJson(STORAGE_KEY_CATEGORIES, DEFAULT_CATEGORIES))
  const [tags, setTags] = useState<string[]>(() => loadJson(STORAGE_KEY_TAGS, DEFAULT_TAGS))

  useEffect(() => {
    saveJson(STORAGE_KEY_CATEGORIES, categories)
  }, [categories])

  useEffect(() => {
    saveJson(STORAGE_KEY_TAGS, tags)
  }, [tags])

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort()))
  }, [])

  const removeCategory = useCallback((name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name))
  }, [])

  const addTag = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort()))
  }, [])

  const removeTag = useCallback((name: string) => {
    setTags((prev) => prev.filter((t) => t !== name))
  }, [])

  return (
    <ProjectMetaContext.Provider value={{ categories, tags, addCategory, removeCategory, addTag, removeTag }}>
      {children}
    </ProjectMetaContext.Provider>
  )
}

export function useProjectMeta() {
  const ctx = useContext(ProjectMetaContext)
  if (!ctx) throw new Error('useProjectMeta must be used within ProjectMetaProvider')
  return ctx
}
