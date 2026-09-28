---
title: TypeScript
description: How types are inferred from your schema, and how to get the most out of them.
---

You declare types in exactly one place: **the fields of your schema**. Everything else (values, initial
values, `onSubmit`, field props, nested forms, list items, validation results) is inferred from the
schema.

```ts
const schema = createForm({
  email: createField<string>([requiredValidator]),
  age: createField<number>(),
  address: createForm({ city: createField<string>() }),
  tags: createList(createField<string>()),
})

type Values = ValuesOf<typeof schema>
// {
//   email: string
//   age: number
//   address: { city: string }
//   tags: string[]
// }

const form = useController({
  schema,
  initialValues: { address: { city: 'Lisbon' } }, // checked against Values (deeply partial)
  onSubmit: (values) => api.save(values), // values: Values
})
```

TypeScript 5.4 or newer is required.

## Field types

A field's value type comes from one of three places.

| You write                          | Value type                            |
| ---------------------------------- | ------------------------------------- |
| `createField<string>([...])`       | `string`, from the type argument      |
| `createField(z.string().email())`  | `string`, the schema's **input** type |
| `createField([requiredValidator])` | `any`, untyped                        |

The type is never inferred from the validators. Built-in validators accept any value, so they can't say
what the field holds. The validators you pass are, however, **checked against** the field type:

```ts
const isEven = createValidator((value: number) => (value % 2 ? 'Must be even' : undefined))

createField<number>([requiredValidator, isEven]) // ✅
createField<string>([isEven]) // ❌ Type error: isEven validates numbers
```

### Standard Schema fields store the input, not the output

A form holds what the user typed. With a Standard Schema, the field type is the schema's **input** type.
Transforms and coercions don't change the stored value:

```ts
createField(z.string().transform((value) => value.length)) // value type: string (not number)
createField(z.coerce.number()) // value type: unknown (coerce accepts any input)
```

If you need the transformed output, parse the values in `onSubmit`:

```ts
const valuesSchema = z.object({ age: z.coerce.number(), email: z.string().email() })

useController({
  schema,
  onSubmit: (values) => api.save(valuesSchema.parse(values)), // { age: number; email: string }
})
```

## Form types

`createForm` infers a key for every field. Nested forms become nested objects and lists become arrays.

```ts
createForm({ name: createField<string>() }) // { name: string }
```

With the [entries syntax](/react-functional-form/guides/schemas/#forms), write the entries inline, or add
`as const` when they're stored in a variable. Otherwise TypeScript widens them to plain arrays and the form
becomes untyped:

```ts
createForm([['name', createField<string>()]]) // { name: string }

const entries = [['name', createField<string>()]] as const
createForm(entries) // { name: string }

const looseEntries = [['name', createField<string>()]]
createForm(looseEntries) // Record<PropertyKey, any>, untyped
```

### Fields that exist only sometimes

When a schema is built from the values, some fields may exist only sometimes. Set them to `undefined`
when they don't exist. Their values are then typed `| undefined`:

```ts
const buildSchema = (contactMethod?: 'email' | 'phone') =>
  createForm({
    name: createField<string>([requiredValidator]),
    email: contactMethod === 'phone' ? undefined : createField<string>([requiredValidator]),
    phone: contactMethod === 'phone' ? createField<string>([requiredValidator]) : undefined,
  })
// { name: string; email: string | undefined; phone: string | undefined }
```

Avoid spreading conditional objects (`...(isPhone ? { phone } : { email })`): TypeScript only keeps the
keys the alternatives have in common, so `phone` and `email` would disappear from the type.

## Values are typed as declared, not as "maybe empty"

`form.values.email` is typed `string`, but it's `undefined` until the user types something or you pass
initial values. That's the usual trade-off in form libraries: `onSubmit` values match the declared types
once validation passes. The props builders reflect the gap:

| Where                               | Type                  |
| ----------------------------------- | --------------------- |
| `form.values.email`                 | `string`              |
| `getPropsForField('email').value`   | `string \| undefined` |
| `form.getFieldState('email').value` | `string \| undefined` |
| `initialValues`                     | `DeepPartial<Values>` |

For strictness, include `undefined` in the field type (`createField<string | undefined>()`). Your
validators, e.g. `requiredValidator`, are what guarantee a value on submit.

## What the controller types

For `const form = useController({ schema })`:

| Property                     | Type                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `values`, `defaultValues`    | `ValuesOf<typeof schema>`                                                              |
| `touched`, `visited`         | Same shape with optional `boolean` leaves. A list's touched can be `true` (every item) |
| `dirty`                      | Same shape with `boolean` leaves                                                       |
| `validationResult`           | `ValidationResultOf<typeof schema>`: `[isValid, children, ownError?]`                  |
| `setFieldValue(name, value)` | `name` is a key of the form. `value` must match its type                               |
| `getFieldState(name)`        | `{ value: V \| undefined; error; invalid; touched; visited; dirty }`                   |
| `reset(values?)`             | `values: DeepPartial<Values>`                                                          |
| `onSubmit` prop              | `(values: Values, ...args) => any`                                                     |
| `onSubmit()`, `trigger()`    | `Promise<ValidationResultOf<typeof schema>>`                                           |
| `error`                      | The form's own error, typed by `mapError`                                              |

```ts
form.setFieldValue('age', 31) // ✅
form.setFieldValue('age', '31') // ❌ Type error: age is a number
form.setFieldValue('nope', 1) // ❌ Type error: unknown field
```

## Field props

`getPropsForField(name)` only accepts the names of **fields**. Nested forms and lists are rejected, since
they need `useGetPropsForNestedForm`. The props are typed from the field:

```ts
const getPropsForField = useGetPropsForField(form)

getPropsForField('email') // { name: 'email'; value: string | undefined; error: any; onChange; … }
getPropsForField('address') // ❌ Type error: address is a nested form
getPropsForField('nope') // ❌ Type error: unknown field
```

`name` keeps its literal type, so the props can be spread on native inputs, which expect a string `name`.

### Typing errors

Validators can return any kind of error (codes, messages, objects), so errors are typed `any`. To type
them, pass `mapError` to `useController`. Its return type becomes the error type of the field props,
`getFieldState`, `form.error`, and every nested form:

```ts
const form = useController({ schema, mapError: (code: string) => messages[code] })

useGetPropsForField(form)('email').error // string | undefined
form.getFieldState('email').error // string | undefined
useController(useGetPropsForNestedForm(form)('address')).error // string | undefined
```

A `mapError` passed to `useGetPropsForField` overrides the controller's and types that getter's errors.

## Nested forms and lists

`useGetPropsForNestedForm(form)` accepts the names of nested forms and lists, and its props carry the
child schema. The nested `useController` is fully typed without extra annotations:

```ts
const getPropsForNestedForm = useGetPropsForNestedForm(form)

const address = useController(getPropsForNestedForm('address'))
address.values // { city: string }

const tags = useFieldArray(useController(getPropsForNestedForm('tags')))
tags.getPropsForItem(0).value // string | undefined: field props for a list of fields
tags.append('new tag') // ✅ item type: string
tags.append(42) // ❌ Type error

const members = useFieldArray(useController(getPropsForNestedForm('members')))
useController(members.getPropsForItem(0)).values // { email: string }: controller props for a list of forms
```

## Typing components

Sub-form components take the props for their controller, typed with their schema:

```tsx
import type { ControllerProps } from 'react-functional-form'

function AddressForm({ propsForForm }: { propsForForm: ControllerProps<typeof addressSchema> }) {
  const form = useController(propsForForm) // Controller<typeof addressSchema>
  // …
}
```

To pass a controller around, use `Controller<typeof schema>`. With context, give the schema to
`useFormContext`:

```ts
function SubmitButton({ form }: { form: Controller<typeof schema> }) {
  /* … */
}

const form = useFormContext<typeof schema>()
```

Export the values type for the rest of your app (API calls, tests):

```ts
export type SignUpValues = ValuesOf<typeof schema>
```

## Typing validators

A validator is a `Validator<Value, Error>`. The easiest way to write a typed one is `createValidator`
with an annotated value:

```ts
const minWords = (count: number) =>
  createValidator((text: string) =>
    text.split(/\s+/).filter(Boolean).length < count ? `At least ${count} words` : undefined,
  )

createField<string>([minWords(3)])
```

In the metadata argument, `values` (the sibling values) is typed `any`, because a validator can be reused
in any form:

```ts
const matchesPassword = createValidator((value: string, { values }) =>
  value !== values.password ? 'Passwords must match' : undefined,
)
```

## When types fall back to `any`

Types stay loose (`any` or `Record<PropertyKey, any>`) instead of failing when:

- a field has no type argument or schema: `createField([...])`;
- form entries aren't literal, e.g. built with `.map()` or stored in a variable without `as const`;
- `useController` receives `any` props.

That's what lets untyped code compile, and you can add types one field at a time.

## Type reference

| Type                                                                      | Description                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| `ValuesOf<S>`                                                             | Values of a schema                                      |
| `TouchedOf<S>`, `VisitedOf<S>`, `DirtyOf<S>`                              | State trees                                             |
| `ValidationResultOf<S>`                                                   | Validation result tree                                  |
| `Controller<S>`                                                           | Return type of `useController`                          |
| `ControllerProps<S>`                                                      | Props of `useController` (e.g. for sub-form components) |
| `FieldProps<V, E, K>`                                                     | Return type of `getPropsForField`                       |
| `FieldArray<Item>`                                                        | Return type of `useFieldArray`                          |
| `Validator<V, E>`, `ValidateFunction`                                     | Field validator, form-level validate function           |
| `FieldSchema<V>`, `FormSchema<Entries>`, `ListSchema<Item>`, `SchemaNode` | Schema nodes                                            |
| `SubmitState`, `EventMetadata`, `DeepPartial<T>`, `StandardSchemaV1`      | Misc                                                    |
