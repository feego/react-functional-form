---
title: useGetPropsForInput
description: Props for native input, select and textarea elements.
---

```ts
const getPropsForInput = useGetPropsForInput(form)
const props = getPropsForInput(name, options?)
```

`name` must be a field of the form. `options`:

| Option  | Description                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`  | Input type, added to the props. `'checkbox'` binds `checked` to a boolean value; `'radio'` binds `checked` to `value === options.value`. Other types bind `value`. |
| `value` | For radio buttons, the value the button represents.                                                                                                                |

Returns:

| Prop                | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `name`              | The field name, as a string.                            |
| `value`             | The value, or `''` when empty (not set for checkboxes). |
| `checked`           | For checkboxes and radio buttons.                       |
| `type`              | When given in the options.                              |
| `aria-invalid`      | `true` when the field has an error.                     |
| `onChange`          | Reads the value from the change event.                  |
| `onFocus`, `onBlur` | Visited/touched tracking.                               |
| `ref`               | Only with `shouldFocusError`.                           |

The props have no `error`. Read it with `form.getFieldState(name).error`. See
[native inputs](/react-functional-form/guides/native-inputs/).
