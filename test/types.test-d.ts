import { useState as useReactState } from 'react'
import { z } from 'zod'
import {
  createField,
  createForm,
  createList,
  requiredValidator,
  useController,
  useFieldArray,
  useGetPropsForField,
  useGetPropsForNestedForm,
  useState,
  type Controller,
  type ValuesOf,
} from '../src'

const schema = createForm([
  ['email', createField(z.string().email())],
  ['age', createField<number>([requiredValidator])],
  ['address', createForm([['city', createField<string>()]])],
  ['tags', createList(createField<string>())],
  ['members', createList(createForm([['name', createField<string>()]]))],
])

describe('schema inference', () => {
  it('infers values from typed fields and Standard Schemas', () => {
    expectTypeOf<ValuesOf<typeof schema>>().toEqualTypeOf<{
      email: string
      age: number
      address: { city: string }
      tags: string[]
      members: { name: string }[]
    }>()
  })

  it('types the controller, field props and nested forms', () => {
    const controller = useController({ schema, initialValues: { address: { city: 'Lisbon' } } })
    expectTypeOf(controller.values.age).toEqualTypeOf<number>()
    expectTypeOf(controller.touched.address).toEqualTypeOf<
      { city?: boolean | undefined } | undefined
    >()

    const getPropsForField = useGetPropsForField(controller)
    expectTypeOf(getPropsForField('email').value).toEqualTypeOf<string | undefined>()
    expectTypeOf(getPropsForField('email').name).toEqualTypeOf<'email'>()
    // @ts-expect-error nested forms aren't fields
    getPropsForField('address')
    // @ts-expect-error unknown field
    getPropsForField('nope')

    const getPropsForNestedForm = useGetPropsForNestedForm(controller)
    const address = useController(getPropsForNestedForm('address'))
    expectTypeOf(address.values).toEqualTypeOf<{ city: string }>()
    // @ts-expect-error fields aren't nested forms
    getPropsForNestedForm('email')

    const members = useController(getPropsForNestedForm('members'))
    const fieldArray = useFieldArray(members)
    expectTypeOf(fieldArray.append)
      .parameter(0)
      .toEqualTypeOf<{ name: string } | { name: string }[]>()
    expectTypeOf(useGetPropsForNestedForm(members)).parameter(0).toEqualTypeOf<number>()

    controller.setFieldValue('age', 3)
    // @ts-expect-error wrong value type
    controller.setFieldValue('age', 'three')
  })

  it('rejects initial values that do not match the schema', () => {
    // @ts-expect-error age is a number
    useController({ schema, initialValues: { age: 'old' } })
  })
})

describe('untyped (0.1.x style) usage', () => {
  it('falls back to any for loosely typed schemas and props', () => {
    const commonFields = [['title', createField([requiredValidator])]]
    const looseSchema = createForm([
      ...commonFields,
      ['settings', createForm([['required', createField()]])],
    ])
    const formState = useState({ schema: looseSchema })
    const propsForForm = useController({ ...formState, schema: looseSchema })

    expectTypeOf(propsForForm.values).toEqualTypeOf<Record<PropertyKey, any>>()
    propsForForm.touched.whatever
    propsForForm.setTouched({})
    propsForForm.onSubmit({ exitEditMode: true })

    const anyProps: any = {}
    const nested = useController(anyProps)
    nested.touched.anything.deep
    nested.values['0']?.type
    useGetPropsForNestedForm(nested)(0).valuesStateHook![0]._internalId

    const [values, setValues] = useReactState<any>({})
    const hookFromMemo = [values, setValues] as any[]
    useController({ schema: looseSchema, valuesStateHook: hookFromMemo as any })
  })

  it('accepts controllers typed as any in components', () => {
    const Component = ({ propsForForm }: { propsForForm: any }) => {
      const controller: Controller = useController(propsForForm)
      return useGetPropsForField(controller)('anything').value
    }
    expectTypeOf(Component).toBeFunction()
  })
})
