/**
 * The basics: a schema with validators, a controller, field props, error messages and submit state.
 */
import {
  createField,
  createForm,
  createMatchesFieldValidator,
  createMinLengthValidator,
  createRegexValidator,
  Errors,
  optional,
  requiredValidator,
  useController,
  useGetPropsForField,
} from 'react-functional-form'
import { Button, Debug, TextInput } from '../components/ui'
import { notify, wait } from '../components/fakeApi'

const schema = createForm([
  [
    'email',
    createField<string>([
      requiredValidator,
      optional(createRegexValidator(/^\S+@\S+$/, 'InvalidEmail')),
    ]),
  ],
  ['password', createField<string>([requiredValidator, createMinLengthValidator(8)])],
  ['confirmPassword', createField<string>([createMatchesFieldValidator('password')])],
])

// Validators return error codes; the UI decides how to phrase them.
const messages: Record<string, string> = {
  [Errors.Required]: 'This field is required',
  [Errors.TooShort]: 'Use at least 8 characters',
  [Errors.Mismatch]: "Passwords don't match",
  InvalidEmail: 'Enter a valid email',
}

export default function SignUpForm() {
  const form = useController({
    schema,
    onSubmit: async (values) => {
      await wait(800)
      notify(`Signed up as ${values.email}`)
    },
  })
  const getPropsForField = useGetPropsForField(form, (error) => error && messages[error])

  return (
    <>
      <form onSubmit={form.onSubmit} noValidate>
        <TextInput label="Email" {...getPropsForField('email')} />
        <TextInput label="Password" type="password" {...getPropsForField('password')} />
        <TextInput
          label="Confirm password"
          type="password"
          {...getPropsForField('confirmPassword')}
        />
        <Button type="submit" disabled={form.submitState.isSubmitting}>
          {form.submitState.isSubmitting ? 'Signing up…' : 'Sign up'}
        </Button>
      </form>
      <Debug
        data={{
          values: form.values,
          touched: form.touched,
          isValid: form.validationResult[0],
          submitState: form.submitState,
        }}
      />
    </>
  )
}
