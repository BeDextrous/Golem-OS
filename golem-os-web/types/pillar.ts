export type Pillar = 'life' | 'dextrous' | 'work' | 'pagemaster'

export type PillarConfig = {
  id: Pillar
  label: string
  color: string
  bg: string
  text: string
  accent: string
  border: string
  badge: string
  activePill: string
  hoverPill: string
  icon: string
  routes: {
    root: string
    subnav: { label: string; href: string }[]
  }
}

export const PILLARS = {
  life: {
    id: 'life' as const,
    label: 'Life',
    color: '#7FA98A',
    bg: 'bg-life-50',
    text: 'text-life-800',
    accent: 'text-life-400',
    border: 'border-life-400',
    badge: 'bg-life-100 text-life-800',
    activePill: 'bg-life-400 text-white',
    hoverPill: 'hover:bg-life-50 hover:text-life-800',
    icon: 'Leaf',
    routes: {
      root: '/life',
      subnav: [
        { label: 'Overview', href: '/life' },
        { label: 'Tasks', href: '/life/tasks' },
        { label: 'Health', href: '/life/health' },
        { label: 'Finances', href: '/life/finances' },
        { label: 'Reading', href: '/life/reading' },
        { label: 'Notes', href: '/life/notes' },
        { label: 'Links', href: '/life/links' },
      ],
    },
  },
  dextrous: {
    id: 'dextrous' as const,
    label: 'Dextrous',
    color: '#DA6B51',
    bg: 'bg-dextrous-50',
    text: 'text-dextrous-800',
    accent: 'text-dextrous-400',
    border: 'border-dextrous-400',
    badge: 'bg-dextrous-100 text-dextrous-800',
    activePill: 'bg-dextrous-400 text-white',
    hoverPill: 'hover:bg-dextrous-50 hover:text-dextrous-800',
    icon: 'Briefcase',
    routes: {
      root: '/dextrous',
      subnav: [
        { label: 'Overview', href: '/dextrous' },
        { label: 'Leads', href: '/dextrous/leads' },
        { label: 'Tasks', href: '/dextrous/tasks' },
        { label: 'Clients', href: '/dextrous/clients' },
        { label: 'Projects', href: '/dextrous/projects' },
        { label: 'Knowledge', href: '/dextrous/knowledge' },
        { label: 'Jobs', href: '/dextrous/jobs' },
        { label: 'Drive', href: '/dextrous/drive' },
        { label: 'Finances', href: '/dextrous/finances' },
        { label: 'Invoices', href: '/dextrous/invoices' },
      ],
    },
  },
  work: {
    id: 'work' as const,
    label: 'Work',
    color: '#5B5F8D',
    bg: 'bg-work-50',
    text: 'text-work-800',
    accent: 'text-work-400',
    border: 'border-work-400',
    badge: 'bg-work-100 text-work-800',
    activePill: 'bg-work-400 text-white',
    hoverPill: 'hover:bg-work-50 hover:text-work-800',
    icon: 'Flame',
    routes: {
      root: '/work',
      subnav: [
        { label: 'Overview', href: '/work' },
        { label: 'Tasks', href: '/work/tasks' },
        { label: 'Goals', href: '/work/goals' },
        { label: 'Projects', href: '/work/projects' },
        { label: 'Clients', href: '/work/clients' },
      ],
    },
  },
  pagemaster: {
    id: 'pagemaster' as const,
    label: 'Pagemaster',
    color: '#3C6E71',
    bg: 'bg-pagemaster-50',
    text: 'text-pagemaster-800',
    accent: 'text-pagemaster-400',
    border: 'border-pagemaster-400',
    badge: 'bg-pagemaster-100 text-pagemaster-800',
    activePill: 'bg-pagemaster-400 text-white',
    hoverPill: 'hover:bg-pagemaster-50 hover:text-pagemaster-800',
    icon: 'Scale',
    routes: {
      root: '/pagemaster',
      subnav: [
        { label: 'Overview', href: '/pagemaster' },
        { label: 'Mike', href: '/pagemaster/mike' },
        { label: 'Knowledge', href: '/pagemaster/knowledge' },
        { label: 'Deadlines', href: '/pagemaster/deadlines' },
        { label: 'Clients', href: '/pagemaster/clients' },
        { label: 'Projects', href: '/pagemaster/projects' },
      ],
    },
  },
} satisfies Record<Pillar, PillarConfig>
