---
title: Introduction
description: What react-functional-form is and when to use it.
---

**react-functional-form** is a small forms library for React built around three ideas.

1. **The schema comes first.** A form is described by a schema: a tree of fields, nested forms and lists,
   each with its validators. Initial state, validation, touched tracking and TypeScript types are all
   derived from it.
2. **State is fully controlled.** Values, touched, visited, errors and submit state are ordinary React
   state. By default `useController` owns it, but you can hand in your own state hooks. That lets you lift
   form state to a parent, share it, persist it, or build a schema that depends on the current values.
3. **Forms compose.** A nested form is a form. An `AddressForm` component with its own schema and
   `useController` call can be dropped into any parent form with `getPropsForNestedForm('address')`. Its
   state lives in the parent and its events bubble up.

## The building blocks

| Piece                                     | What it does                                                          |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `createForm`, `createField`, `createList` | Describe the form                                                     |
| `useController`                           | Holds the state, validates, handles submission                        |
| `useGetPropsForField`                     | Builds `value`/`error`/`onChange`/`onBlur`/`onFocus` props for inputs |
| `useGetPropsForNestedForm`                | Builds the props for a nested form's own `useController`              |
| `useFieldArray`                           | Adds, removes and reorders list items                                 |
| Validators                                | Plain functions, built-ins, or Standard Schemas (Zod, Valibot, …)     |

## When to use it

- Forms whose structure is data: dynamic schemas, builders, multi-step or deeply nested forms.
- Apps that want form state in React state (easy to lift, test, serialize and debug).
- Teams that like reusable sub-form components.

Because state is plain React state, every change re-renders the form that owns the state, including its
nested forms. That's fine for typical forms, but keep it in mind for very large ones.
