'use client'
import { useCallback, useSyncExternalStore } from 'react'

const EVENT = 'golem:local-storage'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)   // other tabs
  window.addEventListener(EVENT, callback)       // this tab
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENT, callback)
  }
}

function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null } // private mode / blocked storage
}

/**
 * A localStorage string that is `null` on the server and on the first client render
 * (so hydration matches), then the stored value. Updates in any tab re-render consumers.
 */
export function useLocalStorage(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null)
  const set = useCallback((next: string) => {
    try { localStorage.setItem(key, next) } catch { /* ignore */ }
    window.dispatchEvent(new Event(EVENT))
  }, [key])
  return [value, set]
}
