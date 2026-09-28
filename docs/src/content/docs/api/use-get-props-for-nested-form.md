---
title: useGetPropsForNestedForm
description: Props for nested forms and lists.
---

```ts
const getPropsForNestedForm = useGetPropsForNestedForm(form)
const nested = useController(getPropsForNestedForm(name))
```

`name` must be a nested form or list of `form` (or an index, when `form` is a list of forms). The
returned props connect the nested controller to its parent:

- state hooks for values, touched, visited, errors and submit state, reading from and writing to the parent;
- the nested slice of the parent's validation result, plus `isValidating`;
- `defaultValues`, `mode`, `shouldFocusError` and the parent's `onSubmit`.

You can add or override props before passing them on:

```ts
useController({ ...getPropsForNestedForm('address'), onFieldBlur: saveDraft })
```

See [nested forms](/react-functional-form/guides/nested-forms/).
