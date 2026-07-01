import { describe, expect, it } from 'vitest'
import { isValidUsername, normalizeUsername } from './username'

describe('username rules', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizeUsername('  Kasir1  ')).toBe('kasir1')
  })

  it.each([
    ['ab', false],
    ['abc', true],
    ['a'.repeat(32), true],
    ['a'.repeat(33), false],
    ['kasir 1', false],
    ['kasir_1', false],
    ['kasir-1', false],
  ])('validates %s', (username, expected) => {
    expect(isValidUsername(username)).toBe(expected)
  })
})
