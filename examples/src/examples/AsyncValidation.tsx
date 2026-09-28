/**
 * A validator that calls a server. The controller exposes `isValidating` and waits for it on submit.
 */
import {
  createField,
  createForm,
  createValidator,
  requiredValidator,
  useController,
  useGetPropsForField,
} from 'react-functional-form'
import { Button, TextInput } from '../components/ui'
import { api, notify } from '../components/fakeApi'

const isAvailable = createValidator(async (username: string) =>
  (await api.isUsernameTaken(username)) ? 'That username is taken' : undefined,
)

const schema = createForm({ username: createField<string>([requiredValidator, isAvailable]) })

export default function AsyncValidation() {
  const form = useController({
    schema,
    mode: 'onChange',
    mapError: (error: string) => (error === 'Required' ? 'Pick a username' : error),
    onSubmit: (values) => notify(`Welcome, ${values.username}!`),
  })
  const getPropsForField = useGetPropsForField(form)

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <TextInput
        label="Username"
        hint={form.isValidating ? 'Checking availability…' : 'Try "admin" or "root"'}
        {...getPropsForField('username')}
      />
      <Button type="submit" disabled={form.isValidating || form.submitState.isSubmitting}>
        Create account
      </Button>
    </form>
  )
}
