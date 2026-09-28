import type { FIELD_TYPE, FORM_TYPE, LIST_TYPE } from './schemaUtils'

export type MaybePromise<T> = T | Promise<T>

type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Whether a schema type is untyped (`any`) or too wide to infer anything from (e.g. `SchemaNode`), in which
 * case derived types fall back to `any` like in untyped JavaScript usage.
 */
type IsLooseSchema<S> = IsAny<S> extends true ? true : [SchemaNode] extends [S] ? true : false

/* -------------------------------------------------------------------------------------------------
 * Validation results
 * -----------------------------------------------------------------------------------------------*/

/**
 * Result of validating a single field: `[true]` when valid, `[false, error]` when invalid.
 */
export type FieldValidationResult<E = any> = [true] | [false, E]

/**
 * Result of validating a form or a list: whether every (touched) descendant is valid, the results of each
 * child, and optionally an error that belongs to the form/list itself (for example a list-level validator
 * or a schema refinement without a path).
 */
export type NodeValidationResult<Children = any, E = any> =
  [boolean, Children] | [boolean, Children, E | undefined]

/**
 * Loose validation result type accepted and returned by the low-level validation utilities.
 */
export type ValidationResult = [boolean, any?, any?]

/* -------------------------------------------------------------------------------------------------
 * Validators
 * -----------------------------------------------------------------------------------------------*/

export interface ValidatorMetadata<Values = any> {
  /** Name of the field being validated, inside its parent form (or its index inside a list). */
  fieldName: PropertyKey
  /** Sibling field entries of the parent form. */
  fields: ReadonlyArray<FieldEntry>
  /** Values of the parent form (the field value and its siblings). */
  values: Values
}

/**
 * A validator receives the result of the previous validator in the chain and returns the next result.
 * Validators that don't fail should return the previous result (see `identityValidator`) so earlier errors
 * are kept. Validators may be async by returning a promise.
 */
export type Validator<V = any, E = any> = (
  result: FieldValidationResult<E>,
  value: V,
  field: FieldSchema<V>,
  metadata: ValidatorMetadata,
) => MaybePromise<FieldValidationResult<E>>

/**
 * Function that validates a whole schema, used as the `validate` option of `useController`.
 */
export type ValidateFunction = (
  schema: any,
  values: any,
  touched: any,
) => MaybePromise<ValidationResult>

/* -------------------------------------------------------------------------------------------------
 * Schema nodes
 * -----------------------------------------------------------------------------------------------*/

export interface FieldSchema<V = any, M = any> {
  readonly '#type': typeof FIELD_TYPE
  readonly validators: ReadonlyArray<Validator<V>>
  readonly metadata: M
  /** Type-only marker carrying the field value type. */
  readonly '#value'?: V
}

export type FieldEntry = readonly [PropertyKey, SchemaNode]

export interface FormSchema<Fields extends ReadonlyArray<FieldEntry> = ReadonlyArray<FieldEntry>> {
  readonly '#type': typeof FORM_TYPE
  readonly '#fieldsByName': Record<PropertyKey, SchemaNode>
  readonly '#fields': Fields
}

export interface ListSchema<Item extends SchemaNode = SchemaNode> {
  readonly '#type': typeof LIST_TYPE
  readonly '#item': Item
  readonly validators: ReadonlyArray<Validator<any[]>>
}

export type SchemaNode = FieldSchema<any> | FormSchema<any> | ListSchema<any>

/** Type-only marker for form entries that may not exist (see `createForm`). */
export interface OptionalNode {
  readonly '#optional': true
}

/* -------------------------------------------------------------------------------------------------
 * Type inference from schemas
 * -----------------------------------------------------------------------------------------------*/

type IsLooseFields<F> =
  IsAny<F> extends true
    ? true
    : F extends ReadonlyArray<infer Entry>
      ? IsAny<Entry> extends true
        ? true
        : FieldEntry extends Entry
          ? true
          : false
      : true

/**
 * Value type described by a schema node.
 *
 * @example
 * const schema = createForm([['name', createField<string>()], ['tags', createList(createField<string>())]])
 * type Values = ValuesOf<typeof schema> // { name: string; tags: string[] }
 */
export type ValuesOf<S> = S extends OptionalNode ? NodeValues<S> | undefined : NodeValues<S>

type NodeValues<S> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FieldSchema<infer V, any>
      ? V
      : S extends FormSchema<infer F>
        ? IsLooseFields<F> extends true
          ? Record<PropertyKey, any>
          : { [E in F[number] as E[0]]: ValuesOf<E[1]> }
        : S extends ListSchema<infer I>
          ? ValuesOf<I>[]
          : any

type MapFields<S, Leaf, ListOf> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FieldSchema<any, any>
      ? Leaf
      : S extends FormSchema<infer F>
        ? IsLooseFields<F> extends true
          ? Record<PropertyKey, any>
          : { [E in F[number] as E[0]]: MapFields<E[1], Leaf, ListOf> }
        : S extends ListSchema<infer I>
          ? ListOf | MapFields<I, Leaf, ListOf>[]
          : any

type PartialMapFields<S, Leaf, ListOf> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FieldSchema<any, any>
      ? Leaf
      : S extends FormSchema<infer F>
        ? IsLooseFields<F> extends true
          ? Record<PropertyKey, any>
          : { [E in F[number] as E[0]]?: PartialMapFields<E[1], Leaf, ListOf> }
        : S extends ListSchema<infer I>
          ? ListOf | PartialMapFields<I, Leaf, ListOf>[]
          : any

/** Touched state tree for a schema. Lists may be `true`, meaning "every item touched" (e.g. after submit). */
export type TouchedOf<S> = PartialMapFields<S, boolean | undefined, boolean>
/** Visited state tree for a schema. */
export type VisitedOf<S> = PartialMapFields<S, boolean | undefined, never>
/** Dirty state tree for a schema. */
export type DirtyOf<S> = MapFields<S, boolean, never>

/** Validation result tree for a schema. */
export type ValidationResultOf<S> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FieldSchema<any, any>
      ? FieldValidationResult
      : S extends FormSchema<infer F>
        ? IsLooseFields<F> extends true
          ? NodeValidationResult<Record<PropertyKey, any>>
          : NodeValidationResult<{ [E in F[number] as E[0]]: ValidationResultOf<E[1]> }>
        : S extends ListSchema<infer I>
          ? NodeValidationResult<ValidationResultOf<I>[]>
          : any

/** Names (keys) of the children of a form, or indexes of a list. */
export type ChildName<S> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FormSchema<infer F>
      ? IsLooseFields<F> extends true
        ? PropertyKey
        : F[number][0]
      : S extends ListSchema<any>
        ? number
        : never

/** Schema node of the child named `K`. */
export type ChildSchema<S, K> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FormSchema<infer F>
      ? IsLooseFields<F> extends true
        ? any
        : Extract<F[number], readonly [K, any]>[1]
      : S extends ListSchema<infer I>
        ? I
        : any

/** Names of the children that are fields (not nested forms or lists). */
export type FieldName<S> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FormSchema<infer F>
      ? IsLooseFields<F> extends true
        ? PropertyKey
        : Extract<F[number], readonly [any, FieldSchema<any, any>]>[0]
      : S extends ListSchema<infer I>
        ? I extends FieldSchema<any, any>
          ? number
          : never
        : never

/** Names of the children that are nested forms or lists. */
export type NestedFormName<S> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FormSchema<infer F>
      ? IsLooseFields<F> extends true
        ? PropertyKey
        : Extract<F[number], readonly [any, FormSchema<any> | ListSchema<any>]>[0]
      : S extends ListSchema<infer I>
        ? I extends FormSchema<any> | ListSchema<any>
          ? number
          : never
        : never

/** Names of the children that are lists. */
export type ListName<S> =
  IsLooseSchema<S> extends true
    ? any
    : S extends FormSchema<infer F>
      ? IsLooseFields<F> extends true
        ? PropertyKey
        : Extract<F[number], readonly [any, ListSchema<any>]>[0]
      : never

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends Date | File | Blob | ((...args: any[]) => any)
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

/* -------------------------------------------------------------------------------------------------
 * Events and state hooks
 * -----------------------------------------------------------------------------------------------*/

export interface EventMetadata<Values = any> {
  /** Name of the field (or nested form) the event originated from, in this form. */
  fieldName: PropertyKey | undefined
  fieldSchema: SchemaNode | undefined
  /** Form values before the change. */
  values: Values
  validationResult: ValidationResult
  /** For events that bubbled up from a nested form, the event metadata of that nested form. */
  nestedFormEvent?: EventMetadata
  /** For change events, the next value of the field. */
  nextValue?: unknown
  /** For field array operations, which operation caused the change. */
  arrayOperation?: ArrayOperation
}

export type ArrayOperation =
  | { type: 'append' | 'prepend'; count: number }
  | { type: 'insert'; index: number; count: number }
  | { type: 'remove'; indexes: number[] }
  | { type: 'move'; from: number; to: number }
  | { type: 'swap'; indexA: number; indexB: number }
  | { type: 'update'; index: number }
  | { type: 'replace' }

export type StateUpdater<T> = (
  reducer: T | ((previous: T) => T),
  eventMetadata?: EventMetadata,
) => void

/**
 * A `[state, setState]` pair (like the one `React.useState` returns). The optional third element flags that
 * the hook belongs to a parent form, which is how nested forms delegate their state to their parent.
 */
export type StateHook<T> =
  IsAny<T> extends true
    ? any
    : readonly [T | undefined, StateUpdater<T>] | readonly [T | undefined, StateUpdater<T>, boolean]

export interface SubmitState {
  /** `true` while the submit handler (or async validation before it) is running. */
  isSubmitting: boolean
  /** `true` after the form was submitted at least once, regardless of the outcome. */
  isSubmitted: boolean
  /** `true` if the last submission passed validation and the submit handler didn't throw/reject. */
  isSubmitSuccessful: boolean
  /** Number of submission attempts. */
  submitCount: number
  /** Error thrown (or rejected) by the last submit handler call. */
  submitError: unknown
}

/**
 * When fields get marked as touched, which is what makes their validation errors visible.
 *
 * - `onBlur` (default): when the field loses focus.
 * - `onChange`: as soon as the field changes (and on blur).
 * - `onSubmit`: only when the form is submitted.
 *
 * After a submission every field is touched, so errors update live as the user fixes them.
 */
export type ValidationMode = 'onBlur' | 'onChange' | 'onSubmit'

/**
 * Tree of manual/additional errors, mirroring the form values shape: a leaf is an error for that field,
 * an object is a nested form.
 */
export type ErrorsTree = Record<PropertyKey, any>
