import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM with a random 12-byte IV per message.
// Format: v1.<iv>.<tag>.<ciphertext>  (base64url parts)
const VERSION = 'v1'

function keyFrom(secret: string | undefined): Buffer {
  if (!secret) throw new Error('GOOGLE_TOKEN_KEY is not set')
  const key = Buffer.from(secret, 'base64')
  if (key.length !== 32) throw new Error('GOOGLE_TOKEN_KEY must be 32 bytes, base64 encoded')
  return key
}

export function encrypt(plaintext: string, secret = process.env.GOOGLE_TOKEN_KEY): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [VERSION, iv, cipher.getAuthTag(), data].map((p, i) => (i === 0 ? p : (p as Buffer).toString('base64url'))).join('.')
}

/** Throws if the value was tampered with, was encrypted with another key, or is malformed. */
export function decrypt(payload: string, secret = process.env.GOOGLE_TOKEN_KEY): string {
  const [version, iv, tag, data] = payload.split('.')
  if (version !== VERSION || !iv || !tag || !data) throw new Error('Unrecognised ciphertext')
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}
