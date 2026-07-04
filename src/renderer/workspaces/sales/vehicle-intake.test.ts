import { describe, expect, it } from 'vitest'
import {
  normalizePlateNumber,
  normalizeSearchText,
  parseVehicleInput,
} from './vehicle-intake'

describe('normalizePlateNumber', () => {
  it('removes whitespace and normalizes case', () => {
    expect(normalizePlateNumber(' dk  1234 ab ')).toBe('DK1234AB')
  })
})

describe('normalizeSearchText', () => {
  it('collapses whitespace and normalizes case', () => {
    expect(normalizeSearchText('  Toyota   Avanza ')).toBe('TOYOTA AVANZA')
  })
})

describe('parseVehicleInput', () => {
  it.each([
    ['DK1234 Avanza', 'DK1234', 'Avanza'],
    ['DK 1234 Avanza', 'DK1234', 'Avanza'],
    ['DK1234AB Avanza', 'DK1234AB', 'Avanza'],
    ['DK 1234 AB Avanza', 'DK1234AB', 'Avanza'],
    ['  dk1234   avanza  ', 'DK1234', 'avanza'],
    ['Avanza', '', 'Avanza'],
  ])('parses %s', (input, plateNumber, model) => {
    expect(parseVehicleInput(input)).toEqual({ plateNumber, model })
  })

  it('does not treat a lowercase separate suffix as part of the plate', () => {
    expect(parseVehicleInput('DK 1234 ab Avanza')).toEqual({
      plateNumber: 'DK1234',
      model: 'ab Avanza',
    })
  })
})
