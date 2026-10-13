import type { ActionResult } from '@/app/actions/crud'

/** Return the data from a server action result, or throw its error message. */
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.data
}
