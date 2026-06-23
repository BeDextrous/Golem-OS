import { PillarNav } from '@/components/layout/pillar-nav'

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PillarNav pillar="work" />
      {children}
    </>
  )
}
