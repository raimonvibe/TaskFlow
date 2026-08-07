export interface Assignments {
  /** e.g. `title = $1, status = $2` - empty when nothing was set. */
  readonly clause: string
  readonly values: readonly unknown[]
  /** The next free placeholder number, for the WHERE clause that follows. */
  readonly nextIndex: number
}

/**
 * Builds the `SET` half of a dynamic `UPDATE`, numbering placeholders as it
 * goes.
 *
 * Both `models/User.js` and `models/Task.js` hand-rolled this, each with
 * its own `paramCount` counter and its own `allowedFields.includes()`
 * whitelist (docs/BACKEND_REWRITE_PLAN.md §1). The whitelist existed
 * because those functions were handed `req.body` directly and had to defend
 * against a client naming any column it liked. This helper has no
 * whitelist and needs none: its callers are repositories passing a literal
 * object of known columns, so a client-supplied key has no route into the
 * `columns` argument in the first place.
 *
 * Column names are interpolated into SQL - values never are. That asymmetry
 * is the reason the previous paragraph matters, and the reason this
 * function is not exported outside the persistence layer.
 *
 * A `undefined` value means "not being changed" and is skipped; `null` is a
 * real value and produces `column = NULL`, which is how a nullable field
 * gets cleared.
 */
export function buildAssignments(
  columns: Readonly<Record<string, unknown>>,
  startIndex = 1
): Assignments {
  const parts: string[] = []
  const values: unknown[] = []
  let index = startIndex

  for (const [column, value] of Object.entries(columns)) {
    if (value === undefined) continue

    parts.push(`${column} = $${index}`)
    values.push(value)
    index += 1
  }

  return { clause: parts.join(', '), values, nextIndex: index }
}
