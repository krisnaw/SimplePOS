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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/renderer/components/ui/field'
import { Input } from '@/renderer/components/ui/input'
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

          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={Boolean(errors.plateNumber)}>
              <FieldLabel htmlFor="new-vehicle-plate">{t('sales.plateNumber')}</FieldLabel>
              <Input
                id="new-vehicle-plate"
                value={plate}
                onChange={(event) => {
                  onFormChange({
                    plate: event.target.value,
                    errors: { ...errors, plateNumber: undefined },
                  })
                }}
                placeholder="DK1234"
                className="uppercase tabular-nums"
                aria-invalid={Boolean(errors.plateNumber)}
                autoFocus
              />
              <FieldError>{errors.plateNumber}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.model)}>
              <FieldLabel htmlFor="new-vehicle-name">{t('sales.model')}</FieldLabel>
              <Input
                id="new-vehicle-name"
                value={model}
                onChange={(event) => {
                  onFormChange({
                    model: event.target.value,
                    errors: { ...errors, model: undefined },
                  })
                }}
                placeholder="Avanza"
                aria-invalid={Boolean(errors.model)}
              />
              <FieldError>{errors.model}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="new-vehicle-brand">{t('sales.brandOptional')}</FieldLabel>
              <Input
                id="new-vehicle-brand"
                value={brand}
                onChange={(event) => onFormChange({ brand: event.target.value })}
                placeholder="Toyota"
              />
            </Field>

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
