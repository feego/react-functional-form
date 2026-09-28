import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import {
  createField,
  createForm,
  createList,
  createMinLengthValidator,
  getFields,
  requiredValidator,
  useController,
  useFieldArray,
  useFormState,
  useGetPropsForField,
  useGetPropsForInput,
  useGetPropsForNestedForm,
  useState,
} from '../src'

describe('createForm object syntax', () => {
  it('keeps key order and leaves out undefined nodes', () => {
    const schema = createForm({
      name: createField([requiredValidator]),
      phone: undefined,
      address: createForm({ city: createField() }),
    })

    expect(getFields(schema).map(([name]) => name)).toEqual(['name', 'address'])
    const { result } = renderHook(() => useController({ schema, validateOnInit: true }))
    expect(result.current.validationResult).toEqual([
      false,
      { name: [false, 'Required'], address: [true, { city: [true] }] },
    ])
  })
})

describe('onSubmit and trigger', () => {
  const schema = createForm({ name: createField<string>([requiredValidator]) })

  it('always return promises, doing the work synchronously when possible', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() =>
      useController({ schema, onSubmit, initialValues: { name: 'Ann' } }),
    )

    let submission: any
    act(() => {
      submission = result.current.onSubmit()
    })
    expect(submission).toBeInstanceOf(Promise)
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ann' })
    await expect(submission).resolves.toEqual([true, { name: [true] }])

    let triggered: any
    act(() => {
      triggered = result.current.trigger()
    })
    await expect(triggered).resolves.toEqual([true, { name: [true] }])
  })

  it('rejects when a sync submit handler throws', async () => {
    const error = new Error('Nope')
    const { result } = renderHook(() =>
      useController({
        schema,
        initialValues: { name: 'Ann' },
        onSubmit: () => {
          throw error
        },
      }),
    )

    await act(async () => {
      await expect(result.current.onSubmit()).rejects.toBe(error)
    })
    expect(result.current.submitState.submitError).toBe(error)
  })
})

describe('mapError', () => {
  const schema = createForm({
    name: createField<string>([requiredValidator]),
    address: createForm({ city: createField<string>([requiredValidator]) }),
    tags: createList(createField<string>(), [createMinLengthValidator(1, 'Empty')]),
  })
  const messages: Record<string, string> = { Required: 'This is required', Empty: 'Add a tag' }

  it('maps errors of fields, nested forms, field state and own errors', () => {
    const { result } = renderHook(() => {
      const form = useController({
        schema,
        validateOnInit: true,
        mapError: (code: string) => messages[code],
      })
      const getPropsForNestedForm = useGetPropsForNestedForm(form)
      const address = useController(getPropsForNestedForm('address'))
      const tags = useController(getPropsForNestedForm('tags'))
      return {
        form,
        tags,
        getPropsForField: useGetPropsForField(form),
        getPropsForAddressField: useGetPropsForField(address),
      }
    })

    expect(result.current.getPropsForField('name').error).toBe('This is required')
    expect(result.current.getPropsForAddressField('city').error).toBe('This is required')
    expect(result.current.form.getFieldState('name').error).toBe('This is required')
    expect(result.current.form.getFieldState('tags').error).toBe('Add a tag')
    expect(result.current.tags.error).toBe('Add a tag')
  })

  it('is overridden by the useGetPropsForField argument and only called for errors', () => {
    const mapError = vi.fn((code: string) => `!${code}`)
    const { result } = renderHook(() => {
      const form = useController({ schema, mapError: () => 'controller' })
      return useGetPropsForField(form, mapError)
    })

    expect(result.current('name').error).toBeUndefined()
    expect(mapError).not.toHaveBeenCalled()
    act(() => result.current('name').onBlur())
    expect(result.current('name').error).toBe('!Required')
  })
})

describe('useFieldArray getPropsForItem', () => {
  it('returns nested form props for lists of forms and field props for lists of fields', () => {
    const schema = createForm({
      members: createList(createForm({ name: createField<string>([requiredValidator]) })),
      tags: createList(createField<string>()),
    })
    const { result } = renderHook(() => {
      const form = useController({
        schema,
        initialValues: { members: [{ name: 'Ann' }], tags: ['a'] },
      })
      const getPropsForNestedForm = useGetPropsForNestedForm(form)
      const members = useFieldArray(useController(getPropsForNestedForm('members')))
      const tags = useFieldArray(useController(getPropsForNestedForm('tags')))
      const firstMember = useController(members.getPropsForItem(0))
      return { form, firstMember, tags }
    })

    expect(result.current.firstMember.values).toEqual({ name: 'Ann' })
    expect(result.current.tags.getPropsForItem(0).value).toBe('a')

    act(() => result.current.tags.getPropsForItem(0).onChange('b'))
    expect(result.current.form.values.tags).toEqual(['b'])
  })
})

describe('useGetPropsForInput', () => {
  const schema = createForm({
    name: createField<string>([requiredValidator]),
    newsletter: createField<boolean>(),
    plan: createField<string>(),
  })

  it('builds props for native elements', () => {
    const Form = () => {
      const form = useController({ schema })
      const getPropsForInput = useGetPropsForInput(form)
      return (
        <>
          <input aria-label="Name" {...getPropsForInput('name')} />
          <input
            aria-label="Newsletter"
            {...getPropsForInput('newsletter', { type: 'checkbox' })}
          />
          <input
            aria-label="Free"
            {...getPropsForInput('plan', { type: 'radio', value: 'free' })}
          />
          <input aria-label="Pro" {...getPropsForInput('plan', { type: 'radio', value: 'pro' })} />
          <output data-testid="values">{JSON.stringify(form.values)}</output>
        </>
      )
    }
    render(<Form />)
    const name = screen.getByLabelText('Name') as HTMLInputElement

    expect(name.value).toBe('')
    expect(name.getAttribute('aria-invalid')).toBeNull()
    fireEvent.blur(name)
    expect(name.getAttribute('aria-invalid')).toBe('true')

    fireEvent.change(name, { target: { value: 'Ann' } })
    fireEvent.click(screen.getByLabelText('Newsletter'))
    fireEvent.click(screen.getByLabelText('Pro'))

    expect(JSON.parse(screen.getByTestId('values').textContent!)).toEqual({
      name: 'Ann',
      newsletter: true,
      plan: 'pro',
    })
    expect((screen.getByLabelText('Pro') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Free') as HTMLInputElement).checked).toBe(false)
  })
})

describe('useFormState', () => {
  it('is also exported under its old name', () => {
    expect(useState).toBe(useFormState)
  })
})
