---
title: Submission
description: Submitting, submit state, and handling invalid submissions.
---

```tsx
const form = useController({
  schema,
  onSubmit: async (values, ...extraArgs) => {
    await api.save(values)
  },
  onInvalid: (validationResult) => {
    toast('Please fix the highlighted fields')
  },
})

return <form onSubmit={form.onSubmit}>…</form>
```

`form.onSubmit(...args)`:

1. Calls `preventDefault()` if the first argument is a submit event.
2. Touches every field so all errors become visible.
3. Clears errors set with `setErrors`.
4. Validates, waiting for async validators.
5. If valid, calls `onSubmit(values, ...args)`. Otherwise calls `onInvalid(validationResult, ...args)`.

Extra arguments are passed through, which is handy for variants of the same submission:

```ts
<button onClick={() => form.onSubmit({ exitAfterSave: true })}>Save & exit</button>
// onSubmit: (values, { exitAfterSave } = {}) => …
```

## Return value

`form.onSubmit` always returns a promise of the validation result, which resolves after your `onSubmit`
handler finishes:

```ts
const result = await form.onSubmit()
if (!result[0]) scrollToTop()
```

If the handler throws or rejects, the error is stored in `submitState.submitError`. What happens to the
promise depends on how `form.onSubmit` was called:

- **Called directly** (`await form.onSubmit()`), the promise rejects, so you can catch the error.
- **Called with an event**, i.e. used as an event handler (`<form onSubmit={form.onSubmit}>` or
  `<button onClick={form.onSubmit}>`), the promise resolves anyway. Nothing could handle the rejection
  there, and it would show up as an unhandled rejection (and, in Next.js, as the error overlay). Show
  `submitState.submitError` in the UI instead.

The work itself happens synchronously when validation and the handler are sync: fields are touched and
`onSubmit` is called before `form.onSubmit()` returns. Only the result is wrapped in a promise, so callers
handle sync and async forms the same way.

## Submit state

`form.submitState` tracks the lifecycle:

| Property             | Meaning                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `isSubmitting`       | `true` while validating and running `onSubmit` (use it to disable buttons) |
| `isSubmitted`        | `true` after the first submission attempt finished                         |
| `isSubmitSuccessful` | the last attempt was valid and `onSubmit` didn't throw or reject           |
| `submitCount`        | number of attempts                                                         |
| `submitError`        | what `onSubmit` threw or rejected with                                     |

```tsx
;<button disabled={form.submitState.isSubmitting}>
  {form.submitState.isSubmitting ? 'Saving…' : 'Save'}
</button>
{
  form.submitState.submitError && <p>Something went wrong. Please try again.</p>
}
```

`reset()` resets the submit state too.

## Submitting nested forms

Calling `onSubmit` from a nested form submits the root form. Nested forms share the root's submit state.
