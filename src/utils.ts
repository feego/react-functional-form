import defaultValidate from './validate'
import { getEntries, getFields, isList, isNestedForm } from './schemaUtils'
import { isPromise } from './promise'
import type { EventMetadata, MaybePromise, ValidateFunction, ValidationResult } from './types'

export type { ValidationResult } from './types'

/* -------------------------------------------------------------------------------------------------
 * State shapes
 * -----------------------------------------------------------------------------------------------*/

/**
 * Shapes `state` after the schema: keeps only the keys the schema knows, recursing into nested forms and
 * lists.
 */
export const stateFromSchema = (schema: any, state: any = isList(schema) ? [] : {}): any => {
  if (isList(schema)) {
    const item = schema['#item']
    return (Array.isArray(state) ? state : []).map((value) =>
      isNestedForm(item) ? stateFromSchema(item, value) : value,
    )
  }

  return getFields(schema).reduce((result: any, [name, field]: any) => {
    return {
      ...result,
      [name]: isNestedForm(field) ? stateFromSchema(field, state?.[name]) : state?.[name],
    }
  }, {})
}

export const getInitialValues = (schema: any, initialValues?: any) =>
  stateFromSchema(schema, initialValues ?? (isList(schema) ? [] : {}))

/**
 * Builds a touched/visited-like tree with every field set to `value`. Lists become `true` when `value` is
 * `true` ("every item, including future ones, is touched") and an empty array otherwise.
 */
const populateRecursively = (schema: any, value: any): any =>
  isList(schema)
    ? value === true
      ? true
      : []
    : getFields(schema).reduce(
        (result: any, [name, field]: any) => ({
          ...result,
          [name]: isNestedForm(field) ? populateRecursively(field, value) : value,
        }),
        {},
      )

export const getInitialTouched = (schema: any, validateOnInit: any) =>
  populateRecursively(schema, validateOnInit)

export const getInitialVisited = (schema: any) => populateRecursively(schema, false)

export const getAllFieldsTouched = (schema: any) => populateRecursively(schema, true)

/* -------------------------------------------------------------------------------------------------
 * Touched helpers
 * -----------------------------------------------------------------------------------------------*/

/**
 * Touched state of a child. A parent touched value of `true` means every descendant is touched.
 */
export const getChildTouched = (touched: any, key: PropertyKey) =>
  touched === true
    ? true
    : touched === null || typeof touched !== 'object'
      ? undefined
      : touched[key]

export const getTouchedAt = (touched: any, path: ReadonlyArray<PropertyKey>) =>
  path.reduce((current, key) => getChildTouched(current, key), touched)

/** Whether any descendant of a touched tree is touched. */
export const isAnyTouched = (touched: any): boolean =>
  touched === true ||
  (touched !== null &&
    typeof touched === 'object' &&
    Object.values(touched).some((value) => isAnyTouched(value)))

/**
 * Expands a `true` touched value (every descendant touched) into an explicit tree matching the schema and
 * values, so children can update individual entries.
 */
export const expandTouched = (schema: any, touched: any, values: any): any => {
  if (touched !== true || !isNestedForm(schema)) return touched

  return isList(schema)
    ? (Array.isArray(values) ? values : []).map((value) =>
        expandTouched(schema['#item'], true, value),
      )
    : getFields(schema).reduce(
        (result: any, [name, field]: any) => ({
          ...result,
          [name]: isNestedForm(field) ? expandTouched(field, true, values?.[name]) : true,
        }),
        {},
      )
}

/* -------------------------------------------------------------------------------------------------
 * Dirty state
 * -----------------------------------------------------------------------------------------------*/

/**
 * Structural equality for plain values, arrays, plain objects and dates.
 */
export const deepEqual = (a: any, b: any): boolean => {
  if (Object.is(a, b)) return true
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  return keysA.length === keysB.length && keysA.every((key) => deepEqual(a[key], b[key]))
}

/**
 * Compares values against default values, following the schema.
 *
 * @returns `[isDirty, dirtyTree]`, where the tree mirrors the values with `true` for every changed field.
 */
export const getDirtyState = (schema: any, defaultValues: any, values: any): [boolean, any] => {
  if (!isNestedForm(schema)) {
    const isDirty = !deepEqual(defaultValues, values)
    return [isDirty, isDirty]
  }

  const entries = getEntries(schema, values)
  const tree: any = isList(schema) ? [] : {}
  let isDirty = isList(schema) && (defaultValues?.length ?? 0) !== (values?.length ?? 0)

  for (const [name, field] of entries) {
    const [childDirty, childTree] = getDirtyState(
      field,
      defaultValues?.[name as any],
      values?.[name as any],
    )
    tree[name] = childTree
    isDirty = isDirty || childDirty
  }

  return [isDirty, tree]
}

/* -------------------------------------------------------------------------------------------------
 * Errors
 * -----------------------------------------------------------------------------------------------*/

export const mergeAdditionalErrors = (
  validationResult: ValidationResult = [true],
  additionalErrors: any = {},
): ValidationResult => {
  return Object.keys(additionalErrors).reduce(([isValid, errors]: ValidationResult, errorKey) => {
    const error = additionalErrors[errorKey]
    const additionalValidationResult =
      typeof error === 'object' && error !== null
        ? mergeAdditionalErrors(errors?.[errorKey], additionalErrors[errorKey])
        : error
          ? [false, error]
          : [true]

    return [
      isValid && additionalValidationResult[0],
      {
        ...errors,
        [errorKey]: additionalValidationResult,
      },
    ] as ValidationResult
  }, validationResult)
}

/**
 * Deep merges two errors trees. Errors from `b` win.
 */
export const mergeErrorsTrees = (a: any, b: any): any => {
  if (a === undefined) return b
  if (b === undefined) return a
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return b

  return Object.keys(b).reduce(
    (result: any, key) => ({ ...result, [key]: mergeErrorsTrees(a[key], b[key]) }),
    {
      ...a,
    },
  )
}

export const getValidationResult = (
  schema: any,
  values: any,
  touched: any,
  additionalErrors: any,
  validate: ValidateFunction = defaultValidate,
): MaybePromise<ValidationResult> => {
  const validationResult = validate(schema, values, touched)
  const merge = (result: ValidationResult) =>
    additionalErrors !== undefined ? mergeAdditionalErrors(result, additionalErrors) : result

  return isPromise<ValidationResult>(validationResult)
    ? validationResult.then(merge)
    : merge(validationResult)
}

/**
 * Walks a validation result in schema order and returns the path of the first invalid field.
 */
export const getFirstErrorPath = (
  schema: any,
  result: any,
  values: any,
  path: PropertyKey[] = [],
): PropertyKey[] | undefined => {
  if (!result || result[0] !== false) return undefined
  if (!isNestedForm(schema)) return path

  for (const [name, field] of getEntries(schema, values)) {
    const childPath = getFirstErrorPath(field, result[1]?.[name as any], values?.[name as any], [
      ...path,
      name,
    ])
    if (childPath) return childPath
  }

  return result.length > 2 ? path : undefined
}

/* -------------------------------------------------------------------------------------------------
 * Paths and immutable updates
 * -----------------------------------------------------------------------------------------------*/

/**
 * Returns a copy of `container` with `key` set to `value`. Arrays stay arrays.
 */
export const assign = (
  container: any,
  key: PropertyKey,
  value: any,
  asArray = Array.isArray(container),
) => {
  if (asArray) {
    const next = Array.isArray(container) ? [...container] : []
    next[key as number] = value
    return next
  }

  return { ...container, [key]: value }
}

/**
 * Returns a copy of `container` without `key`. Array entries are set to `undefined` to keep indexes.
 */
export const omit = (container: any, key: PropertyKey) => {
  if (container === null || typeof container !== 'object' || !(key in container)) return container
  if (Array.isArray(container)) return assign(container, key, undefined)

  const { [key]: _omitted, ...rest } = container
  return rest
}

export const getIn = (value: any, path: ReadonlyArray<PropertyKey>) =>
  path.reduce(
    (current, key) => (current === null || current === undefined ? undefined : current[key]),
    value,
  )

/**
 * Removes the value at `path`, returning the same object if there was nothing to remove.
 */
export const omitIn = (value: any, path: ReadonlyArray<PropertyKey>): any => {
  if (path.length === 0 || value === null || typeof value !== 'object')
    return path.length === 0 ? undefined : value
  const [head, ...rest] = path
  if (!(head in value)) return value
  if (rest.length === 0) return omit(value, head)

  const child = omitIn(value[head], rest)
  return child === value[head] ? value : assign(value, head, child)
}

/**
 * Path of the field an event originated from, following nested form events.
 */
export const getEventPath = (
  eventMetadata: EventMetadata | undefined,
): PropertyKey[] | undefined => {
  if (!eventMetadata || eventMetadata.fieldName === undefined) return undefined
  if (!eventMetadata.nestedFormEvent) return [eventMetadata.fieldName]

  const nestedPath = getEventPath(eventMetadata.nestedFormEvent)
  return nestedPath ? [eventMetadata.fieldName, ...nestedPath] : undefined
}
