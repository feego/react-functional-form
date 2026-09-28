/**
 * Type tests backing the rules documented in docs/src/content/docs/guides/typescript.md. If one of these
 * changes, update the docs.
 */
import { z } from 'zod'
import {
  createField,
  createForm,
  createList,
  createValidator,
  requiredValidator,
  useController,
  useFieldArray,
  useGetPropsForField,
  useGetPropsForNestedForm,
  type Controller,
  type ControllerProps,
  type ValidationResultOf,
  type ValuesOf,
} from '../src'

describe('field value types', () => {
  it('are any without a type argument', () => {
    const schema = createForm([['name', createField([requiredValidator])]])
    expectTypeOf<ValuesOf<typeof schema>>().toEqualTypeOf<{ name: any }>()
  })

  it('come from the type argument', () => {
    const schema = createForm([['name', createField<string>([requiredValidator])]])
    expectTypeOf<ValuesOf<typeof schema>>().toEqualTypeOf<{ name: string }>()
  })

  it('come from the input type of Standard Schemas', () => {
    const schema = createForm([
      ['email', createField(z.string().email())],
      ['count', createField(z.string().transform((value) => value.length))],
      ['age', createField(z.coerce.number())],
    ])
    expectTypeOf<ValuesOf<typeof schema>>().toEqualTypeOf<{
      email: string
      count: string // input type, not the transformed output
      age: unknown // z.coerce accepts anything as input
    }>()
  })

  it('check validators against the field type', () => {
    const isEven = createValidator((value: number) => (value % 2 ? 'Odd' : undefined))
    createField<number>([requiredValidator, isEven])
    // @ts-expect-error a number validator on a string field
    createField<string>([isEven])
  })
})

describe('form value types', () => {
  it('are inferred from inline entries, nested forms and lists', () => {
    const schema = createForm([
      ['address', createForm([['city', createField<string>()]])],
      ['tags', createList(createField<string>())],
    ])
    expectTypeOf<ValuesOf<typeof schema>>().toEqualTypeOf<{
      address: { city: string }
      tags: string[]
    }>()
  })

  it('are inferred from entries declared separately with as const', () => {
    const entries = [['name', createField<string>()]] as const
    const schema = createForm(entries)
    expectTypeOf<ValuesOf<typeof schema>>().toEqualTypeOf<{ name: string }>()
  })

  it('are loose for entries declared separately without as const', () => {
    const entries = [['name', createField<string>()]]
    const schema = createForm(entries)
    expectTypeOf<ValuesOf<typeof schema>>().toEqualTypeOf<Record<PropertyKey, any>>()
  })

  it('widen conditional entries to an index signature', () => {
    const buildSchema = (usePhone: boolean) =>
      createForm([
        ['name', createField<string>()],
        usePhone ? ['phone', createField<string>()] : ['email', createField<string>()],
      ])
    expectTypeOf<ValuesOf<ReturnType<typeof buildSchema>>>().toEqualTypeOf<{
      [key: string]: string
      name: string
    }>()
  })

  it('include every alternative of conditional entries marked as const', () => {
    const buildSchema = (usePhone: boolean) =>
      createForm([
        ['name', createField<string>()],
        usePhone
          ? (['phone', createField<string | undefined>()] as const)
          : (['email', createField<string | undefined>()] as const),
      ])
    expectTypeOf<ValuesOf<ReturnType<typeof buildSchema>>>().toEqualTypeOf<{
      name: string
      phone: string | undefined
      email: string | undefined
    }>()
  })
})

describe('controller types', () => {
  const addressSchema = createForm([['city', createField<string>()]])
  const schema = createForm([
    ['name', createField<string>([requiredValidator])],
    ['address', addressSchema],
    ['members', createList(createForm([['email', createField<string>()]]))],
  ])

  it('types values, initial values and onSubmit', () => {
    const form = useController({
      schema,
      initialValues: { address: {} }, // deep partial
      onSubmit: (values) => {
        expectTypeOf(values).toEqualTypeOf<ValuesOf<typeof schema>>()
      },
    })
    expectTypeOf(form.values.name).toEqualTypeOf<string>()
    expectTypeOf(form.validationResult).toEqualTypeOf<ValidationResultOf<typeof schema>>()
    expectTypeOf(form.touched.name).toEqualTypeOf<boolean | undefined>()
    expectTypeOf(form.getFieldState('name').value).toEqualTypeOf<string | undefined>()
  })

  it('types field props, including the mapped error', () => {
    const form = useController({ schema })
    const getPropsForField = useGetPropsForField(form, (code: string) => ({ message: code }))
    const props = getPropsForField('name')

    expectTypeOf(props.name).toEqualTypeOf<'name'>()
    expectTypeOf(props.value).toEqualTypeOf<string | undefined>()
    expectTypeOf(props.error).toEqualTypeOf<{ message: string }>()
  })

  it('types nested forms and list items', () => {
    const form = useController({ schema })
    const address = useController(useGetPropsForNestedForm(form)('address'))
    expectTypeOf(address).toEqualTypeOf<Controller<typeof addressSchema>>()

    const members = useController(useGetPropsForNestedForm(form)('members'))
    const member = useController(useGetPropsForNestedForm(members)(0))
    expectTypeOf(member.values).toEqualTypeOf<{ email: string }>()
    expectTypeOf(useFieldArray(members).append)
      .parameter(0)
      .toEqualTypeOf<{ email: string } | { email: string }[]>()
  })

  it('types sub-form component props', () => {
    const AddressForm = (props: { propsForForm: ControllerProps<typeof addressSchema> }) =>
      useController(props.propsForForm).values.city
    expectTypeOf(AddressForm).returns.toEqualTypeOf<string>()
  })
  it('types lists of fields, unknown names and wrong values', () => {
    const form = useController({
      schema: createForm([['tags', createList(createField<string>())]]),
    })
    const tags = useController(useGetPropsForNestedForm(form)('tags'))
    expectTypeOf(useGetPropsForField(tags)(0).value).toEqualTypeOf<string | undefined>()
    useFieldArray(tags).append('new tag')
    // @ts-expect-error wrong item type
    useFieldArray(tags).append(42)
    // @ts-expect-error unknown field
    useController({ schema }).setFieldValue('nope', 1)
    expectTypeOf(useGetPropsForField(useController({ schema }))('name').error).toBeAny()
  })
})

describe('validator typing', () => {
  it('accepts the documented validators', () => {
    const minWords = (count: number) =>
      createValidator((text: string) =>
        text.split(/\s+/).filter(Boolean).length < count ? `At least ${count} words` : undefined,
      )
    const matchesPassword = createValidator((value: string, { values }) =>
      value !== values.password ? 'Passwords must match' : undefined,
    )
    createField<string>([minWords(3), matchesPassword])
  })
})
