/**
 * Characterization tests for the 0.1.x API. These pin down the behaviour existing consumers rely on,
 * so every modernization change must keep them green.
 */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useState as useReactState } from 'react'
import {
  createField,
  createForm,
  createRegexValidator,
  createTypeValidator,
  Errors,
  getField,
  getFields,
  getAllFieldsTouched,
  getInitialTouched,
  getInitialValues,
  getInitialVisited,
  getValidationResult,
  identityValidator,
  requiredValidator,
  useController,
  useGetPropsForField,
  useGetPropsForNestedForm,
  useState,
  validate,
  validateField,
} from '../src'

const addressSchema = createForm([
  ['street', createField([requiredValidator])],
  ['zip', createField([createRegexValidator(/^\d{4}$/)])],
])

const schema = createForm([
  ['name', createField([requiredValidator])],
  ['age', createField([createTypeValidator('number')])],
  ['address', addressSchema],
])

describe('schema utils', () => {
  it('creates forms and fields that can be looked up', () => {
    expect(getFields(schema).map(([name]: any) => name)).toEqual(['name', 'age', 'address'])
    expect(getField(schema, 'address')).toBe(addressSchema)
    expect(getField(schema, 'name').validators).toEqual([requiredValidator])
  })

  it('keeps field metadata', () => {
    expect(createField([], { label: 'Name' }).metadata).toEqual({ label: 'Name' })
  })
})

describe('initial state', () => {
  it('shapes values after the schema', () => {
    expect(getInitialValues(schema, { name: 'Ann', extra: 1, address: { zip: '1234' } })).toEqual({
      name: 'Ann',
      age: undefined,
      address: { street: undefined, zip: '1234' },
    })
  })

  it('builds touched and visited trees', () => {
    expect(getInitialTouched(schema, false)).toEqual({
      name: false,
      age: false,
      address: { street: false, zip: false },
    })
    expect(getInitialTouched(schema, true).address.zip).toBe(true)
    expect(getInitialVisited(schema).address.street).toBe(false)
    expect(getAllFieldsTouched(schema).address.street).toBe(true)
  })
})

describe('validate', () => {
  it('only validates touched fields', () => {
    expect(validate(schema, {}, {})).toEqual([
      true,
      { name: [true], age: [true], address: [true, { street: [true], zip: [true] }] },
    ])
    expect(validate(schema, {}, getAllFieldsTouched(schema))).toEqual([
      false,
      {
        name: [false, Errors.Required],
        age: [false, Errors.InvalidType],
        address: [false, { street: [false, Errors.Required], zip: [false, Errors.FailedRegex] }],
      },
    ])
  })

  it('lets the last failing validator win and passes previous results along', () => {
    const optionalEmail = (result: any, value: any) =>
      value && !value.includes('@') ? [false, 'InvalidEmail'] : identityValidator(result)
    const field = createField([optionalEmail, requiredValidator])

    expect(validateField(field, '', {})).toEqual([false, Errors.Required])
    expect(validateField(field, 'nope', {})).toEqual([false, 'InvalidEmail'])
    expect(validateField(field, 'a@b', {})).toEqual([true])
  })

  it('gives validators the field and sibling values', () => {
    const spy = vi.fn((result: any) => identityValidator(result))
    const form = createForm([
      ['password', createField([])],
      ['confirm', createField([spy])],
    ])

    validate(form, { password: 'a', confirm: 'b' }, { confirm: true })

    expect(spy).toHaveBeenCalledWith([true], 'b', getField(form, 'confirm'), {
      fieldName: 'confirm',
      fields: getFields(form),
      values: { password: 'a', confirm: 'b' },
    })
  })

  it('merges additional errors, including nested and array shaped ones', () => {
    expect(
      getValidationResult(schema, {}, {}, { name: 'Taken', address: { zip: ['Bad zip'] } }),
    ).toEqual([
      false,
      {
        name: [false, 'Taken'],
        age: [true],
        address: [false, { street: [true], zip: [false, { 0: [false, 'Bad zip'] }] }],
      },
    ])
  })
})

const TextInput = ({ label, ...props }: any) => (
  <label>
    {label}
    <input
      aria-label={label}
      value={props.value ?? ''}
      onChange={(event) => props.onChange(event.target.value)}
      onBlur={props.onBlur}
      onFocus={props.onFocus}
    />
    {props.error && <span role="alert">{`${label}: ${props.error}`}</span>}
  </label>
)

const AddressForm = ({ propsForForm }: any) => {
  const controller = useController(propsForForm)
  const getPropsForField = useGetPropsForField(controller)

  return (
    <>
      <TextInput label="Street" {...getPropsForField('street')} />
      <TextInput label="Zip" {...getPropsForField('zip')} />
    </>
  )
}

const Form = (props: any) => {
  const controller = useController({ schema, ...props })
  const getPropsForField = useGetPropsForField(controller)
  const getPropsForNestedForm = useGetPropsForNestedForm(controller)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        props.onResult?.(controller.onSubmit('extra'))
      }}
    >
      <TextInput label="Name" {...getPropsForField('name')} />
      <AddressForm propsForForm={getPropsForNestedForm('address')} />
      <button type="submit">Submit</button>
      <output data-testid="values">{JSON.stringify(controller.values)}</output>
      <output data-testid="touched">{JSON.stringify(controller.touched)}</output>
      <output data-testid="visited">{JSON.stringify(controller.visited)}</output>
    </form>
  )
}

const json = (testId: string) => JSON.parse(screen.getByTestId(testId).textContent!)

describe('useController', () => {
  it('tracks values, visited and touched state and only shows errors after blur', () => {
    render(<Form />)
    const name = screen.getByLabelText('Name')

    fireEvent.focus(name)
    expect(json('visited').name).toBe(true)

    fireEvent.change(name, { target: { value: 'x' } })
    fireEvent.change(name, { target: { value: '' } })
    expect(screen.queryByRole('alert')).toBeNull()

    fireEvent.blur(name)
    expect(json('touched').name).toBe(true)
    expect(screen.getByRole('alert').textContent).toBe('Name: Required')
  })

  it('bubbles nested form events with the nested event metadata', () => {
    const onChange = vi.fn()
    const onFieldTouch = vi.fn()
    render(<Form onChange={onChange} onFieldTouch={onFieldTouch} />)

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: 'Main St' } })
    fireEvent.blur(screen.getByLabelText('Street'))

    expect(json('values').address.street).toBe('Main St')
    expect(json('touched').address.street).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toMatchObject({
      fieldName: 'address',
      nestedFormEvent: { fieldName: 'street', nextValue: 'Main St' },
    })
    expect(onFieldTouch.mock.calls[0][0]).toMatchObject({
      fieldName: 'address',
      nestedFormEvent: { fieldName: 'street' },
    })
  })

  it('touches every field on submit and only submits valid values', () => {
    const onSubmit = vi.fn()
    const onResult = vi.fn()
    render(<Form onSubmit={onSubmit} onResult={onResult} initialValues={{ age: '30' }} />)

    fireEvent.click(screen.getByText('Submit'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onResult.mock.calls[0][0][0]).toBe(false)
    expect(screen.getAllByRole('alert').map((node) => node.textContent)).toEqual([
      'Name: Required',
      'Street: Required',
      'Zip: FailedRegex',
    ])

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ann' } })
    fireEvent.change(screen.getByLabelText('Street'), { target: { value: 'Main St' } })
    fireEvent.change(screen.getByLabelText('Zip'), { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Submit'))

    expect(onSubmit).toHaveBeenCalledWith(
      { name: 'Ann', age: '30', address: { street: 'Main St', zip: '1234' } },
      'extra',
    )
    expect(onResult.mock.calls[1][0][0]).toBe(true)
  })

  it('supports initial values, validateOnInit and additional errors', () => {
    render(
      <Form initialValues={{ name: 'Ann' }} validateOnInit additionalErrors={{ name: 'Taken' }} />,
    )

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ann')
    expect(screen.getAllByRole('alert').map((node) => node.textContent)).toEqual([
      'Name: Taken',
      'Street: Required',
      'Zip: FailedRegex',
    ])
  })

  it('supports a custom validate function', () => {
    const customValidate = vi.fn((): any => [false, { name: [false, 'Custom'] }])
    const { result } = renderHook(() => useController({ schema, validate: customValidate }))

    expect(result.current.validationResult).toEqual([false, { name: [false, 'Custom'] }])
    act(() => {
      result.current.onSubmit()
    })
    expect(customValidate).toHaveBeenLastCalledWith(
      schema,
      result.current.values,
      getAllFieldsTouched(schema),
    )
  })

  it('accepts lifted state through useState', () => {
    const Lifted = () => {
      const formState = useState({ schema, initialValues: { name: 'Lifted' } })
      const controller = useController({ ...formState, schema })

      return <output data-testid="values">{JSON.stringify(controller.values)}</output>
    }
    render(<Lifted />)

    expect(json('values').name).toBe('Lifted')
  })

  it('accepts externally owned state hooks that receive plain values', () => {
    const Owned = () => {
      const valuesStateHook = useReactState<any>({ name: 'Owned' })
      const controller = useController({ schema, valuesStateHook })

      return (
        <>
          <button onClick={() => controller.setTouched({ name: true })}>Touch</button>
          <output data-testid="touched">{JSON.stringify(controller.touched)}</output>
          <output data-testid="values">{JSON.stringify(controller.values)}</output>
        </>
      )
    }
    render(<Owned />)
    fireEvent.click(screen.getByText('Touch'))

    expect(json('values').name).toBe('Owned')
    expect(json('touched')).toEqual({ name: true })
  })

  it('maps errors through mapError', () => {
    const { result } = renderHook(() => {
      const controller = useController({ schema, validateOnInit: true })
      return useGetPropsForField(controller, (error: any) => `mapped:${error}`)
    })

    expect(result.current('name').error).toBe('mapped:Required')
  })
})
