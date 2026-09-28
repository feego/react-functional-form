# react-functional-form

## 1.0.0

### Major Changes

- First stable release: a modernized, fully typed and documented react-functional-form. The schema-first,
  controlled API (`createForm`, `createField`, `useController`, `useGetPropsForField`,
  `useGetPropsForNestedForm`, validator chains) is unchanged.

  ### New features
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
  - **Native inputs:** field `onChange` accepts DOM change events (text, checkbox, file, multi-select).
  - **Focus on error:** `shouldFocusError` focuses the first invalid field after a failed submission.
  - **Context:** `FormProvider` and `useFormContext`.
  - **Validators:** `createMinLengthValidator`, `createMaxLengthValidator`, `createMinValidator`,
    `createMaxValidator`, `createMatchesFieldValidator`, `createValidator`, `optional`, and
    `createStandardSchemaValidator`.
  - `useDirtyValues` is now exported.

  ### Breaking changes
  - `onSubmit` now calls `preventDefault()` when given a submit event, and clears errors set with
    `setErrors`.
  - When the submit handler (or a validator) is async, `onSubmit` returns a promise of the validation result
    instead of the result itself. The promise rejects if the submit handler throws or rejects.
  - `validate` and `getValidationResult` are typed as possibly returning a promise (they only do when a
    validator is async).
  - The package is now ESM-first with an `exports` map (`dist/index.js` and `dist/index.cjs`). Deep imports
    of the old `dist` files no longer work; import from `react-functional-form`.
  - The React peer dependency is now `>=16.8` (hooks), and TypeScript 5.4+ is required for the types.
  - `null` values in `additionalErrors` now mean "no error" instead of throwing.
