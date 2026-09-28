---
title: Schemas
description: Describe forms with fields, nested forms and lists.
---

A schema is a tree built from three kinds of nodes.

```ts
import {
  createField,
  createForm,
  createList,
  requiredValidator,
} from '@feego/react-functional-form'

const schema = createForm({
  name: createField<string>([requiredValidator]), // a field
  address: createForm({
    // a nested form
    street: createField<string>(),
    city: createField<string>([requiredValidator]),
  }),
  tags: createList(createField<string>()), // a list of fields
  members: createList(
    // a list of forms
    createForm({ email: createField<string>([requiredValidator]) }),
  ),
})
```

The values of this form look like this:

```ts
{
  name: string
  address: { street: string; city: string }
  tags: string[]
  members: { email: string }[]
}
```

## Fields

`createField(validators?, metadata?)` creates a leaf.

- `validators`: an array of [validators](/react-functional-form/guides/validation/), or a single
  [Standard Schema](/react-functional-form/guides/standard-schema/) such as `z.string().email()`.
- `metadata`: anything you want to attach (labels, input types, options). Read it back with
  `getField(schema, name).metadata`.

With TypeScript, give the value type as a type argument (`createField<string>(…)`). With a Standard
Schema, the type is inferred from it. See [TypeScript](/react-functional-form/guides/typescript/).

## Forms

`createForm` groups nodes under names. It takes an object, or a list of `[name, node]` entries:

```ts
createForm({
  email: createField<string>([requiredValidator]),
  password: createField<string>([requiredValidator]),
})

createForm([
  ['email', createField<string>([requiredValidator])],
  ['password', createField<string>([requiredValidator])],
])
```

Both produce the same schema. The object form is shorter and easier to type. The entries form helps
when:

- you build the fields with array methods, e.g. `steps.map((step, index) => [index, buildStepSchema(step)])`;
- you need keys that aren't strings, or an exact order. Objects list integer-like keys (`'0'`, `'1'`)
  first, before other keys.

The field order is the order of validation and of
[focusing the first invalid field](/react-functional-form/guides/native-inputs/#focusing-the-first-invalid-field).

## Lists

`createList(item, validators?)` describes an array whose items all share a schema. The optional
validators receive the whole array, which is useful for rules like "at least one item". See
[field arrays](/react-functional-form/guides/field-arrays/).

## Schemas are data

Schemas are plain objects, so you can build them with functions. A common pattern is deriving a schema
from the current values. Fields set to `undefined` are left out:

```ts
const buildSchema = ({ hasCompany }: { hasCompany: boolean }) =>
  createForm({
    name: createField<string>([requiredValidator]),
    company: hasCompany ? createField<string>([requiredValidator]) : undefined,
  })
// Values: { name: string; company: string | undefined }
```

See [controlled & lifted state](/react-functional-form/guides/lifted-state/) for how to read the values
before the controller exists.

## Utilities

- `getFields(schema)`: the `[name, node]` entries of a form.
- `getField(schema, name)`: the node of a child (or the item schema of a list).
- `map(schema, fn)`: builds a new form by mapping its entries. Handy for adding context-specific
  validators to a reusable schema.
- `isField`, `isForm`, `isList`: type guards.
