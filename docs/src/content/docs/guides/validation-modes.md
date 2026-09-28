---
title: Validation modes
description: Choose when validation errors become visible.
---

Errors only show for **touched** fields. `mode` decides when a field becomes touched:

```ts
useController({ schema, mode: 'onChange' })
```

| Mode                 | A field is touched…                 | Good for                              |
| -------------------- | ----------------------------------- | ------------------------------------- |
| `'onBlur'` (default) | when it loses focus                 | Most forms: no errors while typing    |
| `'onChange'`         | as soon as it changes (and on blur) | Instant feedback, e.g. password rules |
| `'onSubmit'`         | only when the form is submitted     | Short forms, or less noise            |

In every mode, submitting touches all fields. From then on errors update live as the user fixes them.

The mode flows down to nested forms and lists.

## Other ways to touch fields

- `validateOnInit: true` starts with every field touched.
- `form.trigger('email')` touches one field (or nested form), and `form.trigger()` touches all of them.
  Both return the validation result for the new touched state (a promise if validation is async).
- `form.setTouched(updater)` gives you full control.
