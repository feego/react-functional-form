import {
  firstIssueMessage,
  getIssuePath,
  isStandardSchema,
  type StandardSchemaV1,
} from './standardSchema'
import type { FieldValidationResult, ValidateFunction, ValidationResult, Validator } from './types'
import { isPromise } from './promise'
import { getField, isField, isForm, isList } from './schemaUtils'
import { getTouchedAt, isAnyTouched } from './utils'
import validate from './validate'

export type MapIssues<E = any> = (issues: ReadonlyArray<StandardSchemaV1.Issue>) => E

const identity: FieldValidationResult = [true]

/**
 * Creates a field validator from a Standard Schema (Zod, Valibot, ArkType, …). Async schemas produce async
 * validators.
 *
 * @param schema - Schema to validate the field value with.
 * @param mapIssues - Maps the schema issues into the field error. Defaults to the first issue message.
 *
 * @example
 * createField([requiredValidator, createStandardSchemaValidator(z.string().email())])
 */
export const createStandardSchemaValidator = <S extends StandardSchemaV1, E = string>(
  schema: S,
  mapIssues: MapIssues<E> = firstIssueMessage as MapIssues<E>,
): Validator<StandardSchemaV1.InferInput<S>, E> => {
  if (!isStandardSchema(schema)) {
    throw new TypeError('createStandardSchemaValidator expects a Standard Schema.')
  }

  return (result, value) => {
    const toResult = (outcome: StandardSchemaV1.Result<unknown>): FieldValidationResult<E> =>
      outcome.issues ? [false, mapIssues(outcome.issues)] : (result ?? identity)
    const outcome = schema['~standard'].validate(value)

    return isPromise(outcome) ? outcome.then(toResult) : toResult(outcome)
  }
}

export interface StandardSchemaValidateOptions<E = any> {
  /** Maps the issues of each field (or form) into its error. Defaults to the first issue message. */
  mapIssues?: MapIssues<E>
  /**
   * Validate function to run alongside the schema, typically to keep running field-level validators.
   * Defaults to the library `validate`.
   */
  validate?: ValidateFunction
}

/**
 * Creates a `validate` function for `useController` that validates the whole form values with a Standard
 * Schema (Zod, Valibot, ArkType, …). Issues are mapped to fields through their paths; issues without a
 * matching field go to the nearest form/list (third element of its validation result). As usual, only
 * touched fields get errors. Field-level validators keep running too.
 *
 * @example
 * const schema = z.object({ password: z.string().min(8), confirm: z.string() })
 *   .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords must match' })
 *
 * useController({ schema: formSchema, validate: createStandardSchemaValidate(schema) })
 */
export const createStandardSchemaValidate = <E = any>(
  schema: StandardSchemaV1,
  options: StandardSchemaValidateOptions<E> = {},
): ValidateFunction => {
  const { mapIssues = firstIssueMessage as MapIssues<E> } = options

  return (formSchema, values, touched) => {
    const baseValidate = options.validate ?? validate
    const baseResult = baseValidate(formSchema, values, touched)
    const outcome = schema['~standard'].validate(values)
    const combine = (result: ValidationResult, schemaOutcome: StandardSchemaV1.Result<unknown>) =>
      schemaOutcome.issues
        ? applyIssues(formSchema, result, touched, schemaOutcome.issues, mapIssues)
        : result

    return isPromise(baseResult) || isPromise(outcome)
      ? Promise.all([baseResult, outcome]).then(([result, schemaOutcome]) =>
          combine(result, schemaOutcome),
        )
      : combine(baseResult, outcome)
  }
}

const resolveIssueTarget = (schema: any, path: PropertyKey[]) => {
  let node = schema
  const resolved: PropertyKey[] = []

  for (const segment of path) {
    if (isList(node)) {
      const index = Number(segment)
      if (!Number.isInteger(index)) break
      node = node['#item']
      resolved.push(index)
    } else if (isForm(node)) {
      const child = getField(node, segment)
      if (child === undefined) break
      node = child
      resolved.push(segment)
    } else {
      break
    }
  }

  return { path: resolved, node }
}

const setErrorAt = (
  result: any,
  path: PropertyKey[],
  isFieldTarget: boolean,
  error: unknown,
): any => {
  if (path.length === 0) {
    return isFieldTarget ? [false, error] : [false, result?.[1] ?? {}, error]
  }

  const [head, ...rest] = path
  const children = result?.[1] ?? {}
  const nextChildren = Array.isArray(children) ? [...children] : { ...children }
  nextChildren[head as any] = setErrorAt(children[head as any], rest, isFieldTarget, error)

  return result?.length > 2 ? [false, nextChildren, result[2]] : [false, nextChildren]
}

/**
 * Adds Standard Schema issues to a validation result, mapping them to fields through their paths.
 * Only touched fields (and forms/lists with a touched descendant) receive errors.
 */
export const applyIssues = (
  schema: any,
  result: ValidationResult,
  touched: any,
  issues: ReadonlyArray<StandardSchemaV1.Issue>,
  mapIssues: MapIssues,
): ValidationResult => {
  const groups = new Map<
    string,
    { path: PropertyKey[]; node: any; issues: StandardSchemaV1.Issue[] }
  >()

  for (const issue of issues) {
    const target = resolveIssueTarget(schema, getIssuePath(issue))
    const key = JSON.stringify(target.path.map(String))
    const group = groups.get(key) ?? { ...target, issues: [] }
    group.issues.push(issue)
    groups.set(key, group)
  }

  return [...groups.values()].reduce((current, { path, node, issues: nodeIssues }) => {
    const nodeTouched = getTouchedAt(touched, path)
    const isVisible = isField(node) ? Boolean(nodeTouched) : isAnyTouched(nodeTouched)

    return isVisible ? setErrorAt(current, path, isField(node), mapIssues(nodeIssues)) : current
  }, result)
}
