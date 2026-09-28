---
title: Utilities
description: Lower-level functions.
---

| Export                              | Description                                                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate(schema, values, touched)` | The default validation: validates touched fields with their validators. Returns a result, or a promise when a validator is async. Wrap it in a custom `validate` function. |
| `getField(schema, name)`            | Child node of a form, or the item schema of a list.                                                                                                                        |
| `getFields(schema)`                 | `[name, node]` entries of a form.                                                                                                                                          |
| `map(schema, fn)`                   | New form from mapped entries.                                                                                                                                              |
| `isField`, `isForm`, `isList`       | Type guards for schema nodes.                                                                                                                                              |
| `useDirtyValues(onChange?)`         | Event-based dirty tracking: records which fields the user changed.                                                                                                         |

State shapes (initial touched trees, validation result merging, etc.) are internal. Use the controller's
methods (`reset`, `trigger`, `setErrors`, `getFieldState`) instead.
