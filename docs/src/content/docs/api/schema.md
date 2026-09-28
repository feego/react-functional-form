---
title: Schema
description: createForm, createField, createList and schema utilities.
---

## `createField(validators?, metadata?)`

```ts
function createField<V = any, M = any>(validators?: Validator<V>[], metadata?: M): FieldSchema<V, M>
function createField<S extends StandardSchemaV1, M = any>(
  schema: S,
  metadata?: M,
): FieldSchema<InferInput<S>, M>
```

Creates a field. `validators` run in order; a [Standard Schema](/react-functional-form/guides/standard-schema/)
can be given instead. `metadata` is stored as `field.metadata`.

## `createForm(fields)`

```ts
function createForm<const Fields extends Record<string, SchemaNode | undefined>>(
  fields: Fields,
): FormSchema<EntriesOf<Fields>>
function createForm<const Entries extends readonly (readonly [PropertyKey, SchemaNode])[]>(
  entries: Entries,
): FormSchema<Entries>
```

Creates a form from an object of nodes, or from `[name, node]` entries. Nodes are fields, forms or lists.
In the object form, nodes set to `undefined` are left out and typed `| undefined`. Literal objects and
entries give fully inferred types; dynamically built entry arrays are accepted too, with loose types. See
[schemas](/react-functional-form/guides/schemas/#forms).

## `createList(item, validators?)`

```ts
function createList<Item extends SchemaNode>(
  item: Item,
  validators?: Validator<any[]>[],
): ListSchema<Item>
```

Creates a list whose items share the `item` schema. `validators` receive the whole array. Their error is the
third element of the list's validation result, and the list controller's `error`.

## Utilities

| Function                      | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `getFields(form)`             | `[name, node][]` entries of a form                         |
| `getField(node, name)`        | Child node of a form, or the item schema of a list         |
| `map(form, fn)`               | New form from mapped entries (`fn(entry, index) => entry`) |
| `isField`, `isForm`, `isList` | Type guards                                                |

## Types

- `ValuesOf<typeof schema>`: value type.
- `TouchedOf`, `VisitedOf`, `DirtyOf`, `ValidationResultOf`: state tree types.
- `FieldSchema<V, M>`, `FormSchema<Entries>`, `ListSchema<Item>`, `SchemaNode`.
