---
title: Utilities
description: Lower-level functions.
---

| Export                                                                      | Description                                                                         |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `validate(schema, values, touched)`                                         | Validates touched fields. Returns a result, or a promise when a validator is async. |
| `validateField(field, value, metadata)`                                     | Runs a field's validators.                                                          |
| `getValidationResult(schema, values, touched, additionalErrors, validate?)` | Validation plus merged external errors.                                             |
| `mergeAdditionalErrors(result, errors)`                                     | Merges an errors tree into a validation result.                                     |
| `getInitialValues(schema, values?)`                                         | Values shaped after the schema.                                                     |
| `getInitialTouched(schema, value)`                                          | Touched tree with every field set to `value`.                                       |
| `getInitialVisited(schema)`                                                 | Visited tree, all `false`.                                                          |
| `getAllFieldsTouched(schema)`                                               | Touched tree with every field touched.                                              |
| `getDirtyState(schema, defaultValues, values)`                              | `[isDirty, dirtyTree]`                                                              |
| `getEventValue(valueOrEvent)`                                               | Unwraps DOM change events.                                                          |
| `buildEventMetadata(…)`                                                     | Builds event metadata for custom events.                                            |
| `useDirtyValues(onChange?)`                                                 | Event-based dirty tracking.                                                         |
