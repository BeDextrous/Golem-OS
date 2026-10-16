export type Pillar = 'life' | 'dextrous' | 'palette' | 'pagemaster'

export type PillarConfig = {
  id: Pillar
  label: string
  /** Shorter label for the cramped mobile tab bar */
  shortLabel?: string
  color: string
  bg: string
  text: string
  accent: string
  border: string
  badge: string
  activePill: string
  hoverPill: string
  /** Header band background (light + dark) */
  tint: string
  /** Header title colour (light + dark) */
  headerText: string
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
    tint: 'bg-life-50 dark:bg-life-900/30',
    headerText: 'text-life-800 dark:text-life-100',
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
        { label: 'Calendar', href: '/life/calendar' },
        { label: 'Gmail', href: '/life/gmail' },
        { label: 'Drive', href: '/life/drive' },
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
    tint: 'bg-dextrous-50 dark:bg-dextrous-900/30',
    headerText: 'text-dextrous-800 dark:text-dextrous-100',
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
        { label: 'Calendar', href: '/dextrous/calendar' },
        { label: 'Gmail', href: '/dextrous/gmail' },
        { label: 'Finances', href: '/dextrous/finances' },
        { label: 'Invoices', href: '/dextrous/invoices' },
      ],
    },
  },
  palette: {
    id: 'palette' as const,
    label: 'Palette Media',
    shortLabel: 'Palette',
    color: '#8E5A93',
    bg: 'bg-palette-50',
    text: 'text-palette-800',
    accent: 'text-palette-400',
    border: 'border-palette-400',
    badge: 'bg-palette-100 text-palette-800',
    activePill: 'bg-palette-400 text-white',
    hoverPill: 'hover:bg-palette-50 hover:text-palette-800',
    tint: 'bg-palette-50 dark:bg-palette-900/30',
    headerText: 'text-palette-800 dark:text-palette-100',
    icon: 'Palette',
    routes: {
      root: '/palette',
      subnav: [
        { label: 'Overview', href: '/palette' },
        { label: 'Tasks', href: '/palette/tasks' },
        { label: 'Goals', href: '/palette/goals' },
        { label: 'Projects', href: '/palette/projects' },
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
    tint: 'bg-pagemaster-50 dark:bg-pagemaster-900/30',
    headerText: 'text-pagemaster-800 dark:text-pagemaster-100',
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
        { label: 'Billing', href: '/pagemaster/billing' },
      ],
    },
  },
} satisfies Record<Pillar, PillarConfig>
