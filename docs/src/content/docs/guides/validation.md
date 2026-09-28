---
title: Validation
description: Validators, built-in rules, and how errors are shown.
---

## How validators work

A validator is a function that receives the **previous result** in the chain and returns the next one:

```ts
type Validator<V> = (
  result: [true] | [false, error],
  value: V,
  field: FieldSchema,
  metadata: { fieldName; fields; values }, // values: the parent form's values
) => [true] | [false, error] | Promise<…>
```

A validator that passes should return the previous result, so earlier errors survive. `identityValidator`
does exactly that:

```ts
import { identityValidator } from 'react-functional-form'

const noSpaces = (result, value) =>
  typeof value === 'string' && value.includes(' ') ? [false, 'NoSpaces'] : identityValidator(result)
```

Validators run in order. **When several fail, the last failing one wins.**

### The simpler way: `createValidator`

For most custom rules, write a function that returns an error (or nothing) and wrap it:

```ts
import { createValidator } from 'react-functional-form'

const noSpaces = createValidator((value: string) => (value?.includes(' ') ? 'NoSpaces' : undefined))

// Validators can read sibling values:
const afterStart = createValidator((end: string, { values }) =>
  end < values.start ? 'EndBeforeStart' : undefined,
)
```

Anything other than `undefined`, `null`, `false` or `true` counts as an error, so errors can be strings,
codes, objects or React nodes.

## Built-in validators

| Validator                                   | Fails when                                     | Error                |
| ------------------------------------------- | ---------------------------------------------- | -------------------- |
| `requiredValidator`                         | the value is falsy (`''`, `undefined`, `0`, …) | `Errors.Required`    |
| `createMinLengthValidator(n, error?)`       | a string/array is shorter than `n`             | `Errors.TooShort`    |
| `createMaxLengthValidator(n, error?)`       | a string/array is longer than `n`              | `Errors.TooLong`     |
| `createMinValidator(n, error?)`             | a number (or numeric string) is below `n`      | `Errors.TooSmall`    |
| `createMaxValidator(n, error?)`             | a number (or numeric string) is above `n`      | `Errors.TooBig`      |
| `createMatchesFieldValidator(name, error?)` | the value differs from a sibling field         | `Errors.Mismatch`    |
| `createRegexValidator(regex, error?)`       | the value doesn't match                        | `Errors.FailedRegex` |
| `createTypeValidator('number')`             | the value isn't a number                       | `Errors.InvalidType` |

The length and number validators skip empty values (`undefined`, `null`, `''`), so combine them with
`requiredValidator` when the field is mandatory. Wrap any validator with `optional(…)` to make it skip
empty values too:

```ts
createField([optional(createRegexValidator(/^\d{4}$/, 'InvalidZip'))])
```

## When errors show: touched fields

Only **touched** fields are validated. By default a field becomes touched the first time it's blurred.
Submitting touches every field. This gives the usual "don't yell at users before they've finished typing"
behavior. See [validation modes](/react-functional-form/guides/validation-modes/) to change it, and pass
`validateOnInit` to start with every field touched.

`form.validationResult` has the shape `[isValid, children, ownError?]`, mirroring the schema:

```ts
;[
  false,
  {
    email: [false, 'Required'],
    address: [true, { city: [true] }],
    tags: [false, [[true], [false, 'Required']], 'At least one tag'],
  },
]
```

Most of the time you read errors through `getPropsForField(name).error` or `form.getFieldState(name)`.

## Error messages

Keep validators returning codes and map them to messages in the UI:

```ts
const messages = { Required: 'Required', TooShort: 'Too short' }
const getPropsForField = useGetPropsForField(form, (error) => error && messages[error])
```

Or return messages directly (`createMinLengthValidator(8, 'Use at least 8 characters')`).

## Custom validate function

`useController({ validate })` replaces the whole validation step with
`(schema, values, touched) => validationResult`. The main use is
[form-level Standard Schema validation](/react-functional-form/guides/standard-schema/#form-level-validation).
The default is the exported `validate` function, which you can wrap.
