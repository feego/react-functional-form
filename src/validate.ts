import { getEntries, getFields, isField, isList, isNestedForm } from './schemaUtils'
import { isPromise } from './promise'
import { getChildTouched, isAnyTouched } from './utils'
import type {
  FieldSchema,
  FieldValidationResult,
  MaybePromise,
  ValidationResult,
  Validator,
  ValidatorMetadata,
} from './types'

export const Errors = {
  Required: 'Required',
  InvalidType: 'InvalidType',
  FailedRegex: 'FailedRegex',
  Unexpected: 'Unexpected',
  TooShort: 'TooShort',
  TooLong: 'TooLong',
  TooSmall: 'TooSmall',
  TooBig: 'TooBig',
  Mismatch: 'Mismatch',
} as const

const typeCheckers: Record<string, (value: any) => boolean> = {
  number: (value: any) => Boolean(parseInt(value, 10)),
}

const identity: FieldValidationResult<any> = [true]

/**
 * Validator that doesn't fail: returns the previous result so earlier errors in the chain are kept.
 * Use it as the "valid" branch of custom validators.
 */
export const identityValidator = <R = FieldValidationResult<any>>(result: R = identity as R): R =>
  result

/**
 * Fails with `Errors.Required` for falsy values (`undefined`, `null`, `''`, `0`, `false`).
 */
export const requiredValidator = (result: FieldValidationResult<any>, value: unknown) =>
  !value ? ([false, Errors.Required] as FieldValidationResult<any>) : identityValidator(result)

export const createTypeValidator =
  (type: string) =>
  (result: FieldValidationResult<any>, value: unknown): FieldValidationResult<any> => {
    const typeChecker = typeCheckers[type]

    return typeChecker !== undefined && !typeChecker(value)
      ? [false, Errors.InvalidType]
      : identityValidator(result)
  }

/**
 * Fails when the value doesn't match `regex`. Wrap it with `optional` to allow empty values.
 */
export const createRegexValidator =
  <E = typeof Errors.FailedRegex>(regex: RegExp, error: E = Errors.FailedRegex as E) =>
  (result: FieldValidationResult<any>, value: unknown): FieldValidationResult<any> =>
    !regex.test(value as string) ? [false, error] : identityValidator(result)

/* -------------------------------------------------------------------------------------------------
 * Built-in validators
 * -----------------------------------------------------------------------------------------------*/

/** Whether a value is considered empty: `undefined`, `null` or `''`. */
export const isEmptyValue = (value: unknown) =>
  value === undefined || value === null || value === ''

/**
 * Wraps a validator so it's skipped for empty values (`undefined`, `null`, `''`).
 *
 * @example
 * createField([optional(createRegexValidator(/^\d+$/))])
 */
export const optional =
  <V, E>(validator: Validator<V, E>): Validator<V, E> =>
  (result, value, field, metadata) =>
    isEmptyValue(value) ? identityValidator(result) : validator(result, value, field, metadata)

/**
 * Creates a validator from a simple function that returns an error (anything other than `undefined`,
 * `null`, `false` or `true`) when the value is invalid. The function may be async.
 *
 * @example
 * const isEven = createValidator((value: number) => (value % 2 ? 'Must be even' : undefined))
 * const isAvailable = createValidator(async (username: string) =>
 *   (await api.isTaken(username)) ? 'Username taken' : undefined,
 * )
 */
export const createValidator =
  <V = any, E = any>(
    check: (value: V, metadata: ValidatorMetadata) => MaybePromise<E | undefined | null | boolean>,
  ): Validator<V, E> =>
  (result, value, _field, metadata) => {
    const toResult = (error: E | undefined | null | boolean): FieldValidationResult<E> =>
      error === undefined || error === null || error === false || error === true
        ? identityValidator(result)
        : [false, error]
    const error = check(value, metadata)

    return isPromise<E | undefined | null | boolean>(error) ? error.then(toResult) : toResult(error)
  }

const lengthOf = (value: any): number | undefined =>
  typeof value === 'string' || Array.isArray(value) ? value.length : undefined

/**
 * Fails when a string or array is shorter than `min`. Empty values are skipped.
 */
export const createMinLengthValidator = <E = typeof Errors.TooShort>(
  min: number,
  error: E = Errors.TooShort as E,
) =>
  createValidator<unknown, E>(
    (value) => !isEmptyValue(value) && (lengthOf(value) ?? min) < min && error,
  )

/**
 * Fails when a string or array is longer than `max`. Empty values are skipped.
 */
export const createMaxLengthValidator = <E = typeof Errors.TooLong>(
  max: number,
  error: E = Errors.TooLong as E,
) =>
  createValidator<unknown, E>(
    (value) => !isEmptyValue(value) && (lengthOf(value) ?? max) > max && error,
  )

const toNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value))

/**
 * Fails when a number (or numeric string) is lower than `min`. Empty values are skipped.
 */
export const createMinValidator = <E = typeof Errors.TooSmall>(
  min: number,
  error: E = Errors.TooSmall as E,
) => createValidator<unknown, E>((value) => !isEmptyValue(value) && toNumber(value) < min && error)

/**
 * Fails when a number (or numeric string) is greater than `max`. Empty values are skipped.
 */
export const createMaxValidator = <E = typeof Errors.TooBig>(
  max: number,
  error: E = Errors.TooBig as E,
) => createValidator<unknown, E>((value) => !isEmptyValue(value) && toNumber(value) > max && error)

/**
 * Fails when the value differs from the value of a sibling field (e.g. password confirmation).
 */
export const createMatchesFieldValidator = <E = typeof Errors.Mismatch>(
  fieldName: PropertyKey,
  error: E = Errors.Mismatch as E,
) =>
  createValidator<unknown, E>(
    (value, { values }) => value !== (values as any)?.[fieldName as any] && error,
  )

/* -------------------------------------------------------------------------------------------------
 * Validation
 * -----------------------------------------------------------------------------------------------*/

const runChain = (
  validators: ReadonlyArray<Validator>,
  value: unknown,
  field: any,
  metadata: any,
): MaybePromise<FieldValidationResult> =>
  validators.reduce<MaybePromise<FieldValidationResult>>(
    (result, validator) =>
      isPromise<FieldValidationResult>(result)
        ? result.then((resolved) => validator(resolved, value, field, metadata))
        : validator(result, value, field, metadata),
    identity,
  )

/**
 * Validates a field value by running its validators in order.
 *
 * @param field - Field schema.
 * @param value - Field value.
 * @param metadata - Configurations and metadata for validations (validators and other fields data).
 * @returns `[true]` or `[false, error]`, or a promise of it when a validator is async.
 */
export const validateField = (
  field: FieldSchema | any,
  value: unknown,
  metadata: ValidatorMetadata | any,
): MaybePromise<FieldValidationResult> => {
  const { validators = [identityValidator] } = field

  return runChain(validators, value, field, metadata)
}

/**
 * Validates a schema (form or list) against its values. Only touched fields are validated; untouched ones
 * are considered valid.
 *
 * Returns synchronously unless a validator is async, in which case a promise of the result is returned.
 *
 * To think about: we could add an additional argument that would carry the root form values and feed them to
 * all the nested forms' validations. Didn't add it yet, because that would make the nested forms less modular,
 * as they'd then have to be aware of implementation details of the outer form. The current solution for this
 * use case now would be to map the form schema fields adding them the additional context specific validations
 * on each context.
 */
export default function validate(
  schema: any,
  values: any = {},
  touched: any = {},
): MaybePromise<ValidationResult> {
  const nodeValues = isList(schema) ? (Array.isArray(values) ? values : []) : (values ?? {})
  const entries = getEntries(schema, nodeValues)
  const fields = isList(schema) ? entries : getFields(schema)
  const childResults = entries.map(([fieldName, field]) => {
    const fieldTouched = getChildTouched(touched, fieldName)
    const fieldValue = (nodeValues as any)[fieldName as any]

    // We only validate touched fields.
    return isNestedForm(field)
      ? validate(field, fieldValue, fieldTouched)
      : fieldTouched
        ? validateField(field, fieldValue, { fieldName, fields, values: nodeValues })
        : identity
  })
  const listResult =
    isList(schema) && schema.validators.length > 0 && isAnyTouched(touched)
      ? runChain(schema.validators, nodeValues, schema, {
          fieldName: undefined,
          fields,
          values: nodeValues,
        })
      : undefined
  const build = (
    results: any[],
    ownResult: FieldValidationResult | undefined,
  ): ValidationResult => {
    const children = isList(schema) ? results : {}

    if (!isList(schema)) {
      entries.forEach(([fieldName], index) => {
        ;(children as any)[fieldName] = results[index]
      })
    }

    const isValid = results.every((result) => result[0]) && (ownResult?.[0] ?? true)

    return ownResult && !ownResult[0] ? [isValid, children, ownResult[1]] : [isValid, children]
  }

  return childResults.some(isPromise) || isPromise(listResult)
    ? Promise.all([Promise.all(childResults), listResult]).then(([results, ownResult]) =>
        build(results, ownResult),
      )
    : build(childResults, listResult as FieldValidationResult | undefined)
}

/**
 * Validation result with every descendant valid, used as a placeholder while async validation runs for the
 * first time.
 */
export const getValidResult = (schema: any, values: any): ValidationResult => {
  if (isField(schema)) return [true] as any
  const nodeValues = isList(schema) ? (Array.isArray(values) ? values : []) : (values ?? {})
  const entries = getEntries(schema, nodeValues)
  const results = entries.map(([name, field]) =>
    isField(field) ? identity : getValidResult(field, (nodeValues as any)[name as any]),
  )

  return [
    true,
    isList(schema)
      ? results
      : Object.fromEntries(entries.map(([name], index) => [name, results[index]])),
  ]
}
