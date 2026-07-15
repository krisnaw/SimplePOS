import {Field, FieldError, FieldGroup, FieldLabel} from '@/renderer/components/ui/field'
import {Input} from '@/renderer/components/ui/input'

export type VehicleIdentityField = 'model' | 'brand' | 'plateNumber'

export type VehicleIdentityValue = Record<VehicleIdentityField, string>

type VehicleIdentityFieldsProps = {
  idPrefix: string
  value: VehicleIdentityValue
  labels: Record<VehicleIdentityField, string>
  placeholders: Record<VehicleIdentityField, string>
  onChange: (field: VehicleIdentityField, value: string) => void
  requiredFields?: VehicleIdentityField[]
  errors?: Partial<Record<VehicleIdentityField, string>>
  autoFocusField?: VehicleIdentityField
}

function RequiredMark() {
  return <span className="text-destructive" aria-hidden="true">*</span>
}

export function VehicleIdentityFields({
  idPrefix,
  value,
  labels,
  placeholders,
  onChange,
  requiredFields = ['model', 'plateNumber'],
  errors = {},
  autoFocusField,
}: VehicleIdentityFieldsProps) {
  const isRequired = (field: VehicleIdentityField) => requiredFields.includes(field)

  return (
    <FieldGroup className="grid gap-3 sm:grid-cols-2">
      <Field className="sm:col-span-2" data-invalid={Boolean(errors.model)}>
        <FieldLabel htmlFor={`${idPrefix}-model`}>
          {labels.model} {isRequired('model') ? <RequiredMark /> : null}
        </FieldLabel>
        <Input
          id={`${idPrefix}-model`}
          value={value.model}
          onChange={(event) => onChange('model', event.target.value)}
          placeholder={placeholders.model}
          required={isRequired('model')}
          aria-invalid={Boolean(errors.model)}
          autoFocus={autoFocusField === 'model'}
        />
        <FieldError>{errors.model}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.brand)}>
        <FieldLabel htmlFor={`${idPrefix}-brand`}>
          {labels.brand} {isRequired('brand') ? <RequiredMark /> : null}
        </FieldLabel>
        <Input
          id={`${idPrefix}-brand`}
          value={value.brand}
          onChange={(event) => onChange('brand', event.target.value)}
          placeholder={placeholders.brand}
          required={isRequired('brand')}
          aria-invalid={Boolean(errors.brand)}
          autoFocus={autoFocusField === 'brand'}
        />
        <FieldError>{errors.brand}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.plateNumber)}>
        <FieldLabel htmlFor={`${idPrefix}-plateNumber`}>
          {labels.plateNumber} {isRequired('plateNumber') ? <RequiredMark /> : null}
        </FieldLabel>
        <Input
          id={`${idPrefix}-plateNumber`}
          value={value.plateNumber}
          onChange={(event) => onChange('plateNumber', event.target.value)}
          placeholder={placeholders.plateNumber}
          required={isRequired('plateNumber')}
          className="uppercase tabular-nums"
          aria-invalid={Boolean(errors.plateNumber)}
          autoFocus={autoFocusField === 'plateNumber'}
        />
        <FieldError>{errors.plateNumber}</FieldError>
      </Field>
    </FieldGroup>
  )
}
