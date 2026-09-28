/**
 * Errors returned by the server, shown on the fields with `setErrors`. They clear when the field changes.
 */
import {
  createField,
  createForm,
  requiredValidator,
  useController,
  useGetPropsForField,
} from 'react-functional-form'
import { Button, TextInput } from '../components/ui'
import { api, notify } from '../components/fakeApi'

const schema = createForm({
  email: createField<string>([requiredValidator]),
  password: createField<string>([requiredValidator]),
})

export default function ServerErrors() {
  const form = useController({
    schema,
    onSubmit: async (values) => {
      try {
        await api.register(values)
        notify('Registered!')
      } catch (error: any) {
        form.setErrors(error.fieldErrors)
      }
    },
  })
  const getPropsForField = useGetPropsForField(form)

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <TextInput label="Email" hint="Try ada@example.com" {...getPropsForField('email')} />
      <TextInput label="Password" type="password" {...getPropsForField('password')} />
      <Button type="submit" disabled={form.submitState.isSubmitting}>
        {form.submitState.isSubmitting ? 'Registering…' : 'Register'}
      </Button>
    </form>
  )
}
