---
title: useController
description: The form controller hook.
---

```ts
const form = useController(props)
```

Holds the form state, validates it and handles events. It's used for root forms, and for nested forms and
lists with the props from [`useGetPropsForNestedForm`](/react-functional-form/api/use-get-props-for-nested-form/).

## Props

| Prop                                                                                            | Type                                   | Description                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`                                                                                        | `SchemaNode`                           | **Required.** Form (or list) schema.                                                                                                                              |
| `initialValues`                                                                                 | `DeepPartial<Values>`                  | Initial values, shaped after the schema. Also the default values for dirty tracking.                                                                              |
| `onSubmit`                                                                                      | `(values, ...args) => any`             | Called with valid values on submit. May be async.                                                                                                                 |
| `onInvalid`                                                                                     | `(validationResult, ...args) => void`  | Called when a submission fails validation.                                                                                                                        |
| `mode`                                                                                          | `'onBlur' \| 'onChange' \| 'onSubmit'` | When fields get touched. Default `'onBlur'`. [More](/react-functional-form/guides/validation-modes/)                                                              |
| `validateOnInit`                                                                                | `boolean`                              | Start with every field touched.                                                                                                                                   |
| `validate`                                                                                      | `(schema, values, touched) => result`  | Custom validation. Default: the library `validate`.                                                                                                               |
| `additionalErrors`                                                                              | `ErrorsTree`                           | External errors merged into validation. [More](/react-functional-form/guides/server-errors/)                                                                      |
| `shouldFocusError`                                                                              | `boolean`                              | Focus the first invalid field after a failed submit. Adds `ref` to field props.                                                                                   |
| `mapError`                                                                                      | `(error) => E`                         | Maps errors (e.g. codes to messages) for field props, `getFieldState`, `error` and nested forms. [More](/react-functional-form/guides/validation/#error-messages) |
| `onChange`                                                                                      | `(eventMetadata, ...args) => void`     | Value change events, including from nested forms.                                                                                                                 |
| `onFieldTouch`                                                                                  | `(eventMetadata) => void`              | First blur of a field.                                                                                                                                            |
| `onFieldVisit`                                                                                  | `(eventMetadata) => void`              | First focus of a field.                                                                                                                                           |
| `onFieldBlur`, `onFieldFocus`                                                                   | `(eventMetadata) => void`              | Every blur/focus.                                                                                                                                                 |
| `valuesStateHook`, `touchedStateHook`, `visitedStateHook`, `errorsStateHook`, `submitStateHook` | `[state, setState]`                    | Own a piece of state. [More](/react-functional-form/guides/lifted-state/)                                                                                         |
| `defaultValues`, `validationResult`, `isValidating`                                             |                                        | Set by parents for nested forms.                                                                                                                                  |

## Returns

### State

| Property                     | Description                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `values`                     | Current values.                                                               |
| `touched`                    | Touched tree.                                                                 |
| `visited`                    | Visited tree.                                                                 |
| `validationResult`           | `[isValid, children, ownError?]`. Only touched fields are validated.          |
| `isValidating`               | Async validation in progress.                                                 |
| `errors`                     | Errors set with `setErrors`.                                                  |
| `defaultValues`              | Values used for dirty tracking and `reset()`.                                 |
| `isDirty`, `dirty`           | Whether values differ from the defaults, overall and per field.               |
| `submitState`                | `{ isSubmitting, isSubmitted, isSubmitSuccessful, submitCount, submitError }` |
| `schema`, `mode`, `isNested` | Configuration.                                                                |

### Methods

| Method                                                                                    | Description                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onSubmit(...args)`                                                                       | Submit. Accepts a submit event (and prevents its default). Returns a promise of the validation result, which rejects if your `onSubmit` throws. [More](/react-functional-form/guides/submission/) |
| `setFieldValue(name, value)`                                                              | Set a value as if the user changed it.                                                                                                                                                            |
| `getFieldState(name)`                                                                     | `{ value, error, invalid, touched, visited, dirty }`                                                                                                                                              |
| `trigger(name?)`                                                                          | Touch a field (or all) and return a promise of the validation result.                                                                                                                             |
| `setErrors(errors \| updater)`                                                            | Set manual errors.                                                                                                                                                                                |
| `clearErrors(name?)`                                                                      | Clear manual errors.                                                                                                                                                                              |
| `reset(values?)`                                                                          | Reset all state, optionally to new default values.                                                                                                                                                |
| `setValues`, `setTouched`, `setVisited`, `setSubmitState`                                 | Low-level state updaters that don't fire field events.                                                                                                                                            |
| `onChange`, `onFieldTouchedChange`, `onFieldVisitedChange`, `onFieldBlur`, `onFieldFocus` | Event handlers used by the props getters.                                                                                                                                                         |
