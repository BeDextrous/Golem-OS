import { PillarNav } from '@/components/layout/pillar-nav'

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PillarNav pillar="life" />
      {children}
    </>
  )
}
