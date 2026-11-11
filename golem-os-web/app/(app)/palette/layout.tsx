import { PillarNav } from '@/components/layout/pillar-nav'

export default function PaletteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PillarNav pillar="palette" />
      {children}
    </>
  )
}
