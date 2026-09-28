# react-functional-form

## 1.0.0

### Major Changes

- First stable release: a modernized, fully typed and documented react-functional-form. The schema-first,
  controlled API (`createForm`, `createField`, `useController`, `useGetPropsForField`,
  `useGetPropsForNestedForm`, validator chains) is unchanged.

  ### New features
  - **Object syntax for forms:** `createForm({ email: createField<string>(), address: addressSchema })`,
    alongside the `[name, node]` entries. Fields set to `undefined` are left out and typed `| undefined`.
  - **TypeScript types inferred from schemas:** values, initial values, `onSubmit`, field props, nested
    forms and list items are typed from `createField<T>()` or a Standard Schema. Untyped code keeps
    compiling with loose types.
  - **Standard Schema support (Zod, Valibot, ArkType, …):** `createField(z.string().email())` per field, and
    `createStandardSchemaValidate(schema)` for form-level validation with issues mapped to fields by path.
  - **Async validators** (any validator can return a promise), with `isValidating`, waited for on submit.
  - **Field arrays:** `createList(item, validators?)` stores real arrays; `useFieldArray` gives `append`,
    `prepend`, `insert`, `remove`, `move`, `swap`, `update` and `replace` with stable keys.
  - **Submit state:** `submitState` with `isSubmitting`, `isSubmitted`, `isSubmitSuccessful`, `submitCount`
    and `submitError`, plus an `onInvalid` callback.
  - **Dirty tracking and reset:** `isDirty`, `dirty` and `reset(values?)`.
  - **Imperative API:** `setErrors`, `clearErrors`, `trigger`, `setFieldValue` and `getFieldState`.
  - **Validation modes:** `mode: 'onBlur' | 'onChange' | 'onSubmit'`.
  - **Native inputs:** `useGetPropsForInput` builds DOM-ready props (`value` never `undefined`, `checked` for
    checkboxes and radios, `aria-invalid`), and field `onChange` accepts DOM change events.
  - **Error mapping for the whole form:** a `mapError` prop on `useController` maps errors for field props,
    `getFieldState`, the form's own `error`, and every nested form. Its return type types the errors.
  - **`error` on controllers:** the form's or list's own error (e.g. from a list validator), instead of
    `validationResult[2]`.
  - **`getPropsForItem`** from `useFieldArray`: controller props for lists of forms, field props for lists of
    fields.
  - **Focus on error:** `shouldFocusError` focuses the first invalid field after a failed submission.
  - **Context:** `FormProvider` and `useFormContext`.
  - **Validators:** `createMinLengthValidator`, `createMaxLengthValidator`, `createMinValidator`,
    `createMaxValidator`, `createMatchesFieldValidator`, `createValidator`, `optional`, and
    `createStandardSchemaValidator`.
  - `useDirtyValues` is now exported.
  - `useState` is renamed to `useFormState`, so it doesn't clash with React's `useState`. `useState` remains
    as a deprecated alias.

  ### Breaking changes
  - `onSubmit` now calls `preventDefault()` when given a submit event, and clears errors set with
    `setErrors`.
  - `onSubmit` and `trigger` always return a promise of the validation result instead of the result itself.
    The work still happens synchronously when validation and the handler are sync. The promise rejects if
    the submit handler throws or rejects.
  - The `mapError` argument of `useGetPropsForField` is only called for fields that have an error (it used
    to also be called with `undefined`).
  - Internal helpers are no longer exported: `getInitialValues`, `getInitialTouched`, `getInitialVisited`,
    `getAllFieldsTouched`, `getValidationResult`, `mergeAdditionalErrors` and `validateField`. Use the
    controller methods (`reset`, `trigger`, `setErrors`, `getFieldState`) and `validate` instead.
  - `validate` is typed as possibly returning a promise (it only does when a validator is async).
  - The package is now ESM-first with an `exports` map (`dist/index.js` and `dist/index.cjs`). Deep imports
    of the old `dist` files no longer work; import from `react-functional-form`.
  - The React peer dependency is now `>=16.8` (hooks), and TypeScript 5.4+ is required for the types.
  - `null` values in `additionalErrors` now mean "no error" instead of throwing.
