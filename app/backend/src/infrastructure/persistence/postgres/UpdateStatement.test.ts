import { describe, it, expect } from 'vitest'
import { buildAssignments } from './UpdateStatement.js'

// No database needed: this is string and placeholder arithmetic, which is
// precisely the part of models/Task.js's hand-rolled `paramCount` loop that
// was previously only exercisable through a real UPDATE.

describe('buildAssignments', () => {
  it('numbers placeholders in the order the columns are given', () => {
    const { clause, values } = buildAssignments({ title: 'New', status: 'todo' })

    expect(clause).toBe('title = $1, status = $2')
    expect(values).toEqual(['New', 'todo'])
  })

  it('skips undefined values, so an unmentioned column is left alone', () => {
    const { clause, values } = buildAssignments({
      title: 'New',
      description: undefined,
      status: 'todo',
    })

    expect(clause).toBe('title = $1, status = $2')
    expect(values).toEqual(['New', 'todo'])
  })

  it('treats null as a value, so a nullable column can be cleared', () => {
    const { clause, values } = buildAssignments({ description: null })

    expect(clause).toBe('description = $1')
    expect(values).toEqual([null])
  })

  it('reports the next free placeholder for the WHERE clause that follows', () => {
    const { nextIndex } = buildAssignments({ title: 'New', status: 'todo' })

    expect(nextIndex).toBe(3)
  })

  it('continues from a caller-supplied starting index', () => {
    const { clause, nextIndex } = buildAssignments({ title: 'New' }, 4)

    expect(clause).toBe('title = $4')
    expect(nextIndex).toBe(5)
  })

  it('produces an empty clause when nothing is set', () => {
    const { clause, values, nextIndex } = buildAssignments({ title: undefined })

    // The caller has to notice this rather than emit `SET  WHERE ...`.
    expect(clause).toBe('')
    expect(values).toEqual([])
    expect(nextIndex).toBe(1)
  })
})
