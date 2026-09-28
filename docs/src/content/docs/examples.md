---
title: Examples
description: Runnable examples of the most common use cases.
---

The [`examples`](https://github.com/feego/react-functional-form/tree/main/examples) folder has a runnable
app with one self-contained file per use case. They're the same components as the live demos in these
docs.

| Example                                                                                                                | Shows                                            | Demo                                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| [Sign-up form](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/SignUpForm.tsx)          | Schema, validators, error messages, submit state | [Quick start](/react-functional-form/getting-started/quick-start/#result) |
| [Zod validation](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/ZodValidation.tsx)     | Standard Schema per field and per form           | [Zod guide](/react-functional-form/guides/standard-schema/)               |
| [Nested forms](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/NestedForms.tsx)         | Reusable sub-form components                     | [Nested forms](/react-functional-form/guides/nested-forms/)               |
| [Field arrays](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/FieldArrays.tsx)         | `createList` + `useFieldArray`                   | [Field arrays](/react-functional-form/guides/field-arrays/)               |
| [Async validation](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/AsyncValidation.tsx) | Server-side checks, `isValidating`               | [Async validation](/react-functional-form/guides/async-validation/)       |
| [Server errors](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/ServerErrors.tsx)       | `setErrors` from an API response                 | [Server errors](/react-functional-form/guides/server-errors/)             |
| [Edit profile](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/EditProfile.tsx)         | Dirty state, discard, `reset`                    | [Dirty state](/react-functional-form/guides/dirty-state/)                 |
| [Native inputs](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/NativeInputs.tsx)       | Plain DOM inputs, focus on error                 | [Native inputs](/react-functional-form/guides/native-inputs/)             |
| [Dynamic schema](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/DynamicSchema.tsx)     | Schema built from the values                     | [Lifted state](/react-functional-form/guides/lifted-state/)               |
| [Persisted draft](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/PersistedDraft.tsx)   | Custom state hook backed by localStorage         | [Lifted state](/react-functional-form/guides/lifted-state/)               |
| [Form context](https://github.com/feego/react-functional-form/blob/main/examples/src/examples/FormContext.tsx)         | `FormProvider`, `useFormContext`                 | [FormProvider](/react-functional-form/api/form-provider/)                 |

## Running them locally

```sh
git clone https://github.com/feego/react-functional-form
cd react-functional-form
pnpm install
pnpm build
pnpm examples:dev
```
