# react-functional-form

[![npm](https://img.shields.io/npm/v/react-functional-form)](https://www.npmjs.com/package/react-functional-form)
[![CI](https://github.com/feego/react-functional-form/actions/workflows/ci.yml/badge.svg)](https://github.com/feego/react-functional-form/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/react-functional-form)](./LICENSE)

Schema-first, fully controlled, composable forms for React.

- **Schema first.** Describe a form once with `createForm`, `createField` and `createList`. Initial state,
  validation and TypeScript types come from it.
- **Fully controlled.** Form state is plain React state that you can own, lift, persist or inspect.
- **Composable.** Nested forms are forms: build an `AddressForm` once and plug it into any parent.
- **Validation your way.** Chainable validators, async validation, and any
  [Standard Schema](https://standardschema.dev) library: Zod, Valibot, ArkType.
- **Everything a form needs.** Field arrays, submit state, dirty tracking, reset, server errors, validation
  modes, focus on error, context.
- **Small.** ~6 kB, zero dependencies, React 16.8+.

**[Documentation & live demos →](https://feego.github.io/react-functional-form)** · **[Examples →](./examples)**

## Install

```sh
npm install react-functional-form
```

## Example

```tsx
import {
  createField,
  createForm,
  createMatchesFieldValidator,
  createMinLengthValidator,
  requiredValidator,
  useController,
  useGetPropsForField,
} from 'react-functional-form'

const schema = createForm([
  ['email', createField<string>([requiredValidator])],
  ['password', createField<string>([requiredValidator, createMinLengthValidator(8)])],
  ['confirmPassword', createField<string>([createMatchesFieldValidator('password')])],
])

function SignUpForm() {
  const form = useController({
    schema,
    onSubmit: async (values) => {
      await api.signUp(values) // { email: string; password: string; confirmPassword: string }
    },
  })
  const getPropsForField = useGetPropsForField(form)

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <TextInput label="Email" {...getPropsForField('email')} />
      <TextInput label="Password" type="password" {...getPropsForField('password')} />
      <TextInput
        label="Confirm password"
        type="password"
        {...getPropsForField('confirmPassword')}
      />
      <button disabled={form.submitState.isSubmitting}>Sign up</button>
    </form>
  )
}
```

`getPropsForField(name)` returns `name`, `value`, `error`, `onChange`, `onFocus` and `onBlur`. Errors show
once a field is blurred, and submitting touches every field.

### With Zod (or Valibot, ArkType…)

```ts
import { z } from 'zod'

const schema = createForm([
  ['email', createField(z.string().email('Enter a valid email'))], // type inferred: string
  ['password', createField(z.string().min(8))],
  ['confirmPassword', createField(z.string())],
])

// Rules across fields: validate the whole form with a schema
const form = useController({
  schema,
  validate: createStandardSchemaValidate(
    z
      .object({ password: z.string(), confirmPassword: z.string() })
      .refine((v) => v.password === v.confirmPassword, {
        path: ['confirmPassword'],
        message: "Passwords don't match",
      }),
  ),
})
```

### Nested forms

```tsx
const addressSchema = createForm([
  ['street', createField<string>([requiredValidator])],
  ['city', createField<string>([requiredValidator])],
])

function AddressForm({ propsForForm }: { propsForForm: ControllerProps<typeof addressSchema> }) {
  const form = useController(propsForForm)
  const getPropsForField = useGetPropsForField(form)
  return (
    <>
      <TextInput label="Street" {...getPropsForField('street')} />
      <TextInput label="City" {...getPropsForField('city')} />
    </>
  )
}

// In the parent:
const schema = createForm([['billing', addressSchema], ['shipping', addressSchema]])
const getPropsForNestedForm = useGetPropsForNestedForm(form)

<AddressForm propsForForm={getPropsForNestedForm('billing')} />
<AddressForm propsForForm={getPropsForNestedForm('shipping')} />
```

### Field arrays

```tsx
const schema = createForm([
  ['members', createList(memberSchema, [createMinLengthValidator(1, 'Add a member')])],
])

const members = useController(useGetPropsForNestedForm(form)('members'))
const { items, append, remove, move } = useFieldArray(members)
const getPropsForMember = useGetPropsForNestedForm(members)

items.map(({ key, index }) => (
  <MemberForm key={key} propsForForm={getPropsForMember(index)} onRemove={() => remove(index)} />
))
```

## More examples

The [`examples`](./examples) folder is a runnable app with one self-contained file per use case: sign-up
form, Zod validation, nested forms, field arrays, async validation, server errors, edit form with dirty
state, native inputs, a schema built from the values, a draft persisted to localStorage, and form context.

```sh
pnpm install && pnpm build && pnpm examples:dev
```

## Features

|                  |                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| Schemas          | `createForm`, `createField`, `createList`, with inferred TypeScript types                                      |
| Validation       | Validator chains, built-ins (`required`, min/max, length, regex, matches field), `createValidator`, `optional` |
| Schema libraries | Standard Schema per field (`createField(z.string())`) or per form (`createStandardSchemaValidate`)             |
| Async validation | Async validators, `isValidating`, awaited on submit                                                            |
| Submission       | `onSubmit`/`onInvalid`, `isSubmitting`, `isSubmitted`, `isSubmitSuccessful`, `submitCount`, `submitError`      |
| State            | `isDirty`/`dirty`, `reset(values?)`, `touched`, `visited`, `getFieldState`                                     |
| Errors           | `setErrors`/`clearErrors`, declarative `additionalErrors`                                                      |
| Behavior         | Validation modes (`onBlur`, `onChange`, `onSubmit`), `trigger`, `setFieldValue`, focus on error                |
| Composition      | Nested forms, field arrays, `FormProvider`/`useFormContext`, lifted state hooks                                |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © Rui Monteiro
