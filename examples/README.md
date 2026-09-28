# Examples

Runnable examples of the most common ways to use react-functional-form. Each one is a single,
self-contained file in [`src/examples`](./src/examples). They're also the live demos in the
[documentation](https://feego.github.io/react-functional-form).

| Example                                                | Shows                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [Sign-up form](./src/examples/SignUpForm.tsx)          | Schema, validators, error messages and submit state: the basics                |
| [Zod validation](./src/examples/ZodValidation.tsx)     | Standard Schema (Zod, Valibot, ArkType) per field and for the whole form       |
| [Nested forms](./src/examples/NestedForms.tsx)         | A reusable sub-form component used twice                                       |
| [Field arrays](./src/examples/FieldArrays.tsx)         | `createList` + `useFieldArray`: add, remove, reorder, list-level validation    |
| [Async validation](./src/examples/AsyncValidation.tsx) | A validator that calls the server, `isValidating`                              |
| [Server errors](./src/examples/ServerErrors.tsx)       | `setErrors` with errors from an API response                                   |
| [Edit profile](./src/examples/EditProfile.tsx)         | Dirty tracking, discarding changes, `reset` after saving                       |
| [Native inputs](./src/examples/NativeInputs.tsx)       | Field props on plain inputs, selects, textareas and checkboxes; focus on error |
| [Dynamic schema](./src/examples/DynamicSchema.tsx)     | A schema built from the current values, with `useState`                        |
| [Persisted draft](./src/examples/PersistedDraft.tsx)   | Values kept in localStorage through a custom state hook                        |
| [Form context](./src/examples/FormContext.tsx)         | `FormProvider` and `useFormContext`                                            |

The shared input components in [`src/components/ui.tsx`](./src/components/ui.tsx) show how to connect
field props to your own components.

## Running

From the repository root:

```sh
pnpm install
pnpm build            # builds the library the examples import
pnpm examples:dev     # http://localhost:5173
```
