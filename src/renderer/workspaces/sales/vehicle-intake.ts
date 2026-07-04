export type ParsedVehicleInput = {
  plateNumber: string
  model: string
}

export function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function normalizePlateNumber(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function parseVehicleInput(value: string): ParsedVehicleInput {
  const tokens = value.trim().split(/\s+/).filter(Boolean)
  const [firstToken = '', secondToken = '', thirdToken = ''] = tokens

  if (/^[A-Z]{1,2}$/i.test(firstToken) && /^\d{1,4}$/.test(secondToken)) {
    const hasSeparateSuffix = /^[A-Z]{1,3}$/.test(thirdToken)
    const plateTokens = hasSeparateSuffix ? tokens.slice(0, 3) : tokens.slice(0, 2)

    return {
      plateNumber: normalizePlateNumber(plateTokens.join('')),
      model: tokens.slice(hasSeparateSuffix ? 3 : 2).join(' '),
    }
  }

  if (/^[A-Z]{1,2}\d{1,4}[A-Z]{0,3}$/i.test(firstToken)) {
    return {
      plateNumber: normalizePlateNumber(firstToken),
      model: tokens.slice(1).join(' '),
    }
  }

  return {
    plateNumber: '',
    model: tokens.join(' '),
  }
}
