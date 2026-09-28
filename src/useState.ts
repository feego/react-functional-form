import { useState as useBaseState } from 'react'
import { getInitialTouched, getInitialValues, getInitialVisited } from './utils'
import type { DeepPartial, SchemaNode, StateHook, TouchedOf, ValuesOf, VisitedOf } from './types'

export interface FormStateOptions<S extends SchemaNode = any> {
  schema: S
  initialValues?: DeepPartial<ValuesOf<S>>
  validateOnInit?: boolean
  valuesStateHook?: StateHook<ValuesOf<S>>
  touchedStateHook?: StateHook<TouchedOf<S>>
  visitedStateHook?: StateHook<VisitedOf<S>>
}

export interface FormState<S extends SchemaNode = any> {
  valuesStateHook: StateHook<ValuesOf<S>>
  touchedStateHook: StateHook<TouchedOf<S>>
  visitedStateHook: StateHook<VisitedOf<S>>
  initialValues?: DeepPartial<ValuesOf<S>>
  validateOnInit?: boolean
}

/**
 * Builds the state hooks that `useController` will use to store all form related data.
 * NOTE: `useController` already creates its own state hooks internally by default, if we don't give it
 * custom ones as options. This hook is for when the form state needs to be accessed before the controller
 * is created (e.g. to build a schema that depends on the values), or owned by a parent component.
 *
 * @example
 * const formState = useState({ schema: initialSchema, initialValues })
 * const schema = buildSchema(formState.valuesStateHook[0])
 * const propsForForm = useController({ ...formState, schema })
 */
export function useState<S extends SchemaNode>(options: FormStateOptions<S>): FormState<S>
export function useState(options?: any): FormState<any>
export function useState({
  schema,
  initialValues,
  validateOnInit,
  valuesStateHook,
  touchedStateHook,
  visitedStateHook,
}: any = {}): FormState<any> {
  const ownValuesHook = useBaseState(() =>
    valuesStateHook ? undefined : getInitialValues(schema, initialValues),
  )
  const ownTouchedHook = useBaseState(() =>
    touchedStateHook ? undefined : getInitialTouched(schema, validateOnInit),
  )
  const ownVisitedHook = useBaseState(() =>
    visitedStateHook ? undefined : getInitialVisited(schema),
  )

  return {
    valuesStateHook: valuesStateHook ?? ownValuesHook,
    touchedStateHook: touchedStateHook ?? ownTouchedHook,
    visitedStateHook: visitedStateHook ?? ownVisitedHook,
    initialValues,
    validateOnInit,
  }
}

export default useState
