/**
 * Reusable sub-forms: `AddressForm` has its own schema and controller, and is used twice by the parent.
 * Its state lives in the parent form and its events bubble up.
 */
import {
  createField,
  createForm,
  requiredValidator,
  useController,
  useGetPropsForField,
  useGetPropsForNestedForm,
  type ControllerProps,
} from 'react-functional-form'
import { Button, Debug, TextInput } from '../components/ui'
import { notify } from '../components/fakeApi'

const addressSchema = createForm([
  ['street', createField<string>([requiredValidator])],
  ['city', createField<string>([requiredValidator])],
])

function AddressForm({
  title,
  propsForForm,
}: {
  title: string
  propsForForm: ControllerProps<typeof addressSchema>
}) {
  const form = useController(propsForForm)
  const getPropsForField = useGetPropsForField(form)

  return (
    <fieldset className="rff-fieldset">
      <legend>{title}</legend>
      <TextInput label="Street" {...getPropsForField('street')} />
      <TextInput label="City" {...getPropsForField('city')} />
    </fieldset>
  )
}

const schema = createForm([
  ['name', createField<string>([requiredValidator])],
  ['billing', addressSchema],
  ['shipping', addressSchema],
])

export default function NestedForms() {
  const form = useController({
    schema,
    onSubmit: (values) => notify(JSON.stringify(values, null, 2)),
  })
  const getPropsForField = useGetPropsForField(form)
  const getPropsForNestedForm = useGetPropsForNestedForm(form)

  return (
    <>
      <form onSubmit={form.onSubmit} noValidate>
        <TextInput label="Name" {...getPropsForField('name')} />
        <AddressForm title="Billing address" propsForForm={getPropsForNestedForm('billing')} />
        <AddressForm title="Shipping address" propsForForm={getPropsForNestedForm('shipping')} />
        <Button type="submit">Submit</Button>
      </form>
      <Debug data={{ values: form.values, touched: form.touched }} />
    </>
  )
}
