---
'@feego/react-functional-form': patch
---

`onSubmit` no longer rejects when called with an event (e.g. `<form onSubmit={form.onSubmit}>`). Submit handler errors are stored in `submitState.submitError` and the promise resolves, instead of causing an unhandled rejection (and the Next.js error overlay). Called directly (`await form.onSubmit()`), it still rejects.

`FieldProps` now defaults its name type to `string`, so components typed with `FieldProps<V>` can spread their props onto `<input>`.
