import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Pulls a Drive folder ID out of a pasted Drive URL, or passes through a bare ID. */
export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (urlMatch) return urlMatch[1]
  const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParam) return idParam[1]
  // Bare folder ID (Drive IDs are alphanumeric plus - and _, generally 20+ chars)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed
  return null
}

export const APP_TZ = 'America/New_York'

/** Today as YYYY-MM-DD in the app timezone (toISOString() is UTC and flips a day early in the evening). */
export function todayStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

/** Current month as YYYY-MM in the app timezone. */
export function thisMonthStr(now: Date = new Date()): string {
  return todayStr(now).slice(0, 7)
}

/** Hour of day (0-23) in the app timezone. */
export function hourInAppTz(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ, hour: 'numeric', hour12: false,
  }).format(now)) % 24
}
