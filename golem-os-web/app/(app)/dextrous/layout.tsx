import { PillarNav } from '@/components/layout/pillar-nav'

export default function DextrousLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PillarNav pillar="dextrous" />
      {children}
    </>
  )
}
