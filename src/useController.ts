import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  assign,
  expandTouched,
  getAllFieldsTouched,
  getDirtyState,
  getEventPath,
  getFirstErrorPath,
  getIn,
  getInitialTouched,
  getInitialValues,
  getInitialVisited,
  getValidationResult,
  isAnyTouched,
  mergeErrorsTrees,
  omit,
  omitIn,
  stateFromSchema,
} from './utils'
import defaultValidate, { getValidResult } from './validate'
import { getField, isList, isNestedForm } from './schemaUtils'
import { isPromise } from './promise'
import { buildEventMetadata } from './useGetPropsForField'
import type {
  ChildName,
  ChildSchema,
  DeepPartial,
  DirtyOf,
  ErrorsTree,
  EventMetadata,
  MaybePromise,
  SchemaNode,
  StateHook,
  StateUpdater,
  SubmitState,
  TouchedOf,
  ValidateFunction,
  ValidationMode,
  ValidationResult,
  ValidationResultOf,
  ValuesOf,
  VisitedOf,
} from './types'

export const initialSubmitState: SubmitState = {
  isSubmitting: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  submitCount: 0,
  submitError: undefined,
}

/**
 * Registry of focusable elements, shared by a form and its nested forms, used to focus the first invalid
 * field after a failed submission.
 */
export interface FieldRegistry {
  elements: Map<string, { focus?: () => void }>
  refs: Map<string, (element: any) => void>
}

export interface FieldState<V = any> {
  value: V | undefined
  error: any
  invalid: boolean
  touched: boolean
  visited: boolean
  dirty: boolean
}

export interface ControllerProps<S extends SchemaNode = any> {
  /** Form (or list) schema. */
  schema: S
  /** Initial values. Only used when the values state is owned by the controller. */
  initialValues?: DeepPartial<ValuesOf<S>>
  /** Values to compare against for dirty tracking and to reset to. Defaults to the initial values. */
  defaultValues?: ValuesOf<S>
  /** Whether every field starts as touched, i.e. with its validation errors visible. */
  validateOnInit?: boolean
  /** When fields get touched (and their errors shown). Defaults to `'onBlur'`. */
  mode?: ValidationMode
  /** Errors from outside the form (e.g. a server response), shaped like the values. */
  additionalErrors?: ErrorsTree
  /** Custom validation function. Defaults to the library `validate`. */
  validate?: ValidateFunction
  /** Precomputed validation result. Given to nested forms by their parent. */
  validationResult?: ValidationResultOf<S>
  /** Whether async validation is running. Given to nested forms by their parent. */
  isValidating?: boolean
  /** Focus the first invalid field when a submission fails. Fields receive a `ref` to make it possible. */
  shouldFocusError?: boolean

  // All form state goes in these hooks, which can be owned by a parent component or form:
  valuesStateHook?: StateHook<ValuesOf<S>>
  touchedStateHook?: StateHook<TouchedOf<S>>
  visitedStateHook?: StateHook<VisitedOf<S>>
  errorsStateHook?: StateHook<ErrorsTree>
  submitStateHook?: StateHook<SubmitState>

  /** Called when a field (or nested form field) value changes. */
  onChange?: (eventMetadata: EventMetadata<ValuesOf<S>>, ...args: any[]) => void
  /** Called with the values when the form is submitted and valid. May be async. */
  onSubmit?: (values: ValuesOf<S>, ...args: any[]) => any
  /** Called with the validation result when the form is submitted and invalid. */
  onInvalid?: (validationResult: ValidationResultOf<S>, ...args: any[]) => void
  /** Called the first time a field is blurred (touched). */
  onFieldTouch?: (eventMetadata: EventMetadata<ValuesOf<S>>, ...args: any[]) => void
  /** Called the first time a field is focused (visited). */
  onFieldVisit?: (eventMetadata: EventMetadata<ValuesOf<S>>, ...args: any[]) => void
  onFieldBlur?: (eventMetadata: EventMetadata<ValuesOf<S>>) => void
  onFieldFocus?: (eventMetadata: EventMetadata<ValuesOf<S>>) => void

  /** @internal Shared by nested forms for focus management. */
  fieldRegistry?: FieldRegistry
  /** @internal Path of this form inside the root form. */
  path?: PropertyKey[]
}

export interface Controller<S extends SchemaNode = any> {
  schema: S
  values: ValuesOf<S>
  touched: TouchedOf<S>
  visited: VisitedOf<S>
  /** `[isValid, childrenResults, ownError?]`. Only touched fields are validated. */
  validationResult: ValidationResultOf<S>
  /** Whether async validators are running. */
  isValidating: boolean
  /** Values the form is compared against to know if it's dirty, and reset to. */
  defaultValues: ValuesOf<S>
  /** Whether any value differs from the default values. */
  isDirty: boolean
  /** Tree of booleans flagging which values differ from the default values. */
  dirty: DirtyOf<S>
  /** Errors set with `setErrors`. They are cleared when the field changes or the form is submitted. */
  errors: ErrorsTree
  submitState: SubmitState
  mode: ValidationMode
  shouldFocusError: boolean
  fieldRegistry: FieldRegistry
  path: PropertyKey[]
  isNested: boolean

  onChange: (eventMetadata: EventMetadata, reducer: (values: any) => any, ...args: any[]) => void
  /**
   * Touches every field, validates, and calls `onSubmit` with the values if valid (or `onInvalid`
   * otherwise). Returns the validation result, or a promise of it when validation or `onSubmit` are async.
   * Calls `preventDefault` when given a submit event.
   */
  onSubmit: (...args: any[]) => MaybePromise<ValidationResultOf<S>>
  onFieldTouchedChange: (
    eventMetadata: EventMetadata,
    reducer: (touched: any) => any,
    ...args: any[]
  ) => void
  onFieldVisitedChange: (
    eventMetadata: EventMetadata,
    reducer: (visited: any) => any,
    ...args: any[]
  ) => void
  onFieldBlur: (eventMetadata: EventMetadata) => void
  onFieldFocus: (eventMetadata: EventMetadata) => void

  // For lower level controlling, like performing state changes from inside the form or performing batched
  // updates without firing events.
  setValues: StateUpdater<ValuesOf<S>>
  setTouched: StateUpdater<TouchedOf<S>>
  setVisited: StateUpdater<VisitedOf<S>>
  setErrors: StateUpdater<ErrorsTree>
  setSubmitState: StateUpdater<SubmitState>

  /** Sets a field value, firing change events like a user change would. */
  setFieldValue: <K extends ChildName<S>>(name: K, value: ValuesOf<ChildSchema<S, K>>) => void
  /** Removes errors set with `setErrors`, for one field or all of them. */
  clearErrors: (name?: ChildName<S>) => void
  /**
   * Touches a field (or every field) so its validation errors show, and returns the validation result for
   * the new touched state.
   */
  trigger: (name?: ChildName<S>) => MaybePromise<ValidationResultOf<S>>
  /**
   * Resets values, touched, visited, errors and submit state. Given values, they also become the new default
   * values.
   */
  reset: (values?: DeepPartial<ValuesOf<S>>) => void
  /** State of a single field. */
  getFieldState: <K extends ChildName<S>>(name: K) => FieldState<ValuesOf<ChildSchema<S, K>>>
}

const isSubmitEvent = (value: any) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.preventDefault === 'function' &&
  value.type === 'submit'

const noop = () => {}

const EMPTY_ERRORS: ErrorsTree = {}

const createFieldRegistry = (): FieldRegistry => ({ elements: new Map(), refs: new Map() })

/**
 * The `useController` hook allows the parent component to control all its state and, in that case, be
 * completely stateless, with validation being the only feature it adds to the low level StatelessForm.
 * It is also possible to opt-in only some of the data properties (values, errors, touched and visited)
 * to be stored by the component.
 *
 * NOTE: error messages in DEV to when the owner component changes one of the data properties between
 * controlled and uncontrolled.
 */
function useController<S extends SchemaNode>(props: ControllerProps<S>): Controller<S>
function useController(props: ControllerProps<any>): Controller<any> {
  const {
    schema,
    initialValues,
    validateOnInit = false,
    additionalErrors,
    mode = 'onBlur',
    shouldFocusError = false,
    validate = defaultValidate,
    validationResult: providedValidationResult,
    isValidating: providedIsValidating,
    onFieldTouch: baseOnFieldTouch = noop,
    onFieldVisit: baseOnFieldVisit = noop,
    onChange: baseOnChange = noop,
    onSubmit: baseOnSubmit = noop,
    onInvalid = noop,
    onFieldBlur = noop,
    onFieldFocus = noop,
    path = [],
  } = props

  // All form state goes in these hooks. They're always created (rules of hooks) but only used when the
  // corresponding state hook isn't given.
  const ownValuesHook = useState(() =>
    props.valuesStateHook ? undefined : getInitialValues(schema, initialValues),
  )
  const ownTouchedHook = useState(() =>
    props.touchedStateHook ? undefined : getInitialTouched(schema, validateOnInit),
  )
  const ownVisitedHook = useState(() =>
    props.visitedStateHook ? undefined : getInitialVisited(schema),
  )
  const ownErrorsHook = useState<ErrorsTree>({})
  const ownSubmitHook = useState<SubmitState>(initialSubmitState)
  const ownFieldRegistry = useRef<FieldRegistry | null>(null)

  const [rawValues, baseSetValues, isNestedFormValues] = (props.valuesStateHook ??
    ownValuesHook) as any
  const [rawTouched, baseSetTouched, isNestedFormTouched] = (props.touchedStateHook ??
    ownTouchedHook) as any
  const [rawVisited, baseSetVisited, isNestedFormVisited] = (props.visitedStateHook ??
    ownVisitedHook) as any
  const [rawErrors, baseSetErrors] = (props.errorsStateHook ?? ownErrorsHook) as any
  const [rawSubmitState, baseSetSubmitState] = (props.submitStateHook ?? ownSubmitHook) as any

  const values = useMemo(() => rawValues ?? stateFromSchema(schema), [rawValues, schema])
  const touched = useMemo(
    () =>
      rawTouched === true
        ? expandTouched(schema, true, values)
        : (rawTouched ?? (isList(schema) ? [] : stateFromSchema(schema))),
    [rawTouched, schema, values],
  )
  const visited = useMemo(
    () => rawVisited ?? (isList(schema) ? [] : stateFromSchema(schema)),
    [rawVisited, schema],
  )
  const errors: ErrorsTree = rawErrors ?? EMPTY_ERRORS
  const submitState: SubmitState = rawSubmitState ?? initialSubmitState
  const fieldRegistry = props.fieldRegistry ?? (ownFieldRegistry.current ??= createFieldRegistry())

  /**
   * Values dirty state is compared against. Nested forms get them from the parent; the root form keeps the
   * initial values (or the first values it sees).
   */
  const rootDefaultValues = useRef<any>(undefined)
  if (rootDefaultValues.current === undefined) {
    rootDefaultValues.current =
      initialValues !== undefined ? getInitialValues(schema, initialValues) : values
  }
  const defaultValues =
    isNestedFormValues && 'defaultValues' in props ? props.defaultValues : rootDefaultValues.current

  /**
   * Wrappers for the state updaters. Nested form updaters bubble events up to the parent form.
   */
  const setValues = useMemo(
    () =>
      isNestedFormValues
        ? baseSetValues
        : (reducer: any, ...args: any) => baseSetValues(reducer, ...args),
    [baseSetValues, isNestedFormValues],
  )
  const setTouched = useMemo(
    () =>
      isNestedFormTouched
        ? baseSetTouched
        : (reducer: any, ...args: any) => baseSetTouched(reducer, ...args),
    [baseSetTouched, isNestedFormTouched],
  )
  const setVisited = useMemo(
    () =>
      isNestedFormVisited
        ? baseSetVisited
        : (reducer: any, ...args: any) => baseSetVisited(reducer, ...args),
    [baseSetVisited, isNestedFormVisited],
  )
  const setErrors = baseSetErrors as StateUpdater<ErrorsTree>
  const setSubmitState = baseSetSubmitState as StateUpdater<SubmitState>

  /**
   * Validation. Async validators make `validate` return a promise; in that case the last resolved result is
   * kept while the new one is pending.
   */
  const combinedErrors = useMemo(
    () =>
      Object.keys(errors).length > 0
        ? mergeErrorsTrees(additionalErrors ?? {}, errors)
        : additionalErrors,
    [additionalErrors, errors],
  )
  const lastValidation = useRef<{
    inputs: unknown[]
    output: MaybePromise<ValidationResult>
  } | null>(null)
  const computedValidation: MaybePromise<ValidationResult> | undefined = (() => {
    if (providedValidationResult !== undefined) return providedValidationResult
    const inputs = [schema, values, touched, combinedErrors, validate]
    const last = lastValidation.current
    const sameInputs = (from: number) =>
      last?.inputs.every((input, index) => index < from || input === inputs[index])

    // Async validation only reruns when the values, touched or errors change, so an unmemoized schema
    // doesn't restart it on every render.
    if (last && (sameInputs(0) || (isPromise(last.output) && sameInputs(1)))) return last.output

    const output = getValidationResult(schema, values, touched, combinedErrors, validate)
    if (isPromise(output)) output.catch(noop)
    lastValidation.current = { inputs, output }
    return output
  })()
  const pendingValidation = isPromise<ValidationResult>(computedValidation)
    ? computedValidation
    : null
  const [asyncValidation, setAsyncValidation] = useState<{
    promise: Promise<ValidationResult>
    result: ValidationResult
  } | null>(null)

  useEffect(() => {
    if (!pendingValidation) return undefined
    let isActive = true
    pendingValidation.then(
      (result) => isActive && setAsyncValidation({ promise: pendingValidation, result }),
      (error) => {
        if (isActive) {
          setAsyncValidation((previous) => ({
            promise: pendingValidation,
            result: previous?.result ?? getValidResult(schema, values),
          }))
          console.error(error)
        }
      },
    )
    return () => {
      isActive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingValidation])

  const validationResult: any = pendingValidation
    ? (asyncValidation?.result ?? getValidResult(schema, values))
    : computedValidation
  const isValidating =
    providedIsValidating ??
    (pendingValidation !== null && asyncValidation?.promise !== pendingValidation)

  const [isDirty, dirty] = useMemo(
    () => getDirtyState(schema, defaultValues, values),
    [schema, defaultValues, values],
  )

  /**
   * Form field touch handler.
   */
  const onFieldTouchedChange = useCallback(
    (eventMetadata: EventMetadata, reducer: any, ...rest: any[]) => {
      setTouched(reducer, eventMetadata)
      baseOnFieldTouch(eventMetadata, ...rest)
    },
    [baseOnFieldTouch, setTouched],
  )

  /**
   * Form field visit handler.
   */
  const onFieldVisitedChange = useCallback(
    (eventMetadata: EventMetadata, reducer: any, ...rest: any[]) => {
      setVisited(reducer, eventMetadata)
      baseOnFieldVisit(eventMetadata, ...rest)
    },
    [baseOnFieldVisit, setVisited],
  )

  /**
   * Form changes handler. The root form also clears manual errors of the changed field.
   */
  const onChange = useCallback(
    (eventMetadata: EventMetadata, reducer: any, _values?: any, ...rest: any[]) => {
      setValues(reducer, eventMetadata)

      if (!isNestedFormValues) {
        const eventPath = getEventPath(eventMetadata)
        if (eventPath && getIn(errors, eventPath) !== undefined) {
          setErrors((previous) => omitIn(previous, eventPath) ?? {})
        }
      }

      baseOnChange(eventMetadata, ...rest)
    },
    [baseOnChange, setValues, isNestedFormValues, errors, setErrors],
  )

  const focusFirstError = useCallback(
    (result: ValidationResult) => {
      const errorPath = getFirstErrorPath(schema, result, values)
      if (errorPath) {
        fieldRegistry.elements.get(JSON.stringify([...path, ...errorPath].map(String)))?.focus?.()
      }
    },
    [schema, values, fieldRegistry, path],
  )

  /**
   * Form submit handler.
   */
  const onSubmit = useMemo(
    () =>
      // Bypass by default when in a nested form.
      isNestedFormValues
        ? baseOnSubmit
        : (...rest: any[]) => {
            if (isSubmitEvent(rest[0]) && !rest[0].defaultPrevented) {
              rest[0].preventDefault()
            }

            // When the submit method if called, we touch all fields to make them validatable.
            const touched = getAllFieldsTouched(schema)
            const validation = validate(schema, values, touched)

            setTouched(() => touched)
            setErrors(() => ({}))
            setSubmitState((state) => ({
              ...state,
              isSubmitting: true,
              submitCount: state.submitCount + 1,
            }))

            const finish = (state: Partial<SubmitState>) =>
              setSubmitState((previous) => ({
                ...previous,
                isSubmitting: false,
                isSubmitted: true,
                ...state,
              }))
            const submit = (validationResult: ValidationResult): MaybePromise<ValidationResult> => {
              if (!validationResult[0]) {
                finish({ isSubmitSuccessful: false, submitError: undefined })
                onInvalid(validationResult as any, ...rest)
                if (shouldFocusError) focusFirstError(validationResult)
                return validationResult
              }

              let submission: unknown
              try {
                submission = baseOnSubmit(values, ...rest)
              } catch (error) {
                finish({ isSubmitSuccessful: false, submitError: error })
                throw error
              }

              if (isPromise(submission)) {
                return submission.then(
                  () => {
                    finish({ isSubmitSuccessful: true, submitError: undefined })
                    return validationResult
                  },
                  (error) => {
                    finish({ isSubmitSuccessful: false, submitError: error })
                    throw error
                  },
                )
              }

              finish({ isSubmitSuccessful: true, submitError: undefined })
              return validationResult
            }

            return isPromise<ValidationResult>(validation)
              ? validation.then(submit, (error) => {
                  finish({ isSubmitSuccessful: false, submitError: error })
                  throw error
                })
              : submit(validation)
          },
    [
      isNestedFormValues,
      baseOnSubmit,
      schema,
      setTouched,
      setErrors,
      setSubmitState,
      values,
      validate,
      onInvalid,
      shouldFocusError,
      focusFirstError,
    ],
  )

  const setFieldValue = useCallback(
    (name: PropertyKey, value: any) =>
      onChange(
        buildEventMetadata(
          values,
          validationResult,
          name,
          getField(schema, name),
          undefined,
          value,
        ),
        (currentValues: any) => assign(currentValues, name, value, isList(schema)),
      ),
    [onChange, values, validationResult, schema],
  )

  const clearErrors = useCallback(
    (name?: PropertyKey) =>
      setErrors((previous) => (name === undefined ? {} : omit(previous ?? {}, name))),
    [setErrors],
  )

  const trigger = useCallback(
    (name?: PropertyKey) => {
      const nextTouched =
        name === undefined
          ? getAllFieldsTouched(schema)
          : assign(
              expandTouched(schema, touched, values),
              name,
              isNestedForm(getField(schema, name))
                ? getAllFieldsTouched(getField(schema, name))
                : true,
              isList(schema),
            )

      setTouched(() => nextTouched)
      return getValidationResult(schema, values, nextTouched, combinedErrors, validate)
    },
    [schema, touched, values, setTouched, combinedErrors, validate],
  )

  const reset = useCallback(
    (nextValues?: any) => {
      const nextDefaultValues =
        nextValues !== undefined ? getInitialValues(schema, nextValues) : defaultValues

      if (!isNestedFormValues) {
        rootDefaultValues.current = nextDefaultValues
        setSubmitState(() => initialSubmitState)
      }

      setValues(() => nextDefaultValues ?? getInitialValues(schema))
      setTouched(() => getInitialTouched(schema, validateOnInit))
      setVisited(() => getInitialVisited(schema))
      setErrors(() => ({}))
    },
    [
      schema,
      defaultValues,
      isNestedFormValues,
      setSubmitState,
      setValues,
      setTouched,
      setVisited,
      setErrors,
      validateOnInit,
    ],
  )

  const getFieldState = useCallback(
    (name: PropertyKey): FieldState => {
      const field = getField(schema, name)
      const fieldResult = validationResult?.[1]?.[name]
      const isInvalid = fieldResult?.[0] === false
      const fieldTouched = (touched as any)?.[name]

      return {
        value: (values as any)?.[name],
        error: isInvalid ? fieldResult[isNestedForm(field) ? 2 : 1] : undefined,
        invalid: isInvalid,
        touched: isNestedForm(field) ? isAnyTouched(fieldTouched) : Boolean(fieldTouched),
        visited: isNestedForm(field)
          ? isAnyTouched((visited as any)?.[name])
          : Boolean((visited as any)?.[name]),
        dirty: getDirtyState(field, (defaultValues as any)?.[name], (values as any)?.[name])[0],
      }
    },
    [validationResult, touched, visited, values, schema, defaultValues],
  )

  return {
    schema,
    onFieldBlur,
    onFieldFocus,
    values,
    touched,
    visited,
    validationResult,
    isValidating,
    defaultValues,
    isDirty,
    dirty,
    errors,
    submitState,
    mode,
    shouldFocusError,
    fieldRegistry,
    path,
    isNested: Boolean(isNestedFormValues),
    onChange,
    onSubmit,
    onFieldTouchedChange,
    onFieldVisitedChange,
    // For lower level controlling, like performing state changes from inside the form
    // or performing batched updates without firing events.
    setValues,
    setTouched,
    setVisited,
    setErrors,
    setSubmitState,
    setFieldValue,
    clearErrors,
    trigger,
    reset,
    getFieldState,
  }
}

export default useController
