/**
 * Zod (or any Standard Schema library: Valibot, ArkType, …) for field-level and form-level validation.
 */
import { z } from 'zod'
import {
  createField,
  createForm,
  createStandardSchemaValidate,
  useController,
  useGetPropsForField,
} from 'react-functional-form'
import { Button, Debug, TextInput } from '../components/ui'
import { notify } from '../components/fakeApi'

// Field-level schemas. The value types are inferred from them.
const schema = createForm([
  ['username', createField(z.string().min(3, 'At least 3 characters'))],
  ['age', createField(z.coerce.number().int().min(18, 'You must be an adult'))],
  ['password', createField(z.string().min(8, 'At least 8 characters'))],
  ['confirmPassword', createField(z.string())],
])

// A form-level schema for rules that involve several fields. Issues are mapped to fields by path.
const validate = createStandardSchemaValidate(
  z
    .object({ password: z.string().optional(), confirmPassword: z.string().optional() })
    .refine((values) => values.password === values.confirmPassword, {
      path: ['confirmPassword'],
      message: "Passwords don't match",
    }),
)

export default function ZodValidation() {
  const form = useController({
    schema,
    validate,
    onSubmit: (values) => notify(JSON.stringify(values, null, 2)),
  })
  const getPropsForField = useGetPropsForField(form)

  return (
    <>
      <form onSubmit={form.onSubmit} noValidate>
        <TextInput label="Username" {...getPropsForField('username')} />
        <TextInput label="Age" type="number" {...getPropsForField('age')} />
        <TextInput label="Password" type="password" {...getPropsForField('password')} />
        <TextInput
          label="Confirm password"
          type="password"
          {...getPropsForField('confirmPassword')}
        />
        <Button type="submit">Submit</Button>
      </form>
      <Debug data={{ values: form.values, validationResult: form.validationResult }} />
    </>
  )
}
