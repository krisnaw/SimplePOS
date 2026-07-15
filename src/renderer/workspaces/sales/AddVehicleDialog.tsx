import { type SubmitEvent } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/renderer/components/ui/field'
import { Input } from '@/renderer/components/ui/input'
import {VehicleIdentityFields, type VehicleIdentityField} from '@/renderer/components/VehicleIdentityFields'
import type { NewVehicleFormState } from './SalesWorkspace.types'

const pressableClass =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]'

type AddVehicleDialogProps = {
  open: boolean
  form: NewVehicleFormState
  onOpen: () => void
  onClose: () => void
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void | Promise<void>
  onCancel: () => void
  onFormChange: (patch: Partial<NewVehicleFormState>) => void
}

export function AddVehicleDialog({
  open,
  form,
  onOpen,
  onClose,
  onSubmit,
  onCancel,
  onFormChange,
}: AddVehicleDialogProps) {
  const { t } = useTranslation()
  const { plate, brand, model, customerName, customerPhone, errors } = form

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpen()
          return
        }
        onClose()
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" size="sm" className={pressableClass} />
        }
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        {t('sales.createNewVehicle')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form className="flex flex-col gap-4" onSubmit={(event) => { void onSubmit(event) }}>
          <DialogHeader>
            <DialogTitle>{t('sales.createNewVehicle')}</DialogTitle>
            <DialogDescription>
              {t('sales.addVehicleTemporaryHint')}
            </DialogDescription>
          </DialogHeader>

          <VehicleIdentityFields
            idPrefix="sales-vehicle"
            value={{model, brand, plateNumber: plate}}
            labels={{
              model: t('sales.model'),
              brand: t('sales.brandOptional'),
              plateNumber: t('sales.plateNumber'),
            }}
            placeholders={{model: 'Avanza', brand: 'Toyota', plateNumber: 'DK1234'}}
            errors={errors}
            autoFocusField="model"
            onChange={(field: VehicleIdentityField, value) => {
              if (field === 'plateNumber') {
                onFormChange({plate: value, errors: {...errors, plateNumber: undefined}})
                return
              }
              onFormChange({[field]: value, errors: {...errors, [field]: undefined}})
            }}
          />

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="new-customer-name">{t('sales.customerNameOptional')}</FieldLabel>
              <Input
                id="new-customer-name"
                value={customerName}
                onChange={(event) => onFormChange({ customerName: event.target.value })}
                placeholder={t('sales.customerNamePlaceholder')}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="new-customer-phone">{t('sales.phoneOptional')}</FieldLabel>
              <Input
                id="new-customer-phone"
                value={customerPhone}
                onChange={(event) => onFormChange({ customerPhone: event.target.value })}
                placeholder="08123456789"
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent p-0">
            <Button type="button" variant="outline" className={pressableClass} onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className={pressableClass}>
              {t('sales.createNewVehicle')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
