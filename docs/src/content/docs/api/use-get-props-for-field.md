---
title: useGetPropsForField
description: Props for field inputs.
---

```ts
const getPropsForField = useGetPropsForField(form, mapError?)
const props = getPropsForField(name)
```

- `form`: a controller.
- `mapError(error)`: optional, maps validation errors (e.g. codes to messages). Defaults to the
  controller's `mapError`. Only called for fields with an error.

`name` must be a field of the form (use a number for lists of fields). It returns:

| Prop       | Description                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `name`     | The field name.                                                                                                                |
| `value`    | Current value.                                                                                                                 |
| `error`    | Mapped error, or `undefined` when valid.                                                                                       |
| `onChange` | `(value \| changeEvent) => void`. DOM events are unwrapped, see [native inputs](/react-functional-form/guides/native-inputs/). |
| `onFocus`  | Marks the field visited on first focus.                                                                                        |
| `onBlur`   | Marks the field touched on first blur (except in `onSubmit` mode).                                                             |
| `ref`      | Only with `shouldFocusError`.                                                                                                  |

The returned function is memoized and changes when the form state changes.
