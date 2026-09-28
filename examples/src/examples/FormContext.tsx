/**
 * `FormProvider` shares the controller with deeply nested components, without passing it down.
 */
import {
  createField,
  createForm,
  FormProvider,
  requiredValidator,
  useController,
  useFormContext,
  useGetPropsForField,
} from 'react-functional-form'
import { Button, TextInput } from '../components/ui'
import { notify, wait } from '../components/fakeApi'

const schema = createForm({
  firstName: createField<string>([requiredValidator]),
  lastName: createField<string>([requiredValidator]),
})

function NameField({ name, label }: { name: 'firstName' | 'lastName'; label: string }) {
  const form = useFormContext<typeof schema>()
  const getPropsForField = useGetPropsForField(form)
  return <TextInput label={label} {...getPropsForField(name)} />
}

function SubmitButton() {
  const { submitState, isDirty } = useFormContext<typeof schema>()
  return (
    <Button type="submit" disabled={!isDirty || submitState.isSubmitting}>
      {submitState.isSubmitting ? 'Saving…' : 'Save'}
    </Button>
  )
}

export default function FormContext() {
  const form = useController({
    schema,
    onSubmit: async (values) => {
      await wait(500)
      notify(`Hello, ${values.firstName} ${values.lastName}`)
    },
  })

  return (
    <FormProvider form={form}>
      <form onSubmit={form.onSubmit} noValidate>
        <NameField name="firstName" label="First name" />
        <NameField name="lastName" label="Last name" />
        <SubmitButton />
      </form>
    </FormProvider>
  )
}
