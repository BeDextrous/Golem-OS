'use client'
import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/** false during SSR and hydration, true afterwards: for UI that depends on browser-only state (e.g. the theme). */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false)
}
