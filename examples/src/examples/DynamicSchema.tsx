/**
 * A schema that depends on the values: the contact field changes with the chosen contact method.
 * `useFormState` creates the form state before the controller, so the schema can be built from it.
 */
import { useMemo } from 'react'
import {
  createField,
  createForm,
  requiredValidator,
  useController,
  useGetPropsForField,
  useFormState,
} from 'react-functional-form'
import { Button, Debug, Select, TextInput } from '../components/ui'
import { notify } from '../components/fakeApi'

type ContactMethod = 'email' | 'phone'

const buildSchema = (contactMethod?: ContactMethod) =>
  createForm({
    name: createField<string>([requiredValidator]),
    contactMethod: createField<ContactMethod>([requiredValidator]),
    // Fields that are `undefined` are left out. Their values are typed `string | undefined`.
    email: contactMethod === 'phone' ? undefined : createField<string>([requiredValidator]),
    phone: contactMethod === 'phone' ? createField<string>([requiredValidator]) : undefined,
  })

export default function DynamicSchema() {
  const initialValues = { contactMethod: 'email' as ContactMethod }
  const formState = useFormState({
    schema: buildSchema(initialValues.contactMethod),
    initialValues,
  })
  const [values] = formState.valuesStateHook
  const schema = useMemo(() => buildSchema(values?.contactMethod), [values?.contactMethod])
  const form = useController({
    ...formState,
    schema,
    onSubmit: (values) => notify(JSON.stringify(values, null, 2)),
  })
  const getPropsForField = useGetPropsForField(form)

  return (
    <>
      <form onSubmit={form.onSubmit} noValidate>
        <TextInput label="Name" {...getPropsForField('name')} />
        <Select
          label="Contact me by"
          options={[
            { value: 'email', label: 'Email' },
            { value: 'phone', label: 'Phone' },
          ]}
          {...getPropsForField('contactMethod')}
        />
        {form.values.contactMethod === 'phone' ? (
          <TextInput label="Phone" type="tel" {...getPropsForField('phone')} />
        ) : (
          <TextInput label="Email" type="email" {...getPropsForField('email')} />
        )}
        <Button type="submit">Submit</Button>
      </form>
      <Debug data={{ values: form.values, validationResult: form.validationResult }} />
    </>
  )
}
