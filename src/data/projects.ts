import { formatProjectId } from '../types/project'
import type { ProjectMember, ProjectNote, ProjectFile, ProjectTask } from '../types/project'

/** Progress is computed from tasks (done/total), not stored. */
export interface ProjectDetail {
  projectId: string
  projectName: string
  projectCategory: string
  projectTag: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  startDate: string
  endDate: string
  status: 'Not Started' | 'In Progress' | 'On Hold' | 'Pending completion' | 'Completed'
  progress: number
  tasks: ProjectTask[]
  members: ProjectMember[]
  notes: ProjectNote[]
  files: ProjectFile[]
  createdBy: string
  createdAt: string
}

const DONE_STATUSES = ['Completed'] as const

function computeProgress(tasks: ProjectTask[]): number {
  if (!tasks.length) return 0
  const done = tasks.filter((t) => DONE_STATUSES.includes(t.status as (typeof DONE_STATUSES)[number])).length
  return Math.round((done / tasks.length) * 100)
}

function parseProjectNum(id: string): number | null {
  const raw = id.trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (upper.startsWith('PRJ')) {
    const digits = upper.replace(/\D+/g, '')
    const n = Number.parseInt(digits, 10)
    return Number.isFinite(n) ? n : null
  }
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

type DemoProjectSeed = {
  id: string // route id (e.g. "1")
  num: number // used for PRJ0001 format
  projectName: string
  projectCategory: string
  projectTag: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  startDate: string
  endDate: string
  status: 'Not Started' | 'In Progress' | 'On Hold' | 'Pending completion' | 'Completed'
  tasks: ProjectTask[] // must be 4 tasks each
  members: ProjectMember[]
  notes: ProjectNote[]
  files: ProjectFile[]
  createdBy: string
  createdAt: string
}

// Generate demo tasks for pagination testing
function generateDemoTasks(): ProjectTask[] {
  const baseTasks: ProjectTask[] = [
    { key: '1', title: 'Setup API', status: 'Completed', assigneeMemberId: 'LDA0001', assigneeName: 'Jane Doe', startDate: '2025-01-15', endDate: '2025-01-28' },
    { key: '2', title: 'Auth module', status: 'In progress', assigneeMemberId: 'ADA0002', assigneeName: 'Alex River', startDate: '2025-01-22', endDate: '2025-02-15' },
    { key: '3', title: 'Deploy staging', status: 'To do', assigneeMemberId: 'LDA0009', assigneeName: 'Olivia Garcia', startDate: '2025-02-10', endDate: '2025-03-05' },
    { key: '4', title: 'Write docs', status: 'To do', assigneeMemberId: 'ADA0001', assigneeName: 'Sam Admin', startDate: '2025-03-01', endDate: '2025-03-31' },
  ]
  const assignees = [
    { memberId: 'LDA0001', name: 'Jane Doe' },
    { memberId: 'ADA0002', name: 'Alex River' },
    { memberId: 'LDA0009', name: 'Olivia Garcia' },
    { memberId: 'ADA0001', name: 'Sam Admin' },
    { memberId: 'LDA0010', name: 'Daniel Nguyen' },
  ]
  const taskTitles = [
    'API endpoint review', 'Database optimization', 'Cache implementation', 'Error handling',
    'Unit tests', 'Integration tests', 'Code refactoring', 'Performance tuning',
    'Security audit', 'Documentation update', 'Code review', 'Bug fix',
    'Feature enhancement', 'UI improvements', 'Backend optimization', 'API versioning',
  ]
  // Add 50 more "To do" tasks to test pagination
  for (let i = 5; i <= 55; i++) {
    const assignee = assignees[(i - 5) % assignees.length]
    const title = `${taskTitles[(i - 5) % taskTitles.length]} #${i}`
    baseTasks.push({
      key: String(i),
      title,
      status: 'To do',
      assigneeMemberId: assignee.memberId,
      assigneeName: assignee.name,
      startDate: '2025-02-15',
      endDate: '2025-03-15',
    })
  }
  return baseTasks
}

const DEMO_PROJECTS: DemoProjectSeed[] = [
  {
    id: '1',
    num: 1,
    projectName: 'Project Alpha',
    projectCategory: 'Development',
    projectTag: 'api, backend',
    priority: 'Medium',
    startDate: '2025-01-15',
    endDate: '2025-03-31',
    status: 'In Progress',
    tasks: generateDemoTasks(),
    members: [
      { key: '1', memberId: 'ADA0001', name: 'Sam Admin', role: 'Lead' },
      { key: '2', memberId: 'ADA0002', name: 'Alex River', role: 'Contributor' },
      { key: '3', memberId: 'LDA0001', name: 'Jane Doe', role: 'Contributor' },
      { key: '4', memberId: 'LDA0010', name: 'Daniel Nguyen', role: 'Contributor' },
      { key: '5', memberId: 'LDA0009', name: 'Olivia Garcia', role: 'Contributor' },
    ],
    notes: [{ key: '1', author: 'Sam Admin', content: 'Kickoff meeting completed.', createdAt: '2025-01-16T10:00:00' }],
    files: [{ key: '1', name: 'spec.pdf', size: '120 KB', uploadedAt: '2025-01-15' }],
    createdBy: 'Sam Admin',
    createdAt: '2025-01-15T09:00:00',
  },
  {
    id: '2',
    num: 2,
    projectName: 'Website Redesign',
    projectCategory: 'Design',
    projectTag: 'frontend, ui',
    priority: 'High',
    startDate: '2025-02-01',
    endDate: '2025-04-30',
    status: 'In Progress',
    tasks: [
      { key: '1', title: 'Wireframes', status: 'Completed', assigneeMemberId: 'LDA0005', assigneeName: 'Mia Chen', startDate: '2025-02-01', endDate: '2025-02-18' },
      { key: '2', title: 'Design system', status: 'In progress', assigneeMemberId: 'ADA0002', assigneeName: 'Alex River', startDate: '2025-02-14', endDate: '2025-03-20' },
      { key: '3', title: 'Hi‑fi mockups', status: 'To do', assigneeMemberId: 'LDA0011', assigneeName: 'Hana Ali', startDate: '2025-03-22', endDate: '2025-04-10' },
      { key: '4', title: 'Handoff to dev', status: 'To do', assigneeMemberId: 'ADA0001', assigneeName: 'Sam Admin', startDate: '2025-04-08', endDate: '2025-04-30' },
    ],
    members: [
      { key: '1', memberId: 'LDA0005', name: 'Mia Chen', role: 'Lead' },
      { key: '2', memberId: 'ADA0002', name: 'Alex River', role: 'Contributor' },
      { key: '3', memberId: 'ADA0001', name: 'Sam Admin', role: 'Contributor' },
      { key: '4', memberId: 'LDA0011', name: 'Hana Ali', role: 'Contributor' },
      { key: '5', memberId: 'LDA0004', name: 'Leo Martinez', role: 'Contributor' },
    ],
    notes: [{ key: '1', author: 'Sam Admin', content: 'Homepage direction approved.', createdAt: '2025-02-05T15:20:00' }],
    files: [{ key: '1', name: 'wireframes.pdf', size: '340 KB', uploadedAt: '2025-02-02' }],
    createdBy: 'Sam Admin',
    createdAt: '2025-02-01T09:10:00',
  },
  {
    id: '3',
    num: 3,
    projectName: 'Spring Marketing Campaign',
    projectCategory: 'Marketing',
    projectTag: 'seo, content, ads',
    priority: 'Medium',
    startDate: '2025-03-05',
    endDate: '2025-05-20',
    status: 'Not Started',
    tasks: [
      { key: '1', title: 'Campaign brief', status: 'To do', assigneeMemberId: 'ADA0002', assigneeName: 'Alex River', startDate: '2025-03-05', endDate: '2025-03-22' },
      { key: '2', title: 'Landing page copy', status: 'To do', assigneeMemberId: 'LDA0007', assigneeName: 'Sara Patel', startDate: '2025-03-18', endDate: '2025-04-08' },
      { key: '3', title: 'Ad creatives', status: 'To do', assigneeMemberId: 'LDA0005', assigneeName: 'Mia Chen', startDate: '2025-04-01', endDate: '2025-04-25' },
      { key: '4', title: 'Launch checklist', status: 'To do', assigneeMemberId: 'LDA0006', assigneeName: 'Noah Wilson', startDate: '2025-05-05', endDate: '2025-05-20' },
    ],
    members: [
      { key: '1', memberId: 'LDA0007', name: 'Sara Patel', role: 'Lead' },
      { key: '2', memberId: 'ADA0002', name: 'Alex River', role: 'Contributor' },
      { key: '3', memberId: 'LDA0005', name: 'Mia Chen', role: 'Contributor' },
      { key: '4', memberId: 'LDA0006', name: 'Noah Wilson', role: 'Contributor' },
    ],
    notes: [{ key: '1', author: 'Sam Admin', content: 'Waiting on budget approval.', createdAt: '2025-03-02T09:00:00' }],
    files: [],
    createdBy: 'Sam Admin',
    createdAt: '2025-03-01T11:30:00',
  },
  {
    id: '4',
    num: 4,
    projectName: 'CRM Data Migration',
    projectCategory: 'Operations',
    projectTag: 'data, migration, crm',
    priority: 'Urgent',
    startDate: '2025-01-20',
    endDate: '2025-02-28',
    status: 'On Hold',
    tasks: [
      { key: '1', title: 'Inventory legacy fields', status: 'Completed', assigneeMemberId: 'LDA0012', assigneeName: 'Victor Rossi', startDate: '2025-01-20', endDate: '2025-01-31' },
      { key: '2', title: 'Define mapping rules', status: 'In progress', assigneeMemberId: 'LDA0012', assigneeName: 'Victor Rossi', startDate: '2025-01-28', endDate: '2025-02-12' },
      { key: '3', title: 'Dry run import', status: 'To do', assigneeMemberId: 'LDA0009', assigneeName: 'Olivia Garcia', startDate: '2025-02-08', endDate: '2025-02-22' },
      { key: '4', title: 'Cutover plan', status: 'To do', assigneeMemberId: 'LDA0006', assigneeName: 'Noah Wilson', startDate: '2025-02-18', endDate: '2025-02-28' },
    ],
    members: [
      { key: '1', memberId: 'LDA0012', name: 'Victor Rossi', role: 'Lead' },
      { key: '2', memberId: 'LDA0009', name: 'Olivia Garcia', role: 'Contributor' },
      { key: '3', memberId: 'LDA0006', name: 'Noah Wilson', role: 'Contributor' },
    ],
    notes: [{ key: '1', author: 'Sam Admin', content: 'Paused due to vendor access issues.', createdAt: '2025-01-28T14:10:00' }],
    files: [{ key: '1', name: 'field-mapping.xlsx', size: '88 KB', uploadedAt: '2025-01-25' }],
    createdBy: 'Sam Admin',
    createdAt: '2025-01-20T08:15:00',
  },
  {
    id: '5',
    num: 5,
    projectName: 'Mobile App MVP',
    projectCategory: 'Development',
    projectTag: 'mobile, ios, android',
    priority: 'High',
    startDate: '2025-02-10',
    endDate: '2025-06-10',
    status: 'In Progress',
    tasks: [
      { key: '1', title: 'Define MVP scope', status: 'Completed', assigneeMemberId: 'LDA0008', assigneeName: 'Ethan Brown', startDate: '2025-02-10', endDate: '2025-02-25' },
      { key: '2', title: 'App navigation', status: 'In progress', assigneeMemberId: 'LDA0004', assigneeName: 'Leo Martinez', startDate: '2025-02-28', endDate: '2025-04-15' },
      { key: '3', title: 'Auth flow', status: 'To do', assigneeMemberId: 'LDA0010', assigneeName: 'Daniel Nguyen', startDate: '2025-04-10', endDate: '2025-05-20' },
      { key: '4', title: 'CI pipeline', status: 'To do', assigneeMemberId: 'LDA0009', assigneeName: 'Olivia Garcia', startDate: '2025-05-15', endDate: '2025-06-10' },
    ],
    members: [
      { key: '1', memberId: 'LDA0008', name: 'Ethan Brown', role: 'Lead' },
      { key: '2', memberId: 'LDA0004', name: 'Leo Martinez', role: 'Contributor' },
      { key: '3', memberId: 'LDA0010', name: 'Daniel Nguyen', role: 'Contributor' },
    ],
    notes: [{ key: '1', author: 'Sam Admin', content: 'MVP scope locked.', createdAt: '2025-02-12T09:40:00' }],
    files: [{ key: '1', name: 'mvp-scope.docx', size: '52 KB', uploadedAt: '2025-02-11' }],
    createdBy: 'Sam Admin',
    createdAt: '2025-02-10T10:00:00',
  },
  {
    id: '6',
    num: 6,
    projectName: 'HR Portal Improvements',
    projectCategory: 'Operations',
    projectTag: 'hr, portal, ux',
    priority: 'Low',
    startDate: '2025-03-10',
    endDate: '2025-04-15',
    status: 'In Progress',
    tasks: [
      { key: '1', title: 'Collect feedback', status: 'Completed', assigneeMemberId: 'LDA0006', assigneeName: 'Noah Wilson', startDate: '2025-03-10', endDate: '2025-03-18' },
      { key: '2', title: 'UX audit', status: 'In progress', assigneeMemberId: 'LDA0011', assigneeName: 'Hana Ali', startDate: '2025-03-15', endDate: '2025-03-28' },
      { key: '3', title: 'Form validation fixes', status: 'To do', assigneeMemberId: 'LDA0004', assigneeName: 'Leo Martinez', startDate: '2025-03-25', endDate: '2025-04-08' },
      { key: '4', title: 'Release notes', status: 'To do', assigneeMemberId: 'ADA0001', assigneeName: 'Sam Admin', startDate: '2025-04-05', endDate: '2025-04-15' },
    ],
    members: [
      { key: '1', memberId: 'LDA0006', name: 'Noah Wilson', role: 'Lead' },
      { key: '2', memberId: 'LDA0011', name: 'Hana Ali', role: 'Contributor' },
      { key: '3', memberId: 'LDA0004', name: 'Leo Martinez', role: 'Contributor' },
      { key: '4', memberId: 'ADA0001', name: 'Sam Admin', role: 'Contributor' },
    ],
    notes: [{ key: '1', author: 'Sam Admin', content: 'Quick wins prioritized for this sprint.', createdAt: '2025-03-11T12:05:00' }],
    files: [],
    createdBy: 'Sam Admin',
    createdAt: '2025-03-10T09:00:00',
  },
  {
    id: '7',
    num: 7,
    projectName: 'Customer Support Analytics',
    projectCategory: 'Research',
    projectTag: 'analytics, dashboards',
    priority: 'Medium',
    startDate: '2025-01-05',
    endDate: '2025-02-10',
    status: 'Completed',
    tasks: [
      { key: '1', title: 'Define metrics', status: 'Completed', assigneeMemberId: 'LDA0008', assigneeName: 'Ethan Brown', startDate: '2025-01-05', endDate: '2025-01-15' },
      { key: '2', title: 'Data extraction', status: 'Completed', assigneeMemberId: 'LDA0012', assigneeName: 'Victor Rossi', startDate: '2025-01-12', endDate: '2025-01-28' },
      { key: '3', title: 'Dashboard prototype', status: 'Completed', assigneeMemberId: 'LDA0005', assigneeName: 'Mia Chen', startDate: '2025-01-22', endDate: '2025-02-05' },
      { key: '4', title: 'Stakeholder review', status: 'Completed', assigneeMemberId: 'LDA0006', assigneeName: 'Noah Wilson', startDate: '2025-02-03', endDate: '2025-02-10' },
    ],
    members: [
      { key: '1', memberId: 'LDA0008', name: 'Ethan Brown', role: 'Lead' },
      { key: '2', memberId: 'LDA0012', name: 'Victor Rossi', role: 'Contributor' },
      { key: '3', memberId: 'LDA0005', name: 'Mia Chen', role: 'Contributor' },
    ],
    notes: [{ key: '1', author: 'Sam Admin', content: 'Delivered dashboards to leadership.', createdAt: '2025-02-10T16:30:00' }],
    files: [{ key: '1', name: 'analytics-dashboard.png', size: '210 KB', uploadedAt: '2025-02-08' }],
    createdBy: 'Sam Admin',
    createdAt: '2025-01-05T09:00:00',
  },
]

// Demo-only in-memory overrides (until Firebase)
const PROJECT_OVERRIDES: Record<string, Partial<ProjectDetail>> = {}

/** Demo-only: update a project in memory (until Firebase). */
export function updateProjectById(id: string, updates: Partial<ProjectDetail>) {
  PROJECT_OVERRIDES[id] = { ...(PROJECT_OVERRIDES[id] ?? {}), ...updates }
}

function buildProjectDetail(seed: DemoProjectSeed): ProjectDetail {
  const progress = computeProgress(seed.tasks)
  return {
    projectId: formatProjectId(seed.num),
    projectName: seed.projectName,
    projectCategory: seed.projectCategory,
    projectTag: seed.projectTag,
    priority: seed.priority,
    startDate: seed.startDate,
    endDate: seed.endDate,
    status: seed.status,
    progress,
    tasks: seed.tasks,
    members: seed.members,
    notes: seed.notes,
    files: seed.files,
    createdBy: seed.createdBy,
    createdAt: seed.createdAt,
  }
}

// Placeholder: replace with Firebase
export function getProjectById(id: string): ProjectDetail | null {
  const num = parseProjectNum(id)
  const seed = num ? DEMO_PROJECTS.find((p) => p.num === num || p.id === String(num)) : DEMO_PROJECTS.find((p) => p.id === id)
  if (!seed) return null
  const base = buildProjectDetail(seed)
  const override = PROJECT_OVERRIDES[seed.id]
  if (!override) return base
  const merged = { ...base, ...override } as ProjectDetail
  // Ensure progress stays consistent if tasks were ever overridden
  merged.progress = computeProgress(merged.tasks)
  return merged
}

/** List for Projects table; progress is computed from tasks. */
export function getProjectsList(): {
  id: string
  projectId: string
  projectName: string
  category: string
  priority: string
  status: string
  progress: number
  startDate: string
  endDate: string
}[] {
  return DEMO_PROJECTS.map((seed) => {
    const p = getProjectById(seed.id)
    if (!p) return null
    return {
      id: seed.id,
      projectId: p.projectId,
      projectName: p.projectName,
      category: p.projectCategory,
      priority: p.priority,
      status: p.status,
      progress: p.progress,
      startDate: p.startDate,
      endDate: p.endDate,
    }
  }).filter(Boolean) as {
    id: string
    projectId: string
    projectName: string
    category: string
    priority: string
    status: string
    progress: number
    startDate: string
    endDate: string
  }[]
}

/** Related projects for a member (profile Related Projects section). */
export function getRelatedProjectsForMember(memberId: string): { key: string; name: string; role: string }[] {
  const list: { key: string; name: string; role: string }[] = []
  const projects = getProjectsList()
  for (const proj of projects) {
    const detail = getProjectById(proj.id)
    if (!detail) continue
    const membership = detail.members.find((m) => m.memberId === memberId)
    if (membership) {
      list.push({ key: detail.projectId, name: detail.projectName, role: membership.role })
    }
  }
  return list
}

/** Member IDs that are project lead on at least one project. Used to list them on Admins page (role shown as Member). */
export function getMemberIdsWhoAreProjectLeads(): string[] {
  const leadIds = new Set<string>()
  const list = getProjectsList()
  for (const proj of list) {
    const detail = getProjectById(proj.id)
    if (!detail) continue
    for (const m of detail.members) {
      if (m.role === 'Lead') leadIds.add(m.memberId)
    }
  }
  return Array.from(leadIds)
}
