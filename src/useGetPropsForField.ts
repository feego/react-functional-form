import { useCallback } from 'react'
import { getField, isList } from './schemaUtils'
import { assign } from './utils'
import type { Controller } from './useController'
import type {
  ChildSchema,
  EventMetadata,
  FieldName,
  SchemaNode,
  ValidationMode,
  ValuesOf,
} from './types'

export const buildEventMetadata = (
  values: any,
  validationResult: any,
  fieldName: any,
  fieldSchema: any,
  nestedFormEvent?: any,
  nextValue?: any,
): EventMetadata => ({
  fieldName,
  fieldSchema,
  values,
  validationResult,
  nestedFormEvent,
  nextValue,
})

/**
 * Extracts the value from DOM change events, so field props can be spread on native inputs. Any other
 * argument is returned as is.
 */
export const getEventValue = (eventOrValue: any) => {
  const target = eventOrValue?.target

  if (
    eventOrValue === null ||
    typeof eventOrValue !== 'object' ||
    typeof eventOrValue.preventDefault !== 'function' ||
    target === null ||
    typeof target !== 'object'
  ) {
    return eventOrValue
  }

  switch (target.type) {
    case 'checkbox':
      return target.checked
    case 'file':
      return target.files
    case 'select-multiple':
      return Array.from(target.selectedOptions ?? [], (option: any) => option.value)
    default:
      return target.value
  }
}

export interface FieldProps<V = any, E = any, K = PropertyKey> {
  name: K
  value: V | undefined
  error: E
  /** Accepts the next value, or a DOM change event. */
  onChange: (nextValue?: V | { target: any; preventDefault: () => void }) => void
  onFocus: () => void
  onBlur: () => void
  /** Only present when the form has `shouldFocusError` enabled. */
  ref?: (element: any) => void
}

type FieldPropsControllerLike = Pick<Controller, 'schema' | 'values'> &
  Partial<
    Pick<
      Controller,
      | 'validationResult'
      | 'touched'
      | 'visited'
      | 'onChange'
      | 'onFieldBlur'
      | 'onFieldFocus'
      | 'onFieldTouchedChange'
      | 'onFieldVisitedChange'
      | 'shouldFocusError'
      | 'fieldRegistry'
      | 'path'
      | 'mapError'
    >
  > & { mode?: ValidationMode }

const noop = () => {}

/**
 * Returns a function that builds the props for a field of a form: `name`, `value`, `error`, `onChange`,
 * `onFocus` and `onBlur` (plus a `ref` when `shouldFocusError` is enabled).
 *
 * @param props - The form controller (the `useController` return value).
 * @param mapError - Maps validation errors into the `error` prop (e.g. error codes into messages). Defaults
 *   to the controller's `mapError`. Only called for fields that have an error.
 */
export function useGetPropsForField<S extends SchemaNode, E2, E = any>(
  props: Controller<S, E>,
  mapError: (error: any) => E2,
): <K extends FieldName<S>>(name: K) => FieldProps<ValuesOf<ChildSchema<S, K>>, E2 | undefined, K>
export function useGetPropsForField<S extends SchemaNode, E = any>(
  props: Controller<S, E> | FieldPropsControllerLike,
): <K extends FieldName<S>>(name: K) => FieldProps<ValuesOf<ChildSchema<S, K>>, E | undefined, K>
export function useGetPropsForField(props: any, mapErrorOverride?: (error: any) => any) {
  const {
    values,
    validationResult = [false, {}],
    touched = {},
    visited = {},
    mode = 'onBlur',
    shouldFocusError = false,
    fieldRegistry,
    path = [],
    onChange = noop,
    onFieldBlur = noop,
    onFieldFocus = noop,
    onFieldTouchedChange = noop,
    onFieldVisitedChange = noop,
    mapError: controllerMapError,
  } = props
  const mapError = mapErrorOverride ?? controllerMapError
  const isListSchema = isList(props.schema)
  const makeOnFieldChange = useCallback(
    ([name, field]: [any, any]) =>
      (eventOrValue?: any) => {
        const nextValue = getEventValue(eventOrValue)
        const eventMetadata = buildEventMetadata(
          values,
          validationResult,
          name,
          field,
          undefined,
          nextValue,
        )

        onChange(eventMetadata, (values: any) => assign(values, name, nextValue, isListSchema))

        // In `onChange` mode, fields get touched as soon as they change.
        if (mode === 'onChange' && !touched[name]) {
          onFieldTouchedChange(eventMetadata, (touched: any) =>
            assign(touched, name, true, isListSchema),
          )
        }
      },
    [values, validationResult, onChange, mode, touched, onFieldTouchedChange, isListSchema],
  )
  const makeOnFieldFocus = useCallback(
    ([name, field]: [any, any]) =>
      () => {
        const eventMetadata = buildEventMetadata(values, validationResult, name, field)

        // Call the `onFieldVisitedChange` callback if the field was not visited before.
        if (!visited[name]) {
          onFieldVisitedChange(eventMetadata, (visited: any) =>
            assign(visited, name, true, isListSchema),
          )
        }

        return onFieldFocus(eventMetadata)
      },
    [values, validationResult, visited, onFieldFocus, onFieldVisitedChange, isListSchema],
  )
  const makeOnFieldBlur = useCallback(
    ([name, field]: [any, any]) =>
      () => {
        const eventMetadata = buildEventMetadata(values, validationResult, name, field)

        // Call the `onFieldTouchedChange` callback the first time the field is touched. In `onSubmit` mode,
        // fields only get touched on submit.
        if (!touched[name] && mode !== 'onSubmit') {
          onFieldTouchedChange(eventMetadata, (touched: any) =>
            assign(touched, name, true, isListSchema),
          )
        }

        return onFieldBlur(eventMetadata)
      },
    [values, validationResult, touched, onFieldBlur, onFieldTouchedChange, mode, isListSchema],
  )
  const getRef = useCallback(
    (name: PropertyKey) => {
      const key = JSON.stringify([...path, name].map(String))
      let ref = fieldRegistry.refs.get(key)

      if (!ref) {
        ref = (element: any) => {
          if (element) fieldRegistry.elements.set(key, element)
          else fieldRegistry.elements.delete(key)
        }
        fieldRegistry.refs.set(key, ref)
      }

      return ref
    },
    [fieldRegistry, path],
  )

  return useCallback(
    (name: any) => {
      const field = getField(props.schema, name)
      const fieldProps: FieldProps = {
        name,
        value: values?.[name],
        error: (() => {
          const error = validationResult[1]?.[name]?.[1]
          return error === undefined || !mapError ? error : mapError(error)
        })(),
        onChange: makeOnFieldChange([name, field]),
        onFocus: makeOnFieldFocus([name, field]),
        onBlur: makeOnFieldBlur([name, field]),
      }

      if (shouldFocusError && fieldRegistry) {
        fieldProps.ref = getRef(name)
      }

      return fieldProps
    },
    [
      props.schema,
      values,
      validationResult,
      makeOnFieldChange,
      makeOnFieldFocus,
      makeOnFieldBlur,
      shouldFocusError,
      fieldRegistry,
      getRef,
      mapError,
    ],
  )
}

export default useGetPropsForField
