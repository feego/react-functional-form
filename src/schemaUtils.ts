import { isStandardSchema, type StandardSchemaV1 } from './standardSchema'
import { createStandardSchemaValidator } from './standardSchemaValidators'
import type {
  FieldEntry,
  FieldSchema,
  FormSchema,
  ListSchema,
  SchemaNode,
  Validator,
} from './types'

export const FIELD_TYPE: unique symbol = Symbol('FIELD')
export const FORM_TYPE: unique symbol = Symbol('FORM')
export const LIST_TYPE: unique symbol = Symbol('LIST')

export const isField = (field: any): field is FieldSchema => field?.['#type'] === FIELD_TYPE
export const isForm = (field: any): field is FormSchema => field?.['#type'] === FORM_TYPE
export const isList = (field: any): field is ListSchema => field?.['#type'] === LIST_TYPE
/** Whether the node has children (a form or a list). */
export const isNestedForm = (field: any): field is FormSchema | ListSchema =>
  isForm(field) || isList(field)

/**
 * Creates a field schema.
 *
 * @param validators - Validators to run, in order, or a Standard Schema (Zod, Valibot, ArkType, …) to
 *   validate the value with. The value type is inferred from a Standard Schema, or can be given explicitly:
 *   `createField<string>([requiredValidator])`.
 * @param metadata - Arbitrary data attached to the field (labels, input types, …).
 *
 * @example
 * createField([requiredValidator, createMaxLengthValidator(255)])
 * createField(z.string().email())
 */
export function createField<S extends StandardSchemaV1, M = any>(
  schema: S,
  metadata?: M,
): FieldSchema<StandardSchemaV1.InferInput<S>, M>
export function createField<V = any, M = any>(
  // `NoInfer`: the value type comes from the type argument (or defaults to `any`), never from the
  // validators, whose parameter types are often `unknown`.
  validators?: ReadonlyArray<Validator<NoInfer<V>>>,
  metadata?: M,
): FieldSchema<V, M>
export function createField(validators: any = [], metadata?: any): FieldSchema {
  return {
    '#type': FIELD_TYPE,
    validators: isStandardSchema(validators)
      ? [createStandardSchemaValidator(validators)]
      : validators,
    metadata,
  }
}

/**
 * Creates a form schema from a list of `[name, schemaNode]` entries. Nodes can be fields, nested forms or
 * lists.
 *
 * @example
 * const schema = createForm([
 *   ['email', createField<string>([requiredValidator])],
 *   ['address', createForm([['street', createField<string>()]])],
 * ])
 */
export function createForm<const Fields extends ReadonlyArray<FieldEntry>>(
  fields: Fields,
): FormSchema<Fields>
export function createForm(fields: ReadonlyArray<ReadonlyArray<any>>): FormSchema<any>
export function createForm(fields: any): FormSchema<any> {
  const fieldsByName = fields.reduce(
    (result: any, [name, field]: [any, any]) => ({ ...result, [name]: field }),
    {},
  )

  return {
    '#type': FORM_TYPE,
    '#fieldsByName': fieldsByName,
    '#fields': fields,
  }
}

/**
 * Creates a list schema: an array of items that all share the same schema (a field, a form or another
 * list). Use it with `useFieldArray` to add, remove and reorder items.
 *
 * @param item - Schema of each item.
 * @param validators - Validators for the list as a whole (e.g. a minimum number of items). They receive
 *   the array of item values. The error ends up in the third element of the list validation result.
 *
 * @example
 * createList(createForm([['name', createField([requiredValidator])]]), [createMinLengthValidator(1)])
 */
export const createList = <Item extends SchemaNode>(
  item: Item,
  validators: ReadonlyArray<Validator<any[]>> = [],
): ListSchema<Item> => ({
  '#type': LIST_TYPE,
  '#item': item,
  validators,
})

/**
 * Maps the fields of a form schema into a new form schema.
 */
export const map = (schema: any, mapFunction: (field: any, index: number) => any) =>
  createForm(getFields(schema).map(mapFunction))

/**
 * Returns the schema node of a child: the field/form named `key` in a form, or the item schema of a list.
 */
export const getField = (schema: any, key: any) => {
  if (isList(schema)) {
    return schema['#item']
  }

  const { [key]: field } = schema['#fieldsByName']

  return field
}

/**
 * Returns the `[name, node]` entries of a form schema.
 */
export const getFields = (schema: any): FieldEntry[] => schema['#fields']

/**
 * Returns the `[name, node]` entries of a form, or `[index, itemSchema]` entries for a list given its value.
 */
export const getEntries = (schema: any, values: any): ReadonlyArray<FieldEntry> =>
  isList(schema)
    ? (Array.isArray(values) ? values : []).map((_value, index) => [index, schema['#item']])
    : getFields(schema)
