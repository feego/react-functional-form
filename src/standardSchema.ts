/**
 * The Standard Schema interface (https://standardschema.dev), copied as the spec recommends so the library
 * has no runtime or type dependency on any schema library. Zod, Valibot, ArkType, Effect Schema and others
 * implement it.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>
    readonly types?: Types<Input, Output> | undefined
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult

  export interface SuccessResult<Output> {
    readonly value: Output
    readonly issues?: undefined
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>
  }

  export interface Issue {
    readonly message: string
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  export interface PathSegment {
    readonly key: PropertyKey
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input
    readonly output: Output
  }

  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['input']

  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['output']
}

export const isStandardSchema = (value: unknown): value is StandardSchemaV1 =>
  value !== null &&
  (typeof value === 'object' || typeof value === 'function') &&
  '~standard' in (value as object)

/**
 * Default issue mapper: the message of the first issue.
 */
export const firstIssueMessage = (issues: ReadonlyArray<StandardSchemaV1.Issue>) =>
  issues[0]?.message

export const getIssuePath = (issue: StandardSchemaV1.Issue): PropertyKey[] =>
  (issue.path ?? []).map((segment) =>
    typeof segment === 'object' && segment !== null ? segment.key : segment,
  )
