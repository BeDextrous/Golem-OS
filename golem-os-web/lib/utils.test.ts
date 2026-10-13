import { describe, expect, it } from 'vitest'
import { extractDriveFolderId, hourInAppTz, thisMonthStr, todayStr } from './utils'

describe('app-timezone date helpers', () => {
  it('uses New York, not UTC, for the calendar day', () => {
    // 02:00 UTC on Oct 12 is 22:00 EDT on Oct 11
    const d = new Date('2026-10-12T02:00:00Z')
    expect(todayStr(d)).toBe('2026-10-11')
    expect(hourInAppTz(d)).toBe(22)
  })

  it('rolls over at local midnight', () => {
    expect(todayStr(new Date('2026-10-12T04:00:00Z'))).toBe('2026-10-12') // 00:00 EDT
    expect(hourInAppTz(new Date('2026-10-12T04:30:00Z'))).toBe(0)
  })

  it('handles standard time (EST)', () => {
    expect(todayStr(new Date('2026-12-01T04:30:00Z'))).toBe('2026-11-30')
  })

  it('thisMonthStr crosses month boundaries in local time', () => {
    expect(thisMonthStr(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10')
  })
})

describe('extractDriveFolderId', () => {
  it('pulls the id from a folder URL', () => {
    expect(extractDriveFolderId('https://drive.google.com/drive/folders/1AbC_dEf-12345?usp=sharing')).toBe('1AbC_dEf-12345')
  })
  it('accepts a bare id and rejects junk', () => {
    expect(extractDriveFolderId('1AbC_dEf-12345')).toBe('1AbC_dEf-12345')
    expect(extractDriveFolderId('nope')).toBeNull()
    expect(extractDriveFolderId('  ')).toBeNull()
  })
})
