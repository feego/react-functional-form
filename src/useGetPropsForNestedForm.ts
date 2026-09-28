import { useCallback } from 'react'
import { buildEventMetadata } from './useGetPropsForField'
import { getField, isList } from './schemaUtils'
import { assign, expandTouched } from './utils'
import type { Controller, ControllerProps } from './useController'
import type { ChildSchema, NestedFormName, SchemaNode } from './types'

const applyReducer = (reducer: any, previous: any) =>
  typeof reducer === 'function' ? reducer(previous) : reducer

/**
 * Returns a function that builds the props for a nested form (or list) of a form, to be given to its own
 * `useController`. The nested form state lives in the parent form, and its events bubble up to it.
 *
 * @param props - The parent form controller (the `useController` return value).
 * @returns Function that receives the nested form name and returns the props for its `useController` hook.
 */
export function useGetPropsForNestedForm<S extends SchemaNode, E = any>(
  props: Controller<S, E>,
): <K extends NestedFormName<S>>(name: K) => ControllerProps<ChildSchema<S, K>, E>
export function useGetPropsForNestedForm(props: any): (name: any) => any
export function useGetPropsForNestedForm({
  schema,
  values,
  touched,
  visited,
  errors,
  defaultValues,
  validationResult,
  isValidating,
  submitState,
  mode,
  mapError,
  shouldFocusError,
  fieldRegistry,
  path = [],
  onChange,
  onSubmit,
  onFieldTouchedChange,
  onFieldVisitedChange,
  setErrors,
  setSubmitState,
}: any): (name: any) => any {
  const isListSchema = isList(schema)
  const makeValuesStateUpdater = useCallback(
    ([name, form]: [any, any]) =>
      (reducer: any, nestedFormEvent: any) =>
        onChange(
          buildEventMetadata(values, validationResult, name, form, nestedFormEvent),
          (values: any = isListSchema ? [] : {}) =>
            assign(values, name, applyReducer(reducer, values?.[name]), isListSchema),
        ),
    [values, validationResult, onChange, isListSchema],
  )
  const makeTouchedStateUpdater = useCallback(
    ([name, form]: [any, any]) =>
      (reducer: any, nestedFormEvent: any) =>
        onFieldTouchedChange(
          buildEventMetadata(values, validationResult, name, form, nestedFormEvent),
          (touched: any = isListSchema ? [] : {}) => {
            const expanded = expandTouched(schema, touched, values)
            return assign(
              expanded,
              name,
              applyReducer(reducer, expandTouched(form, expanded?.[name], values?.[name])),
              isListSchema,
            )
          },
        ),
    [onFieldTouchedChange, validationResult, values, schema, isListSchema],
  )
  const makeVisitedStateUpdater = useCallback(
    ([name, form]: [any, any]) =>
      (reducer: any, nestedFormEvent: any) =>
        onFieldVisitedChange(
          buildEventMetadata(values, validationResult, name, form, nestedFormEvent),
          (visited: any = isListSchema ? [] : {}) =>
            assign(visited, name, applyReducer(reducer, visited?.[name]), isListSchema),
        ),
    [onFieldVisitedChange, validationResult, values, isListSchema],
  )
  const makeErrorsStateUpdater = useCallback(
    (name: any) => (reducer: any) =>
      setErrors?.((errors: any = {}) => {
        const next = applyReducer(reducer, errors?.[name])
        return next === undefined ? errors : assign(errors, name, next)
      }),
    [setErrors],
  )

  return useCallback(
    (name: any) => {
      const form = getField(schema, name)

      return {
        schema: form,
        initialValues: values?.[name],
        defaultValues: defaultValues?.[name],
        valuesStateHook: [values?.[name], makeValuesStateUpdater([name, form]), true],
        touchedStateHook: [touched?.[name], makeTouchedStateUpdater([name, form]), true],
        visitedStateHook: [visited?.[name], makeVisitedStateUpdater([name, form]), true],
        errorsStateHook: [errors?.[name], makeErrorsStateUpdater(name), true],
        submitStateHook:
          submitState && setSubmitState ? [submitState, setSubmitState, true] : undefined,
        validationResult: validationResult?.[1]?.[name],
        isValidating,
        mode,
        mapError,
        shouldFocusError,
        fieldRegistry,
        path: [...path, name],
        onSubmit,
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      schema,
      values,
      defaultValues,
      makeValuesStateUpdater,
      touched,
      makeTouchedStateUpdater,
      visited,
      makeVisitedStateUpdater,
      errors,
      makeErrorsStateUpdater,
      submitState,
      setSubmitState,
      validationResult,
      isValidating,
      mode,
      mapError,
      shouldFocusError,
      fieldRegistry,
      onSubmit,
    ],
  )
}

export default useGetPropsForNestedForm
