---
title: useFieldArray
description: Operations and stable keys for lists.
---

```ts
const list = useController(getPropsForNestedForm('members'))
const { items, getPropsForItem, append, remove, move /* … */ } = useFieldArray(list)
```

Takes a controller for a [`createList`](/react-functional-form/api/schema/#createlistitem-validators) node.

| Returns                          | Description                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `items`                          | `{ key, index }[]`. Use `key` as the React key.                                                                           |
| `getPropsForItem(index)`         | Props for an item: controller props for lists of forms (for the item's `useController`), field props for lists of fields. |
| `append(value \| values)`        | Add at the end.                                                                                                           |
| `prepend(value \| values)`       | Add at the start.                                                                                                         |
| `insert(index, value \| values)` | Add at an index.                                                                                                          |
| `remove(index? \| indexes)`      | Remove items. No argument removes all.                                                                                    |
| `move(from, to)`                 | Move an item.                                                                                                             |
| `swap(indexA, indexB)`           | Swap two items.                                                                                                           |
| `update(index, value)`           | Replace a value, keeping key and state.                                                                                   |
| `replace(values)`                | Replace everything and reset item state.                                                                                  |

See [field arrays](/react-functional-form/guides/field-arrays/).
