import { PillarNav } from '@/components/layout/pillar-nav'

export default function PagemasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PillarNav pillar="pagemaster" />
      {children}
    </>
  )
}
