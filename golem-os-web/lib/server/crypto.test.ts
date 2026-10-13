import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decrypt, encrypt } from './crypto'

const KEY = randomBytes(32).toString('base64')

describe('token encryption', () => {
  it('round-trips and never contains the plaintext', () => {
    const c = encrypt('1//refresh-token-abc', KEY)
    expect(c).not.toContain('refresh-token')
    expect(c.startsWith('v1.')).toBe(true)
    expect(decrypt(c, KEY)).toBe('1//refresh-token-abc')
  })

  it('uses a fresh IV each time', () => {
    expect(encrypt('same', KEY)).not.toBe(encrypt('same', KEY))
  })

  it('rejects tampered ciphertext, tag, and a different key', () => {
    const c = encrypt('secret', KEY)
    const [v, iv, tag, data] = c.split('.')
    const flip = (s: string) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1)
    expect(() => decrypt([v, iv, tag, flip(data)].join('.'), KEY)).toThrow()
    expect(() => decrypt([v, iv, flip(tag), data].join('.'), KEY)).toThrow()
    expect(() => decrypt(c, randomBytes(32).toString('base64'))).toThrow()
  })

  it('rejects malformed input and bad keys', () => {
    expect(() => decrypt('garbage', KEY)).toThrow()
    expect(() => decrypt('v2.a.b.c', KEY)).toThrow()
    expect(() => encrypt('x', undefined)).toThrow('GOOGLE_TOKEN_KEY is not set')
    expect(() => encrypt('x', Buffer.from('short').toString('base64'))).toThrow('32 bytes')
  })
})
