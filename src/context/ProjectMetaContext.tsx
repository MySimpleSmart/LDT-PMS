import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

const STORAGE_KEY_CATEGORIES = 'echo_pms_project_categories'
const STORAGE_KEY_TAGS = 'echo_pms_project_tags'
const STORAGE_KEY_JOB_TYPES = 'echo_pms_job_types'
const STORAGE_KEY_POSITIONS = 'echo_pms_positions'

const DEFAULT_CATEGORIES = ['Development', 'Design', 'Marketing', 'Operations', 'Research']
const DEFAULT_TAGS = ['api', 'backend', 'frontend', 'ui']
const DEFAULT_JOB_TYPES = ['Developer', 'Designer', 'QA', 'PM', 'Coordinator', 'Marketer', 'DevOps', 'Researcher', 'Analyst']
const DEFAULT_POSITIONS = [
  'System Administrator', 'Project Manager', 'Technical Lead', 'Product Manager', 'Operations Manager',
  'Engineering Manager', 'Team Lead', 'Scrum Master', 'Business Analyst', 'Solutions Architect',
  'Delivery Manager', 'Account Manager',
]

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
  jobTypes: string[]
  positions: string[]
  addCategory: (name: string) => void
  removeCategory: (name: string) => void
  addTag: (name: string) => void
  removeTag: (name: string) => void
  addJobType: (name: string) => void
  removeJobType: (name: string) => void
  addPosition: (name: string) => void
  removePosition: (name: string) => void
}

const ProjectMetaContext = createContext<ProjectMetaContextValue | null>(null)

export function ProjectMetaProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<string[]>(() => loadJson(STORAGE_KEY_CATEGORIES, DEFAULT_CATEGORIES))
  const [tags, setTags] = useState<string[]>(() => loadJson(STORAGE_KEY_TAGS, DEFAULT_TAGS))
  const [jobTypes, setJobTypes] = useState<string[]>(() => loadJson(STORAGE_KEY_JOB_TYPES, DEFAULT_JOB_TYPES))
  const [positions, setPositions] = useState<string[]>(() => loadJson(STORAGE_KEY_POSITIONS, DEFAULT_POSITIONS))

  useEffect(() => { saveJson(STORAGE_KEY_CATEGORIES, categories) }, [categories])
  useEffect(() => { saveJson(STORAGE_KEY_TAGS, tags) }, [tags])
  useEffect(() => { saveJson(STORAGE_KEY_JOB_TYPES, jobTypes) }, [jobTypes])
  useEffect(() => { saveJson(STORAGE_KEY_POSITIONS, positions) }, [positions])

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

  const addJobType = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setJobTypes((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort()))
  }, [])
  const removeJobType = useCallback((name: string) => {
    setJobTypes((prev) => prev.filter((j) => j !== name))
  }, [])
  const addPosition = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setPositions((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort()))
  }, [])
  const removePosition = useCallback((name: string) => {
    setPositions((prev) => prev.filter((p) => p !== name))
  }, [])

  return (
    <ProjectMetaContext.Provider
      value={{
        categories,
        tags,
        jobTypes,
        positions,
        addCategory,
        removeCategory,
        addTag,
        removeTag,
        addJobType,
        removeJobType,
        addPosition,
        removePosition,
      }}
    >
      {children}
    </ProjectMetaContext.Provider>
  )
}

export function useProjectMeta() {
  const ctx = useContext(ProjectMetaContext)
  if (!ctx) throw new Error('useProjectMeta must be used within ProjectMetaProvider')
  return ctx
}
