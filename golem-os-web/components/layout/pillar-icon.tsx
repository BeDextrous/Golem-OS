import { Leaf, Briefcase, Palette, Scale, Layers } from 'lucide-react'

/** PILLARS stores icon names as strings; this maps them to icons (unknown names fall back to Layers). */
export function PillarIcon({ name, size = 16 }: { name: string; size?: number }) {
  switch (name) {
    case 'Leaf': return <Leaf size={size} aria-hidden="true" />
    case 'Briefcase': return <Briefcase size={size} aria-hidden="true" />
    case 'Palette': return <Palette size={size} aria-hidden="true" />
    case 'Scale': return <Scale size={size} aria-hidden="true" />
    default: return <Layers size={size} aria-hidden="true" />
  }
}
