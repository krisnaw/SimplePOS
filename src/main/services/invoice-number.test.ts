import {describe, expect, it} from 'vitest'
import {createInvoiceNumber} from './checkout.service'

describe('invoice number generation', () => {
  const checkoutDate = new Date(2026, 6, 14, 23, 30)

  it('starts each local day at 01', () => {
    expect(createInvoiceNumber(checkoutDate, [])).toBe('INV-20260714-01')
  })

  it('increments the highest sequence for that day', () => {
    expect(createInvoiceNumber(checkoutDate, [
      'INV-20260714-01',
      'INV-20260714-03',
      'INV-20260713-99',
      'INV-20260714055426-736',
    ])).toBe('INV-20260714-04')
  })

  it('continues beyond two digits without producing duplicates', () => {
    expect(createInvoiceNumber(checkoutDate, ['INV-20260714-99'])).toBe('INV-20260714-100')
  })
})
