import { useCallback, useMemo, useRef } from 'react'
import { buildEventMetadata } from './useGetPropsForField'
import { getField } from './schemaUtils'
import { assign, expandTouched } from './utils'
import type { Controller } from './useController'
import type { ArrayOperation, ListSchema, SchemaNode, ValuesOf } from './types'

let keyCounter = 0
const createKey = () => `rff-${(keyCounter += 1)}`
const createKeys = (count: number) => Array.from({ length: count }, createKey)

/**
 * An array operation applied the same way to values, touched, visited, errors and keys. `fill` is what new
 * entries get in each of those arrays.
 */
type Operation = <T>(items: T[], fill: (value: any, index: number) => T) => T[]

const toArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value])

const insertAt =
  (index: number, newValues: any[]): Operation =>
  (items, fill) => [
    ...items.slice(0, index),
    ...newValues.map((value, offset) => fill(value, index + offset)),
    ...items.slice(index),
  ]

const moveItem = <T>(items: T[], from: number, to: number) => {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}

export interface FieldArrayItem {
  /** Stable key to use as the React `key` of the item. */
  key: string
  index: number
}

export interface FieldArray<Item = any> {
  /** One entry per item, with a stable `key` that follows the item when it moves. */
  items: FieldArrayItem[]
  append: (value: Item | Item[]) => void
  prepend: (value: Item | Item[]) => void
  insert: (index: number, value: Item | Item[]) => void
  /** Removes the items at the given index(es), or every item when called without arguments. */
  remove: (index?: number | number[]) => void
  move: (from: number, to: number) => void
  swap: (indexA: number, indexB: number) => void
  /** Replaces the value of an item, keeping its key and touched/visited state. */
  update: (index: number, value: Item) => void
  /** Replaces every item, resetting their keys and touched/visited state. */
  replace: (values: Item[]) => void
}

/**
 * Manages the items of a list (see `createList`): adding, removing and reordering them while keeping
 * their touched, visited and error state aligned, and giving each a stable key for rendering.
 *
 * @param controller - The list controller: `useController(getPropsForNestedForm('listName'))`.
 *
 * @example
 * const members = useController(getPropsForNestedForm('members'))
 * const { items, append, remove } = useFieldArray(members)
 * const getPropsForMember = useGetPropsForNestedForm(members)
 *
 * items.map(({ key, index }) => (
 *   <MemberForm key={key} propsForForm={getPropsForMember(index)} onRemove={() => remove(index)} />
 * ))
 */
export function useFieldArray<S extends ListSchema<any>>(
  controller: Controller<S>,
): FieldArray<ValuesOf<S extends ListSchema<infer I> ? I : SchemaNode>>
export function useFieldArray(controller: Controller<any>): FieldArray<any> {
  const {
    schema,
    values: rawValues,
    validationResult,
    onChange,
    setTouched,
    setVisited,
    setErrors,
  } = controller
  const values = useMemo(() => (Array.isArray(rawValues) ? rawValues : []), [rawValues])
  const keysRef = useRef<string[]>([])

  // Keep keys aligned with the values when they change from outside the field array (e.g. a reset).
  if (keysRef.current.length !== values.length) {
    keysRef.current =
      values.length > keysRef.current.length
        ? [...keysRef.current, ...createKeys(values.length - keysRef.current.length)]
        : keysRef.current.slice(0, values.length)
  }

  const keys = keysRef.current
  const items = useMemo(() => keys.map((key, index) => ({ key, index })), [keys])

  const apply = useCallback(
    (
      arrayOperation: ArrayOperation,
      operation: Operation,
      options: { resetState?: boolean } = {},
    ) => {
      const pad = <T>(array: T[] | undefined, length: number) =>
        Array.from({ length }, (_value, index) => array?.[index]) as T[]

      keysRef.current = operation(keysRef.current, () => createKey())
      const eventMetadata = {
        ...buildEventMetadata(values, validationResult, undefined, schema),
        arrayOperation,
      }

      onChange(eventMetadata, (current: any) =>
        operation(Array.isArray(current) ? current : [], (value) => value),
      )

      if (options.resetState) {
        setTouched(() => [] as any, eventMetadata)
        setVisited(() => [] as any, eventMetadata)
        setErrors((errors: any) => (Array.isArray(errors) ? [] : errors), eventMetadata)
        return
      }

      // New items start untouched, even when the list was fully touched after a submission.
      setTouched(
        (touched: any) =>
          operation(
            pad(expandTouched(schema, touched, values), values.length),
            () => undefined,
          ) as any,
        eventMetadata,
      )
      setVisited(
        (visited: any) => operation(pad(visited, values.length), () => undefined) as any,
        eventMetadata,
      )
      setErrors(
        (errors: any) =>
          Array.isArray(errors) ? operation(pad(errors, values.length), () => undefined) : errors,
        eventMetadata,
      )
    },
    [values, validationResult, schema, onChange, setTouched, setVisited, setErrors],
  )

  return useMemo(
    () => ({
      items,
      append: (value) => {
        const newValues = toArray(value)
        apply({ type: 'append', count: newValues.length }, insertAt(values.length, newValues))
      },
      prepend: (value) => {
        const newValues = toArray(value)
        apply({ type: 'prepend', count: newValues.length }, insertAt(0, newValues))
      },
      insert: (index, value) => {
        const newValues = toArray(value)
        apply({ type: 'insert', index, count: newValues.length }, insertAt(index, newValues))
      },
      remove: (index) => {
        const indexes = index === undefined ? values.map((_value, i) => i) : toArray(index)
        apply({ type: 'remove', indexes }, (array) =>
          array.filter((_value, i) => !indexes.includes(i)),
        )
      },
      move: (from, to) => apply({ type: 'move', from, to }, (array) => moveItem(array, from, to)),
      swap: (indexA, indexB) =>
        apply({ type: 'swap', indexA, indexB }, (array) => {
          const next = [...array]
          ;[next[indexA], next[indexB]] = [next[indexB] as any, next[indexA] as any]
          return next
        }),
      update: (index, value) =>
        onChange(
          {
            ...buildEventMetadata(
              values,
              validationResult,
              index,
              getField(schema, index),
              undefined,
              value,
            ),
            arrayOperation: { type: 'update', index },
          },
          (current: any) => assign(Array.isArray(current) ? current : [], index, value, true),
        ),
      replace: (newValues) =>
        apply({ type: 'replace' }, (_array, fill) => newValues.map(fill), { resetState: true }),
    }),
    [items, apply, values, onChange, validationResult, schema],
  )
}

export default useFieldArray
